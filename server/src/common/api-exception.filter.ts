import { Catch, HttpException, NotFoundException } from "@nestjs/common";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import type { Response } from "express";
import multer from "multer";
import { z } from "zod";
import type { ApiRequest } from "./api-request.js";
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: any, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<ApiRequest>();
    const res = http.getResponse<Response>();
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid input",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    if (error?.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "Record already exists" });
    if (error instanceof multer.MulterError)
      return res.status(400).json({ error: error.message });
    if (error instanceof NotFoundException)
      return res.status(404).json({ error: "Not found" });
    if (error instanceof HttpException) {
      // Nest maps Multer's file-size error to 413; preserve the existing API's 400 response.
      const status =
        error.getStatus() === 413 && error.message === "File too large"
          ? 400
          : error.getStatus();
      return res.status(status).json({ error: error.message });
    }
    console.error(req.id, error);
    return res.status(500).json({ error: "Request failed", requestId: req.id });
  }
}
