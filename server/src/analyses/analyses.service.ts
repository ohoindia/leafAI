import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { env } from "../config.js";
import { DatabaseService } from "../common/database.service.js";
import { SecurityService } from "../common/security.service.js";
import { StorageService } from "../common/storage.service.js";
import { LeafAnalysisService } from "./leaf-analysis.service.js";
import type { ApiRequest } from "../common/api-request.js";
@Injectable()
export class AnalysesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly security: SecurityService,
    private readonly storage: StorageService,
    private readonly leafAnalysis: LeafAnalysisService,
  ) {}
  async create(req: ApiRequest) {
    const started = Date.now(),
      analysisId = crypto.randomUUID(),
      uploadId = crypto.randomUUID();
    try {
      if (req.body.consent !== "true")
        throw new BadRequestException("Consent is required");
      if (!req.file) throw new BadRequestException("Leaf image is required");
      const meta = await sharp(req.file.buffer, { failOn: "error" }).metadata();
      if (
        !["jpeg", "png", "webp"].includes(meta.format ?? "") ||
        (meta.width ?? 0) < 300 ||
        (meta.height ?? 0) < 300
      )
        throw new BadRequestException(
          "Use a clear JPEG, PNG or WebP image at least 300 x 300",
        );
      const normalized = await sharp(req.file.buffer)
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 88 })
        .toBuffer();
      const safe = `${uploadId}.bin`,
        enc = this.security.encrypt(normalized);
      await this.storage.saveUpload(safe, enc.encrypted);
      await this.db.execute(
        "INSERT INTO leaf_uploads(id,user_id,original_file_name,storage_key,mime_type,size_bytes,sha256_hash,encryption_iv,encryption_tag,consent_to_analyze) VALUES(?,?,?,?,?,?,?,?,?,1)",
        [
          uploadId,
          req.user.sub,
          path.basename(req.file.originalname).slice(0, 255),
          safe,
          "image/jpeg",
          normalized.length,
          this.security.sha256(normalized),
          enc.iv,
          enc.tag,
        ],
      );
      await this.db.execute(
        "INSERT INTO leaf_analyses(id,upload_id,user_id,requested_language,model_name,prompt_version) VALUES(?,?,?,?,?,?)",
        [
          analysisId,
          uploadId,
          req.user.sub,
          ["en", "te", "hi"].includes(req.body.language)
            ? req.body.language
            : "en",
          env.OPENAI_VISION_MODEL,
          "leaf-v1",
        ],
      );
      const result = await this.leafAnalysis.analyzeLeaf(
          normalized,
          "image/jpeg",
        ),
        d = result.data,
        status =
          d.confidence < 0.55 || !d.is_leaf ? "REVIEW_REQUIRED" : "COMPLETED";
      await this.db.execute(
        "UPDATE leaf_analyses SET model_response_id=?,status=?,plant_name=?,disease_name=?,confidence=?,severity=?,analysis_json=?,output_en=?,output_te=?,output_hi=?,processing_ms=?,completed_at=NOW(3) WHERE id=?",
        [
          result.id,
          status,
          d.plant,
          d.condition,
          d.confidence,
          d.severity,
          JSON.stringify(d),
          JSON.stringify(d.translations.en),
          JSON.stringify(d.translations.te),
          JSON.stringify(d.translations.hi),
          Date.now() - started,
          analysisId,
        ],
      );
      await this.db.audit(
        req.user.sub,
        "LEAF_ANALYZED",
        "LEAF_ANALYSIS",
        analysisId,
        req,
        { model: env.OPENAI_VISION_MODEL, status },
      );
      return { id: analysisId, status, ...d };
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      await this.db
        .execute(
          "UPDATE leaf_analyses SET status='FAILED',error_code='ANALYSIS_FAILED',error_message=?,processing_ms=?,completed_at=NOW(3) WHERE id=?",
          [String(e.message).slice(0, 1000), Date.now() - started, analysisId],
        )
        .catch(() => {});
      throw e;
    }
  }
  async list(req: ApiRequest) {
    const [rows] = await this.db.execute(
      "SELECT id,status,plant_name,disease_name,confidence,severity,requested_language,created_at FROM leaf_analyses WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
      [req.user.sub],
    );
    return rows;
  }
  async findOne(req: ApiRequest) {
    const [rows] = await this.db.execute(
      "SELECT id,status,plant_name,disease_name,confidence,severity,analysis_json,created_at FROM leaf_analyses WHERE id=? AND user_id=?",
      [req.params.id, req.user.sub],
    );
    if (!rows[0]) throw new NotFoundException("Not found");
    return rows[0];
  }
}
