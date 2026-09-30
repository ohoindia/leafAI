# LeafCare AI

Direct AWS Lambda deployment: see [ZIP deployment and Function URL instructions](docs/lambda-deployment.md). Uses your existing AWS database and `server/.env` exported to Lambda environment variables. Build with `npm --prefix server run lambda:package`; no Docker is needed for this workflow.

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

1. Copy `server/.env.example` to `server/.env` and replace every secret. Generate the encryption key with `openssl rand -hex 32`; use separate long random JWT secrets.
2. Set `OPENAI_API_KEY`. Keep it only in the backend environment—never in React.
3. Start MySQL and import `database/schema.sql`, or run `docker compose up mysql -d`.
4. Run `npm install`, then `npm run install:all`, then `npm run dev`.
5. Open `http://localhost:5173`, create an account, and upload a clear leaf photo.

For one-container production mode, set `NODE_ENV=production` in `server/.env`, use strong managed secrets, configure a real DB host, and run `docker compose up --build`. The application is served at `http://localhost:8080`.

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

Swagger UI: `http://localhost:8080/api/docs` (OpenAPI JSON: `/api/docs-json`). Start the backend first. Use the login endpoint in Swagger, copy its `accessToken`, and paste it into **Authorize** to test protected endpoints. Upload requests include a file picker and require consent. Replace the host/port when using a deployed API.

`POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `POST /api/analyses`, `GET /api/analyses`, `GET /api/analyses/:id`, `POST /api/voice-commands`, `GET /api/health`.

## Swagger setup and bearer authorization

### 1. Configure and start the backend

Run these commands from the repository root (`LeafAI`) in PowerShell. If you already have a configured `server/.env`, keep it.

```powershell
if (!(Test-Path server/.env)) { Copy-Item server/.env.example server/.env }
npm --prefix server install
```

Edit the `server/.env` with your database connection settings: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. For the bundled Docker database, use the values in `docker-compose.yml`.

Create an API key on the [OpenAI API Keys page](https://platform.openai.com/api-keys) and set `OPENAI_API_KEY` in this backend `.env`. Keep it out of the website/mobile code and Swagger's Authorize field. The OpenAI key authenticates the server to OpenAI; the bearer token below authenticates your user to LeafCare AI.

Generate a random secret with this Windows-compatible command:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run it separately three times and use the three different outputs for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `UPLOAD_ENCRYPTION_KEY`. The encryption key must be exactly 64 hexadecimal characters. Keep an existing encryption key if you already have encrypted uploads.

Start MySQL and the API:

```powershell
docker compose up mysql -d
npm --prefix server run dev
```

The Docker database imports `database/schema.sql` on first initialization. If using your own MySQL server, import that schema yourself. The API loads `server/.env` from either the repository root or `server/`; existing process environment variables take precedence. Restart the backend after changing `.env`.

Open [Swagger UI](http://localhost:8080/api/docs). The [OpenAPI JSON](http://localhost:8080/api/docs-json) and [health check](http://localhost:8080/api/health) are also available. Use your configured `PORT` or deployed API host if different from `localhost:8080`.

### 2. Create an account (first time only)

In Swagger, expand **Authentication > POST /api/auth/register**, click **Try it out**, and enter:

```json
{
  "fullName": "Your Name",
  "email": "you@example.com",
  "password": "Replace-With-Your-Own-Password!",
  "language": "en"
}
```

Use your own credentials. Passwords must contain 10–128 characters; names must contain 2–150 characters. Language can be `en`, `te`, or `hi`.

Click **Execute**. A successful response says `Account created`. Registration does not return a bearer token. If you already registered in the website or mobile app, skip this step and use that account.

### 3. Sign in and copy the access token

Expand **POST /api/auth/login**, click **Try it out**, and enter the same email and password:

```json
{
  "email": "you@example.com",
  "password": "Replace-With-Your-Own-Password!"
}
```

Click **Execute**. A successful HTTP 200 response contains `accessToken` and `user`. Copy the entire value of `accessToken`, without the surrounding quotation marks. This is the JWT bearer token for this application.

### 4. Authorize Swagger

1. Click **Authorize** near the top of the Swagger page.
2. In the `bearer` value field, paste only the access token from login. Do **not** include the word `Bearer`, quotation marks, your password, or your OpenAI API key.
3. Click **Authorize** inside the dialog, then **Close**.
4. Expand **GET /api/analyses**, click **Try it out**, then **Execute**.

A successful response is HTTP 200 with your history, or `[]` if you have no analyses. Swagger automatically sends this header on protected endpoints:

```http
Authorization: Bearer <your-access-token>
```

Swagger does not automatically authorize itself after a successful login. You must paste the token into the dialog. Authorization is not persisted across page reloads, so reauthorize after refreshing the page.

### 5. Test a leaf upload

Expand **POST /api/analyses**, then click **Try it out**. Choose a JPEG, PNG, or WebP image in the `leaf` file picker, select `true` for `consent`, and choose `en`, `te`, or `hi` for `language`. Click **Execute** and wait for analysis to finish.

The image must be at least 300 × 300 pixels and within `MAX_UPLOAD_BYTES` (4 MiB by default). This endpoint requires a working database and an OpenAI API key with access to the configured model. Use **GET /api/analyses** to list history, then pass an entry's `id` to **GET /api/analyses/{id}** to retrieve its saved result.

### 6. Refresh or sign out

Access tokens expire after **15 minutes**. To renew one, execute **POST /api/auth/refresh** in the same browser and on the same host where you signed in. Login sets an HttpOnly refresh cookie automatically; you do not copy it manually. Copy the newly returned `accessToken`, open **Authorize**, remove the old token using the dialog's **Logout** button, and authorize with the new one. If refresh fails, sign in again. Production refresh cookies require HTTPS.

To sign out, execute **POST /api/auth/logout** while authorized, then clear the token using **Authorize > Logout**. The Swagger dialog's Logout button only clears its local token; the API endpoint revokes the refresh session and clears its cookie. Already-issued access tokens remain valid until their 15-minute expiry.

### Troubleshooting

| Symptom | What to check |
| --- | --- |
| `{"error":"Not found"}` | Open `/api/docs`, not `/swagger`. Restart the updated backend. For `npm start`, first run `npm --prefix server run build` from the repository root. |
| `Authentication required` / HTTP 401 | Sign in and authorize with the entire `accessToken` value. Remove any manually added `Bearer` prefix. Renew expired tokens. |
| `Invalid credentials` | Use an existing account's email/password. Five failed logins can lock the account for 15 minutes. |
| HTTP 429 | Authentication requests are rate-limited; wait before retrying. |
| Missing or invalid environment settings | Configure the named fields in the `server/.env`, then restart. Do not leave example secrets or a blank OpenAI API key. |
| Database connection error | Start MySQL, check its credentials/port, and ensure the schema is imported. |
| Login works but analysis fails | Check the server error, OpenAI key/model access, selected image, upload size, and consent. |

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
