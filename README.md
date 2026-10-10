# LeafCare AI

**Recommended Lambda setup:** follow [server/DEPLOYMENT.md](server/DEPLOYMENT.md), matching OHO's install → test → package → SAM deploy sequence. Run from `server/`; SAM uploads automatically. Configure application settings directly in Lambda. GitHub Actions can be added later.

Deployment instructions: [initial SAM deployment](server/DEPLOYMENT.md#5-first-deployment) and [redeploy after changes](server/DEPLOYMENT.md#7-redeploy-after-code-or-dependency-changes).

Legacy manual Lambda deployment: [ZIP upload instructions](docs/lambda-deployment.md) remain available for existing manually managed functions. New setups should use the server SAM guide above.

Android and iOS: the matching React Native + Expo application is in `mobile/`. See the [mobile setup and build guide](mobile/README.md) for phone, emulator, APK, and iOS build instructions.

For Amplify website configuration and existing stacks created with the older root template, see the [legacy AWS guide](docs/aws-deployment.md). New backend setups use `server/template.yaml`; the repository-root template retains its Secrets Manager workflow for existing stacks. AWS uploads are limited to 4 MiB.

A secure React + NestJS + MySQL starter for AI-assisted plant-leaf screening. It analyzes a photographed leaf, returns structured plant-health guidance in English, Telugu, and Hindi, reads results aloud, accepts voice commands, and keeps a traceable login/upload/analysis history.

## Included

- React/Vite responsive UI with camera upload, multilingual labels and speech output.
- Browser speech recognition commands: analyze, history, read result, switch language.
- NestJS API with OpenAI Responses API vision analysis and strict JSON output.
- MySQL 8 schema for users, login events, sessions, encrypted leaf uploads, full analyses, translated displayed outputs, voice commands, and audit logs.
- Argon2id passwords; short-lived JWT access tokens; rotated, hashed refresh tokens in HttpOnly SameSite cookies; account lockout; rate limits; Helmet; CORS allowlist; Zod validation.
- File type/size/dimension checks, normalization, SHA-256 fingerprint, AES-256-GCM encryption at rest, per-user history authorization.

## Run locally

For AWS deployment using your existing database, go directly to the [server deployment guide](server/DEPLOYMENT.md).

1. Copy `server/.env.example` to `server/.env` and replace every secret. Generate the encryption key with `openssl rand -hex 32`; use separate long random JWT secrets.
2. Set `OPENAI_API_KEY`. Keep it only in the backend environment—never in React.
3. Start MySQL and import `database/schema.sql`, or run `docker compose up mysql -d`.
4. Run `npm install`, then `npm run install:all`, then `npm run dev`.
5. Open `http://localhost:5173`, create an account, and upload a clear leaf photo.

For one-container production mode, set `NODE_ENV=production` in `server/.env`, use strong managed secrets, configure a real DB host, and run `docker compose up --build`. The application is served at `http://localhost:8080`.

## Deploy the server to AWS Lambda

For the recommended OHO-style SAM setup, follow [server/DEPLOYMENT.md](server/DEPLOYMENT.md). The manual upload instructions below are a legacy alternative; do not use them to update a SAM-managed function.

Use your existing AWS database. This workflow builds a ZIP on Windows and exposes a Lambda Function URL. It does not require Docker or SAM. The backend configuration file is `server/.env`.

### First-time deployment

1. **Build the package** from the `LeafAI` repository root:

   ```powershell
   npm --prefix server ci
   npm --prefix server run lambda:package
   ```

   This creates `server/lambda.zip` with Linux-compatible dependencies. The ZIP excludes `.env` and secrets.

2. **Create the function** in AWS Console > Lambda > Create function > Author from scratch. Use these settings:

   | Setting | Value |
   | --- | --- |
   | Function name | `leafcare-api` |
   | Region | `ap-south-1` (or your chosen region) |
   | Runtime | Node.js 22.x |
   | Architecture | x86_64 |
   | Handler, under Code > Runtime settings | `dist/lambda.handler` |
   | Memory, under Configuration > General configuration | 1024 MB |
   | Timeout | 120 seconds |

   Under **Code > Upload from > .zip file**, select `server/lambda.zip`. Use an execution role with CloudWatch Logs access and both `s3:PutObject` and `s3:GetObject` permissions on your private upload bucket's objects. Configure access to your existing database; if it is private, select the appropriate existing VPC/subnets/security group and ensure outbound access to OpenAI. See the [full deployment guide](docs/lambda-deployment.md) for the network and role details.

3. **Create the public URL:** open **Configuration > Function URL > Create function URL**, choose **Auth type: NONE**, and save. Protected application endpoints still require a JWT. Leave the Function URL CORS settings unset; the app handles CORS. Copy the resulting HTTPS URL.

4. **Configure environment variables:** edit `server/.env` to use your existing AWS database endpoint and credentials. Set `UPLOAD_BUCKET` to your private upload bucket and add the Function URL origin (without a trailing slash) to `ALLOWED_ORIGINS`. Retain your OpenAI key, JWT secrets, and encryption key. Export the settings:

   ```powershell
   npm --prefix server run lambda:env
   ```

   This produces the Git-ignored `server/lambda-environment.json`. With AWS CLI authenticated to your account, apply it:

   ```powershell
   aws sts get-caller-identity
   aws lambda update-function-configuration --function-name leafcare-api --region ap-south-1 --environment file://server/lambda-environment.json --query FunctionName --output text
   aws lambda wait function-updated --function-name leafcare-api --region ap-south-1
   ```

   Alternatively, enter the values under **Configuration > Environment variables > Edit** in the console. Include `NODE_ENV=production`, `DB_CONNECTION_LIMIT=2`, `MAX_UPLOAD_BYTES=4194304`, and `TRUST_PROXY=0`. The export command supplies these automatically. Lambda does not read your local `.env` file. Environment updates replace the entire variable map; include any additional settings you need to retain.

5. **Verify the deployment** by opening these paths on your Function URL:

   ```text
   https://YOUR_ID.lambda-url.ap-south-1.on.aws/api/health
   https://YOUR_ID.lambda-url.ap-south-1.on.aws/api/docs
   ```

   Health should return `{"status":"ok"}`. Swagger lets you register, log in, authorize with the returned token, and test an upload. The bare URL `/` returns `Not found` because it is not an API route.

### Deploy later code changes

Local edits and Git pushes do not automatically update a manually deployed Lambda. Before deploying the current server to an existing database, follow the [migration and permission prerequisites](docs/lambda-deployment.md#before-deploying-the-current-server-to-an-existing-database). The full guide also covers [deployment verification](docs/lambda-deployment.md#confirm-the-function-was-updated), large ZIP uploads, and rollback.

Run these commands from the repository root whenever backend code or dependencies change:

```powershell
npm --prefix server ci
npm --prefix server test
npm --prefix server run lambda:package
aws lambda update-function-code --function-name leafcare-api --region ap-south-1 --zip-file fileb://server/lambda.zip --query '{Function:FunctionName,Status:LastUpdateStatus}' --output json
aws lambda wait function-updated --function-name leafcare-api --region ap-south-1
```

Stop if any build or test command fails. The existing function, environment variables, and Function URL are retained. Do not create a new function for each update. If using the console instead of AWS CLI, upload the rebuilt `server/lambda.zip` under the existing function's **Code > Upload from > .zip file**.

If only configuration changes, edit `server/.env`, run `npm --prefix server run lambda:env`, and repeat the `update-function-configuration` and wait commands above. No ZIP rebuild is needed for environment-only changes. Avoid rotating the upload encryption key when existing uploads depend on it.

After each deployment, check `/api/health`, `/api/docs`, and a signed-in API request. View errors under **Lambda > Monitor > View CloudWatch logs**. Replace the function name and region in every command if you chose different values.

### Connect the mobile app to Lambda

Set the deployed origin in `mobile/.env` (without `/api`):

```env
EXPO_PUBLIC_API_URL=https://YOUR_ID.lambda-url.ap-south-1.on.aws
```

Restart Expo from `mobile` with `npx expo start --clear`, adding `--tunnel` if needed. The app will use Lambda instead of the backend on your PC. For installation builds, configure the same value in your EAS build environment.

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
| `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` during analysis | Use Node.js 22.19 or later and restart with `npm run dev` or `npm --prefix server start`. These commands enable `--use-system-ca` so Node trusts the operating system's certificate store, including installed corporate/antivirus CAs, while keeping TLS verification enabled. For direct launches use `node --use-system-ca server/dist/main.js`. If your organization's CA is not installed, obtain its trusted PEM bundle from your administrator and set `NODE_EXTRA_CA_CERTS` in the shell before starting Node; setting it in `.env` is too late. |

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
Node.js 22.19 or later is required. All existing `/api` endpoint paths are retained.

## Mobile web screen flow

The website always uses a centered, single-column viewport with a maximum width of 430px, including desktop browsers. On smaller phones it fills the available width.

The flow is language selection → sign in/create account → dashboard → camera/gallery → photo review → optional plant name/location and required consent → analysis progress → summary → full details/voice assistant. History supports search, filters, reopening saved results, saved photos and audit metadata. Camera capture uses the device's native picker; gallery is a separate picker. Voice commands also have clickable fallbacks when speech recognition is unavailable.

Existing databases need the additive context migration before running the updated backend:

```powershell
npm --prefix server run build
node server/scripts/migrate-analysis-context.mjs
```

The migration is safe to rerun and preserves existing rows. New databases use the updated `database/schema.sql`. The equivalent one-time SQL is in `database/migrations/001_analysis_context.sql`.

For existing Lambda execution roles, include both `s3:PutObject` and `s3:GetObject` on your upload bucket's objects. The SAM template includes both. Photos remain encrypted at rest and are decrypted only by the authenticated, owner-scoped `GET /api/analyses/:id/image` route. `GET /api/auth/me` restores profile information after a page reload. Analysis requests now accept optional `plantName` (150 characters) and `location` (255 characters). New analyses include translated full guidance; old saved analyses retain their original translations and use English for any missing detailed sections.

### Farmer profile

Open Profile → Farm and crops on web or mobile to save farm location, area and soil, irrigation, present and previous crops, inputs and field notes. All 43 fields are optional. Data is stored with the signed-in account. The profile PATCH endpoint accepts farmDetails together with fullName and language. Omitting farmDetails preserves the saved farm; submitting an empty object clears it.

Before deploying the updated server to an existing database, apply `database/migrations/002_farmer_profile.sql` using your MySQL migration workflow. Fresh databases include the column in `database/schema.sql`.


## User contact, address and profile photo

Account details includes personal contact numbers, a residential address, and a profile photo. These are stored separately from farm details. Web and mobile support camera capture, gallery selection, a preview, and explicit photo upload. Photos are validated as JPEG, PNG or WebP (up to 4 MiB), normalized to a 384-pixel square, stripped of source metadata, and encrypted at rest. The authenticated profile response supplies the saved photo for the account avatar.

For existing databases, build the server and run `node server/scripts/migrate-user-details.mjs` before starting the updated API. The migration is safe to rerun and adds `users.user_details` and `users.profile_photo`; fresh databases use `database/schema.sql`. The equivalent SQL is `database/migrations/003_user_details.sql`.

### Market prices
The Market footer tab loads AGMARKNET reports for the saved farm district, device location (OpenStreetMap reverse geocoding), or a manually entered state and district. Set `DATA_GOV_IN_API_KEY` on the server using your data.gov.in API key. No sample prices are used when the feed is unavailable. Each report shows its source date, variety, mandi, minimum, maximum and modal price in INR/quintal. Government MSPs are a separately maintained Kharif 2026-27 schedule sourced from PIB (13 May 2026); update `common/market.js` when a new schedule is announced. Paddy MSP must not be compared directly with milled rice; mirchi has no central MSP in this schedule.
