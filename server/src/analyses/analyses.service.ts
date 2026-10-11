import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
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
      const context = z
        .object({
          plantName: z.string().trim().max(150).default(""),
          location: z.string().trim().max(255).default(""),
          language: z.enum(["en", "te", "hi", "kn", "ta"]).default("en"),
        })
        .parse(req.body);
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
        "INSERT INTO leaf_analyses(id,upload_id,user_id,requested_language,model_name,prompt_version,provided_plant_name,plant_location) VALUES(?,?,?,?,?,?,?,?)",
        [
          analysisId,
          uploadId,
          req.user.sub,
          context.language,
          env.OPENAI_VISION_MODEL,
          "leaf-v2",
          context.plantName || null,
          context.location || null,
        ],
      );
      const result = await this.leafAnalysis.analyzeLeaf(
          normalized,
          "image/jpeg",
          context,
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
      return this.findOne({ user: req.user, params: { id: analysisId } });
    } catch (e: any) {
      if (e instanceof BadRequestException || e instanceof z.ZodError) throw e;
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
      "SELECT id,status,plant_name,disease_name,confidence,severity,requested_language,provided_plant_name,plant_location,created_at FROM leaf_analyses WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
      [req.user.sub],
    );
    return rows;
  }
  async findOne(req: Pick<ApiRequest, "user" | "params">) {
    const [rows] = await this.db.execute(
      "SELECT a.*,u.original_file_name,u.consent_to_analyze,u.uploaded_at FROM leaf_analyses a JOIN leaf_uploads u ON u.id=a.upload_id WHERE a.id=? AND a.user_id=?",
      [req.params.id, req.user.sub],
    );
    if (!rows[0]) throw new NotFoundException("Not found");
    const row = rows[0];
    const data =
      typeof row.analysis_json === "string"
        ? JSON.parse(row.analysis_json)
        : row.analysis_json;
    const {
      analysis_json,
      output_en,
      output_te,
      output_hi,
      error_message,
      ...metadata
    } = row;
    return {
      ...metadata,
      ...data,
      id: row.id,
      status: row.status,
      analysis_json: data,
    };
  }
  async image(req: ApiRequest) {
    const [rows] = await this.db.execute(
      "SELECT u.storage_key,u.encryption_iv,u.encryption_tag FROM leaf_uploads u JOIN leaf_analyses a ON a.upload_id=u.id WHERE a.id=? AND a.user_id=? AND u.deleted_at IS NULL",
      [req.params.id, req.user.sub],
    );
    if (!rows[0]) throw new NotFoundException("Not found");
    const row = rows[0];
    return this.security.decrypt(
      await this.storage.readUpload(row.storage_key),
      row.encryption_iv,
      row.encryption_tag,
    );
  }
}
