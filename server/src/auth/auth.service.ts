import sharp from "sharp";
import { userDetailsSchema } from "./user-schema.js";
import crypto from "node:crypto";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { z } from "zod";
import {
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
  BadRequestException,
} from "@nestjs/common";
import { env } from "../config.js";
import { DatabaseService } from "../common/database.service.js";
import { SecurityService } from "../common/security.service.js";
import type { ApiRequest } from "../common/api-request.js";
import { farmDetailsSchema } from "./farm-schema.js";
import { readFarms, saveFarm } from "./farm-records.js";
const creds = z.object({
  email: z
    .string()
    .email()
    .max(255)
    .transform((x) => x.toLowerCase()),
  password: z.string().min(10).max(128),
});
@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly security: SecurityService,
  ) {}
  async me(req: ApiRequest) {
    const [rows] = await this.db.execute(
      "SELECT id,full_name,email,mobile_number,preferred_language,role,user_details,profile_photo FROM users WHERE id=? AND is_active=1",
      [req.user.sub],
    );
    if (!rows[0]) throw new UnauthorizedException("Session expired");
    const u = rows[0];
    const farms = await readFarms(this.db, req.user.sub);
    return {
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      mobileNumber: u.mobile_number,
      language: u.preferred_language,
      role: u.role,
      userDetails:
        typeof u.user_details === "string"
          ? JSON.parse(u.user_details)
          : u.user_details || {},
      profilePhoto: this.photoData(u.profile_photo),
      farms,
      farmDetails: farms[0]?.details || {},
    };
  }
  async updateProfile(req: ApiRequest) {
    const b = z
      .object({
        fullName: z.string().trim().min(2).max(150),
        language: z.enum(["en", "te", "hi", "kn", "ta"]),
        farmDetails: farmDetailsSchema.optional(),
        farmId: z.union([z.literal("new"), z.string().uuid()]).optional(),
        newCrop: z.boolean().optional(),
        addPreviousCrop: z.boolean().optional(),
        userDetails: userDetailsSchema.optional(),
      })
      .parse(req.body);
    if (b.newCrop && b.addPreviousCrop)
      throw new BadRequestException(
        "Choose either a new current crop or a previous crop",
      );
    const columns = ["full_name=?", "preferred_language=?"];
    const values: string[] = [b.fullName, b.language];

    if (b.userDetails !== undefined) {
      columns.push("user_details=?");
      values.push(JSON.stringify(b.userDetails));
    }
    values.push(req.user.sub);
    await this.db.transaction(async (connection) => {
      await connection.execute(
        `UPDATE users SET ${columns.join(",")} WHERE id=? AND is_active=1`,
        values,
      );
      if (b.farmDetails !== undefined)
        await saveFarm(
          connection,
          req.user.sub,
          b.farmDetails,
          b.farmId,
          b.newCrop,
          false,
          b.addPreviousCrop,
        );
    });
    return this.me(req);
  }
  private photoData(value: unknown): string | null {
    if (!value) return null;
    const photo = typeof value === "string" ? JSON.parse(value) : value;
    const { encrypted, iv, tag } = photo as {
      encrypted: string;
      iv: string;
      tag: string;
    };
    return `data:image/jpeg;base64,${this.security.decrypt(Buffer.from(encrypted, "base64"), iv, tag).toString("base64")}`;
  }
  async uploadPhoto(req: ApiRequest) {
    if (!req.file || req.file.buffer.length > 4 * 1024 * 1024)
      throw new BadRequestException("Choose a photo smaller than 4 MiB.");
    let normalized: Buffer;
    try {
      const image = sharp(req.file.buffer, {
        failOn: "error",
        limitInputPixels: 40_000_000,
      });
      const meta = await image.metadata();
      if (
        !["jpeg", "png", "webp"].includes(meta.format || "") ||
        (meta.pages || 1) > 1
      )
        throw new Error("Unsupported image");
      normalized = await image
        .rotate()
        .resize(384, 384, { fit: "cover" })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch {
      throw new BadRequestException("Choose a valid JPEG, PNG or WebP photo.");
    }
    const photo = this.security.encrypt(normalized);
    await this.db.execute(
      "UPDATE users SET profile_photo=? WHERE id=? AND is_active=1",
      [
        JSON.stringify({
          encrypted: photo.encrypted.toString("base64"),
          iv: photo.iv,
          tag: photo.tag,
        }),
        req.user.sub,
      ],
    );
    return this.me(req);
  }
  async forgotPassword(req: ApiRequest) {
    const { email } = creds.pick({ email: true }).parse(req.body);
    if (!env.RESET_EMAIL_WEBHOOK_URL || !env.RESET_EMAIL_WEBHOOK_SECRET)
      throw new ServiceUnavailableException(
        "Password recovery is not configured. Please contact support.",
      );
    const [rows] = await this.db.execute(
      "SELECT id,password_hash FROM users WHERE email=? AND is_active=1",
      [email],
    );
    if (rows[0]) {
      const token = jwt.sign(
        {
          purpose: "password-reset",
          fingerprint: this.security.sha256(rows[0].password_hash),
        },
        env.JWT_REFRESH_SECRET,
        {
          subject: String(rows[0].id),
          expiresIn: "15m",
          audience: "krishi-password-reset",
        },
      );
      const response = await fetch(env.RESET_EMAIL_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.RESET_EMAIL_WEBHOOK_SECRET}`,
        },
        body: JSON.stringify({
          to: email,
          subject: "Reset your Krishi Karshak password",
          token,
          expiresInMinutes: 15,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok)
        throw new ServiceUnavailableException(
          "Unable to send recovery email. Please try again later.",
        );
    }
    return {
      message:
        "If an account exists, a recovery code has been sent to your email.",
    };
  }
  async resetPassword(req: ApiRequest) {
    const b = z
      .object({
        token: z.string().min(1).max(2048),
        password: creds.shape.password,
      })
      .parse(req.body);
    let payload: jwt.JwtPayload;
    try {
      const decoded = jwt.verify(b.token, env.JWT_REFRESH_SECRET, {
        audience: "krishi-password-reset",
      });
      if (
        typeof decoded === "string" ||
        decoded.purpose !== "password-reset" ||
        !decoded.sub
      )
        throw Error();
      payload = decoded;
    } catch {
      throw new UnauthorizedException(
        "Recovery code is invalid or expired. Request a new code.",
      );
    }
    const [rows] = await this.db.execute(
      "SELECT password_hash FROM users WHERE id=? AND is_active=1",
      [payload.sub!],
    );
    if (
      !rows[0] ||
      this.security.sha256(rows[0].password_hash) !== payload.fingerprint
    )
      throw new UnauthorizedException(
        "Recovery code is invalid or expired. Request a new code.",
      );
    await this.replacePassword(payload.sub!, rows[0].password_hash, b.password);
    return { message: "Password reset. Sign in with your new password." };
  }
  private async replacePassword(
    userId: string,
    oldHash: string,
    password: string,
  ) {
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    const [result] = await this.db.execute(
      "UPDATE users SET password_hash=?,failed_login_count=0,locked_until=NULL WHERE id=? AND password_hash=?",
      [hash, userId, oldHash],
    );
    if (!result.affectedRows)
      throw new UnauthorizedException("Password changed. Please try again.");
    await this.db.execute(
      "UPDATE user_sessions SET revoked_at=NOW(3) WHERE user_id=? AND revoked_at IS NULL",
      [userId],
    );
  }
  async changePassword(req: ApiRequest) {
    const b = z
      .object({
        currentPassword: creds.shape.password,
        password: creds.shape.password,
      })
      .parse(req.body);
    const [rows] = await this.db.execute(
      "SELECT password_hash FROM users WHERE id=? AND is_active=1",
      [req.user.sub],
    );
    if (
      !rows[0] ||
      !(await argon2.verify(rows[0].password_hash, b.currentPassword))
    )
      throw new UnauthorizedException("Current password is incorrect");
    await this.replacePassword(req.user.sub, rows[0].password_hash, b.password);
    return { message: "Password updated. Please sign in again." };
  }
  private async otpConfig() {
    const [values] = await this.db.execute(
      "SELECT ConfigKey,ConfigValue FROM ConfigValues",
    );
    const [secrets] = await this.db.execute(
      "SELECT ConfigKey,ConfigValue FROM ConfigSecrets",
    );
    return Object.fromEntries(
      [...values, ...secrets].map((r) => [r.ConfigKey, r.ConfigValue]),
    );
  }
  async checkMobile(req: ApiRequest) {
    const { mobileNumber } = z
      .object({
        mobileNumber: z
          .string()
          .trim()
          .regex(/^[6-9][0-9]{9}$/),
      })
      .parse(req.body);
    const [users] = await this.db.execute(
      "SELECT id,is_active,pin_hash,mobile_verified_at FROM users WHERE mobile_number=? LIMIT 1",
      [mobileNumber],
    );
    const user = users[0];
    if (user && !user.is_active)
      throw new UnauthorizedException(
        "Account is inactive. Please contact support.",
      );
    const profileCreated = Boolean(user?.pin_hash && user?.mobile_verified_at);
    return {
      exists: Boolean(user),
      profileCreated,
      nextAction: profileCreated ? "PIN_LOGIN" : "REQUEST_OTP",
    };
  }
  async requestOtp(req: ApiRequest) {
    const { mobileNumber, resetPin } = z
      .object({
        mobileNumber: z
          .string()
          .trim()
          .regex(/^[6-9][0-9]{9}$/),
        resetPin: z.boolean().default(false),
      })
      .parse(req.body);
    const config = await this.otpConfig();
    const otp = String(crypto.randomInt(100000, 1000000));
    const guid = crypto.randomUUID();
    const expires = new Date(Date.now() + 120000);
    await this.db.transaction(async (c) => {
      const [users] = await c.execute(
        "SELECT id,is_active,pin_hash,mobile_verified_at FROM users WHERE mobile_number=? FOR UPDATE",
        [mobileNumber],
      );
      let user = users[0];
      if (user && !user.is_active)
        throw new UnauthorizedException(
          "Account is inactive. Please contact support.",
        );
      if (resetPin && !user?.pin_hash)
        throw new BadRequestException(
          "Complete registration before resetting your PIN.",
        );
      if (user?.pin_hash && user.mobile_verified_at && !resetPin)
        throw new BadRequestException(
          "Profile already created. Sign in with your PIN.",
        );
      if (!user) {
        const [created] = await c.execute(
          "INSERT INTO users(mobile_number,full_name,user_details) VALUES(?,'',?)",
          [mobileNumber, JSON.stringify({ phone: mobileNumber })],
        );
        user = { id: created.insertId };
      }
      const [history] = await c.execute(
        "SELECT GeneratedOn FROM MobileOTPHistory WHERE user_id=? AND GeneratedOn>DATE_SUB(NOW(3),INTERVAL 24 HOUR)",
        [user.id],
      );
      if (history.length >= 5)
        throw new BadRequestException("OTP limit reached. Try after 24 hours.");
      if (
        history.some(
          (r: { GeneratedOn: string }) =>
            new Date(r.GeneratedOn).getTime() > Date.now() - 60000,
        )
      )
        throw new BadRequestException(
          "Wait 60 seconds before requesting another OTP.",
        );
      if (config.OTP_SEND_ENABLED === "true") {
        try {
          if (config.SMS_PROVIDER === "msg91") {
            if (!config.MSG91_AUTH_KEY || !config.MSG91_OTP_TEMPLATE_ID)
              throw Error();
            const url = new URL(
              config.MSG91_OTP_URL || "https://control.msg91.com/api/v5/flow",
            );
            if (url.protocol !== "https:") throw Error();
            const response = await fetch(url, {
              method: "POST",
              headers: {
                authkey: config.MSG91_AUTH_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                template_id: config.MSG91_OTP_TEMPLATE_ID,
                recipients: [{ mobiles: `91${mobileNumber}`, var: otp }],
              }),
              signal: AbortSignal.timeout(10000),
            });
            const body = (await response.json()) as { type?: string };
            if (!response.ok || body.type !== "success") throw Error();
          } else if (config.SMS_PROVIDER === "smsfresh") {
            if (
              !config.SMSFRESH_OTP_URL ||
              !config.SMSFRESH_USER ||
              !config.SMSFRESH_PASSWORD ||
              !config.SMSFRESH_SENDER
            )
              throw Error();
            const url = new URL(config.SMSFRESH_OTP_URL);
            if (url.protocol !== "https:") throw Error();
            url.search = new URLSearchParams({
              user: config.SMSFRESH_USER,
              pass: config.SMSFRESH_PASSWORD,
              sender: config.SMSFRESH_SENDER,
              phone: mobileNumber,
              text: `Your Krishi Karshak OTP is ${otp}.`,
              priority: "ndnd",
              stype: "normal",
            }).toString();
            const response = await fetch(url, {
              signal: AbortSignal.timeout(10000),
            });
            if (!response.ok || !(await response.text()).includes("S."))
              throw Error();
          } else throw Error();
        } catch {
          throw new ServiceUnavailableException(
            "Unable to send OTP. Check SMS provider configuration.",
          );
        }
      } else if (config.OTP_SEND_ENABLED !== "false")
        throw new ServiceUnavailableException("OTP sending is not configured.");
      await c.execute(
        "UPDATE MobileOTPHistory SET consumed_at=NOW(3) WHERE user_id=? AND consumed_at IS NULL",
        [user.id],
      );
      await c.execute(
        "INSERT INTO MobileOTPHistory(GUID,user_id,MobileNumber,OTPGenerated,ExpiredOTPOn,purpose) VALUES(?,?,?,?,?,?)",
        [
          guid,
          user.id,
          mobileNumber,
          otp,
          expires,
          resetPin ? "PIN_RESET" : "REGISTRATION",
        ],
      );
    });
    return {
      guid,
      expiresAt: expires.toISOString(),
      deliveryEnabled: config.OTP_SEND_ENABLED === "true",
      ...(config.OTP_SEND_ENABLED === "false" ? { testOtp: otp } : {}),
    };
  }
  async verifyOtp(req: ApiRequest) {
    const b = z
      .object({
        guid: z.string().uuid(),
        otp: z.string().regex(/^\d{6}$/),
        fullName: z.string().trim().min(2).max(150).optional(),
      })
      .parse(req.body);
    const valid = await this.db.transaction(async (c) => {
      const [rows] = await c.execute(
        "SELECT * FROM MobileOTPHistory WHERE GUID=? FOR UPDATE",
        [b.guid],
      );
      const r = rows[0];
      if (
        !r ||
        r.consumed_at ||
        r.verified_at ||
        r.attempts >= 5 ||
        new Date(r.ExpiredOTPOn) <= new Date()
      )
        return false;
      await c.execute(
        "UPDATE MobileOTPHistory SET attempts=attempts+1 WHERE GUID=?",
        [b.guid],
      );
      try {
        const stored =
          typeof r.OTPGenerated === "string"
            ? JSON.parse(r.OTPGenerated)
            : r.OTPGenerated;
        const otp =
          stored && typeof stored === "object"
            ? this.security.decrypt(
                Buffer.from(stored.encrypted, "base64"),
                stored.iv,
                stored.tag,
              )
            : Buffer.from(String(stored));
        const submitted = Buffer.from(b.otp);
        if (
          otp.length !== submitted.length ||
          !crypto.timingSafeEqual(otp, submitted)
        )
          return false;
      } catch {
        return false;
      }
      let fullName = b.fullName;
      if (r.purpose === "PIN_RESET") {
        const [owners] = await c.execute(
          "SELECT full_name FROM users WHERE id=? AND is_active=1",
          [r.user_id],
        );
        if (!owners[0]) return false;
        fullName = owners[0].full_name;
      }
      if (!fullName || fullName.trim().length < 2)
        throw new BadRequestException(
          "Enter your full name to complete registration.",
        );
      await c.execute(
        "UPDATE MobileOTPHistory SET verified_at=NOW(3),full_name=?,ExpiredOTPOn=DATE_ADD(NOW(3),INTERVAL 5 MINUTE) WHERE GUID=?",
        [fullName, b.guid],
      );
      return true;
    });
    if (!valid)
      throw new UnauthorizedException(
        "Invalid or expired OTP. Request a new code.",
      );
    return { guid: b.guid, message: "OTP verified. Set your PIN." };
  }
  private async completeProfile(req: ApiRequest) {
    const b = z
      .object({
        guid: z.string().uuid(),
        pin: z.string().regex(/^\d{4}$/),
        language: z.enum(["en", "te", "hi", "kn", "ta"]).default("en"),
      })
      .parse(req.body);
    const hash = await argon2.hash(b.pin, { type: argon2.argon2id });
    return this.db.transaction(async (c) => {
      const [records] = await c.execute(
        "SELECT * FROM MobileOTPHistory WHERE GUID=? FOR UPDATE",
        [b.guid],
      );
      const proof = records[0];
      if (
        !proof ||
        !proof.verified_at ||
        proof.consumed_at ||
        new Date(proof.ExpiredOTPOn) <= new Date()
      )
        throw new UnauthorizedException(
          "Verification expired. Request a new OTP.",
        );
      const [users] = await c.execute(
        "SELECT * FROM users WHERE id=? AND mobile_number=? AND is_active=1 FOR UPDATE",
        [proof.user_id, proof.MobileNumber],
      );
      if (!users[0])
        throw new UnauthorizedException("Mobile number is not registered");
      if (
        users[0].pin_hash &&
        users[0].mobile_verified_at &&
        proof.purpose !== "PIN_RESET"
      )
        throw new UnauthorizedException(
          "Profile already created. Sign in with your PIN.",
        );
      await c.execute(
        "UPDATE users SET full_name=?,pin_hash=?,preferred_language=?,mobile_verified_at=NOW(3) WHERE id=?",
        [proof.full_name, hash, b.language, proof.user_id],
      );
      await c.execute(
        "UPDATE MobileOTPHistory SET consumed_at=NOW(3) WHERE GUID=?",
        [b.guid],
      );
      await c.execute(
        "UPDATE user_sessions SET revoked_at=NOW(3) WHERE user_id=? AND revoked_at IS NULL",
        [proof.user_id],
      );
      return {
        ...users[0],
        full_name: proof.full_name,
        preferred_language: b.language,
      };
    });
  }
  async login(req: ApiRequest) {
    const setup = z.object({
      guid: z.string().uuid(),
      pin: z.string().regex(/^\d{4}$/),
      language: z.enum(["en", "te", "hi", "kn", "ta"]).default("en"),
    });
    const pinLogin = z.object({
      mobileNumber: z
        .string()
        .trim()
        .regex(/^[6-9][0-9]{9}$/),
      pin: z.string().regex(/^\d{4}$/),
    });
    const b = z.union([pinLogin, setup]).parse(req.body);
    let u: any;
    if ("guid" in b)
      u = await this.completeProfile({ ...req, body: b } as ApiRequest);
    else {
      u = await this.db.transaction(async (c) => {
        const [rows] = await c.execute(
          "SELECT * FROM users WHERE mobile_number=? FOR UPDATE",
          [b.mobileNumber],
        );
        const user = rows[0];
        if (
          !user ||
          !user.is_active ||
          !user.pin_hash ||
          !user.mobile_verified_at ||
          (user.locked_until && new Date(user.locked_until) > new Date())
        )
          return null;
        if (!(await argon2.verify(user.pin_hash, b.pin))) {
          const count = Number(user.failed_login_count || 0) + 1;
          await c.execute(
            "UPDATE users SET failed_login_count=?,locked_until=IF(? >= 5,DATE_ADD(NOW(3),INTERVAL 15 MINUTE),locked_until) WHERE id=?",
            [count, count, user.id],
          );
          return null;
        }
        await c.execute(
          "UPDATE users SET failed_login_count=0,locked_until=NULL WHERE id=?",
          [user.id],
        );
        return user;
      });
      if (!u)
        throw new UnauthorizedException(
          "Invalid PIN or account unavailable. Use OTP to recover your PIN.",
        );
    }
    const sid = crypto.randomUUID();
    const tokens = this.security.issueTokens(u, sid);
    await this.db.execute(
      "INSERT INTO user_sessions(id,user_id,refresh_token_hash,ip_address,user_agent,expires_at) VALUES(?,?,?,INET6_ATON(?),?,DATE_ADD(NOW(3),INTERVAL 7 DAY))",
      [
        sid,
        u.id,
        this.security.sha256(tokens.refreshToken),
        req.ip,
        req.get("user-agent"),
      ],
    );
    await this.db.execute(
      "UPDATE users SET failed_login_count=0,locked_until=NULL,last_login_at=NOW(3) WHERE id=?",
      [u.id],
    );
    await this.db.execute(
      "INSERT INTO login_events(user_id,email_attempted,event_type,ip_address,user_agent) VALUES(?,?,?,INET6_ATON(?),?)",
      [u.id, u.email, "LOGIN_SUCCESS", req.ip, req.get("user-agent")],
    );
    const farms = await readFarms(this.db, String(u.id));
    return {
      tokens,
      user: {
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        mobileNumber: u.mobile_number,
        language: u.preferred_language,
        role: u.role,
        userDetails:
          typeof u.user_details === "string"
            ? JSON.parse(u.user_details)
            : u.user_details || {},
        profilePhoto: this.photoData(u.profile_photo),
        farms,
        farmDetails: farms[0]?.details || {},
      },
    };
  }
  async refresh(req: ApiRequest) {
    try {
      const token = req.cookies.refreshToken;
      const p = jwt.verify(token, env.JWT_REFRESH_SECRET, {
        issuer: "leaf-care-ai",
        audience: "leaf-care-web",
      });
      if (typeof p === "string" || !p.sid || !p.sub)
        throw new Error("Invalid session");
      const [rows] = await this.db.execute(
        "SELECT s.*,u.role FROM user_sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.refresh_token_hash=? AND s.revoked_at IS NULL AND s.expires_at>NOW(3)",
        [p.sid, this.security.sha256(token)],
      );
      if (!rows[0]) throw Error();
      const next = this.security.issueTokens(
        { id: p.sub, role: rows[0].role },
        p.sid,
      );
      await this.db.execute(
        "UPDATE user_sessions SET refresh_token_hash=?,last_used_at=NOW(3) WHERE id=?",
        [this.security.sha256(next.refreshToken), p.sid],
      );
      return next;
    } catch {
      throw new UnauthorizedException("Session expired");
    }
  }
  async logout(req: ApiRequest) {
    await this.db.execute(
      "UPDATE user_sessions SET revoked_at=NOW(3) WHERE id=? AND user_id=?",
      [req.user.sid, req.user.sub],
    );
  }
}
