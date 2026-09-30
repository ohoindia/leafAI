# LeafCare AI

Android and iOS: the matching React Native + Expo application is in `mobile/`. See the [mobile setup and build guide](mobile/README.md) for phone, emulator, APK, and iOS build instructions.

For AWS Lambda backend and AWS Amplify website setup, see the [AWS deployment guide](docs/aws-deployment.md). The repository includes a SAM template, Amplify build configuration, API rewrite example, Secrets Manager integration, and private S3 upload storage. AWS uploads are limited to 4 MiB.

A secure React + NestJS + MySQL starter for AI-assisted plant-leaf screening. It analyzes a photographed leaf, returns structured plant-health guidance in English, Telugu, and Hindi, reads results aloud, accepts voice commands, and keeps a traceable login/upload/analysis history.

## Included

- React/Vite responsive UI with camera upload, multilingual labels and speech output.
- Browser speech recognition commands: analyze, history, read result, switch language.
- NestJS API with OpenAI Responses API vision analysis and strict JSON output.
- MySQL 8 schema for users, login events, sessions, encrypted leaf uploads, full analyses, translated displayed outputs, voice commands, and audit logs.
- Argon2id passwords; short-lived JWT access tokens; rotated, hashed refresh tokens in HttpOnly SameSite cookies; account lockout; rate limits; Helmet; CORS allowlist; Zod validation.
- File type/size/dimension checks, normalization, SHA-256 fingerprint, AES-256-GCM encryption at rest, per-user history authorization.

## Run locally

1. Copy `.env.example` to `.env` and replace every secret. Generate the encryption key with `openssl rand -hex 32`; use separate long random JWT secrets.
2. Set `OPENAI_API_KEY`. Keep it only in the backend environment—never in React.
3. Start MySQL and import `database/schema.sql`, or run `docker compose up mysql -d`.
4. Run `npm install`, then `npm run install:all`, then `npm run dev`.
5. Open `http://localhost:5173`, create an account, and upload a clear leaf photo.

For one-container production mode, set `NODE_ENV=production`, use strong managed secrets, configure a real DB host, and run `docker compose up --build`. The application is served at `http://localhost:8080`.

## Voice commands

Chrome/Edge provide the broadest Web Speech API support. Try “analyze leaf,” “show history,” “read result,” “Telugu,” “Hindi,” or “English.” Browser speech availability and language quality depend on the device/browser. For a fully managed conversational voice experience, replace the browser recognizer with a backend-created ephemeral Realtime session; never expose a standard API key to the browser.

## Production checklist

- Put the service behind HTTPS and a WAF/reverse proxy. Use a managed MySQL private endpoint and object storage with KMS instead of the local upload folder.
- Use a secrets manager/workload identity, DB migrations, backups, monitoring, centralized audit logs, and malware scanning.
- Disable or invite-gate `/api/auth/register`; add email verification, password reset, MFA/passkeys, admin RBAC, and a data retention/deletion workflow.
- Add CSRF protection if cookie-based write endpoints are expanded; keep the current access token in memory rather than long-term browser storage.
- Pin a model snapshot after validation. Build a labeled agronomy evaluation set by crop/region, calibrate confidence, add human agronomist review, and test Telugu/Hindi quality.
- Treat results as screening, not definitive diagnosis. Treatment and pesticide decisions must follow local agricultural guidance and product labels.

## API summary

`POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `POST /api/analyses`, `GET /api/analyses`, `GET /api/analyses/:id`, `POST /api/voice-commands`, `GET /api/health`.

## Model configuration

`OPENAI_VISION_MODEL` defaults to `gpt-6-astra`. You can change it without editing code after validating another current vision-capable model for quality, latency, availability, and cost. The analysis prompt produces all three languages in one structured response so the exact displayed output can be stored.

## Server structure

The backend uses NestJS with TypeScript and the Express adapter. Each feature in
`server/src/auth`, `analyses`, `voice-commands`, and `health` has a module,
controller, and service. Controllers handle HTTP requests; services contain the
application logic. `AppModule` composes the features and `CommonModule` provides
shared database, security, and storage services. Existing JavaScript integration
helpers are compiled alongside TypeScript. JWT authentication uses a Nest guard,
file uploads use a Nest interceptor, and the global exception filter preserves
API error responses.

Development: `npm --prefix server run dev` compiles and restarts the API on changes.
For a standalone production start, run `npm --prefix server run build`, then
`npm --prefix server start`. Docker and SAM compile the backend during packaging.
Node.js 22 or later is required. All existing `/api` endpoint paths are retained.
