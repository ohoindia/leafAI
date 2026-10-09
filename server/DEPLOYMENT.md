# AWS Lambda deployment and redeployment

Use the same deployment sequence as OHO Customer App: install, test, `npm run package:lambda`, validate, and `sam deploy`. SAM packages and uploads the artifact automatically. No manual ZIP upload, Docker, or separate `sam build` is needed. GitHub Actions can be added later; no backend workflow is enabled now.

Run commands **from the `server` folder** in PowerShell, one at a time, and stop on any failure. This guide uses region `ap-south-1` and stack `leafcare-api-dev`. Use a separate stack/configuration for production.

`server/template.yaml` creates the Lambda, execution role, Function URL, invocation permissions, log group, and private photo bucket (or grants access to an existing bucket). Like OHO, application settings are maintained directly in Lambda environment variables; Secrets Manager is not required. LeafAI retains its Function URL rather than OHO's API Gateway HTTP API so its existing analysis/upload and website integration stay compatible. This deployment does not create or migrate your MySQL database.

## 1. Prerequisites and AWS account

Install Node.js **22.19 or later**, npm, AWS CLI v2, and AWS SAM CLI. Your AWS identity needs permission to deploy CloudFormation, Lambda, IAM roles, S3 artifacts/buckets, and logs, and edit Lambda environment variables.

```powershell
Set-Location C:\Users\KarunVattikuti\Downloads\LeafAI\server
node --version
npm --version
aws --version
sam --version
aws sts get-caller-identity
```

Use your existing authenticated AWS profile. If using SSO, run `aws sso login --profile YOUR_PROFILE` and set `$env:AWS_PROFILE = 'YOUR_PROFILE'` before the identity check. Keep the same profile and region for every command.

## 2. Prepare database and application settings

Use the existing MySQL database. For a new empty application database, import `../database/schema.sql` from a machine that can reach it. For an older LeafCare database, back it up and apply the additive migration using a credential with ALTER permission:

```powershell
npm ci
npm run build
node scripts/migrate-analysis-context.mjs
```

The migration reads `server/.env`, preserves existing rows, and is safe to rerun. Do not import the full schema over production data. The normal application user needs SELECT, INSERT, UPDATE, and DELETE, not schema-administration permissions.

After deployment in step 5, set these in **Lambda → Configuration → Environment variables** using the returned function name. Keep your existing secret values if already configured:

```dotenv
NODE_ENV=production
DB_HOST=your-existing-mysql-host
DB_PORT=3306
DB_NAME=leaf_ai
DB_USER=your-application-user
DB_PASSWORD=your-database-password
DB_CONNECTION_LIMIT=2
DB_SSL=true
DB_SSL_CA=your-trusted-PEM-CA-contents
OPENAI_API_KEY=your-backend-api-key
OPENAI_VISION_MODEL=your-validated-vision-model
JWT_ACCESS_SECRET=your-distinct-secret-at-least-32-characters
JWT_REFRESH_SECRET=another-distinct-secret-at-least-32-characters
UPLOAD_ENCRYPTION_KEY=your-existing-64-hex-character-key
UPLOAD_BUCKET=the-UploadBucket-stack-output
ALLOWED_ORIGINS=https://your-website-origin,https://your-function-url-origin
MAX_UPLOAD_BYTES=4194304
TRUST_PROXY=0
```

Set `DB_SSL` for your database; `DB_SSL_CA` is required when it is `true`. Enter real PEM contents, not the example text. Lambda's total environment limit is 4 KB. Do not set `APP_SECRET_ARN` for this workflow. `server/.env` is local only and never included in the artifact. Preserve the encryption key and photo bucket so saved photos remain readable. LeafAI's application settings live in environment variables; it does not use OHO's `ConfigValues`/`ConfigSecrets` tables.

## 3. Database network and photo storage

For private MySQL, supply `VpcSubnetIds` and `VpcSecurityGroupIds` at deployment. Allow the Lambda security group to reach the database on its MySQL port. Private subnets need NAT/working DNS for outbound HTTPS to OpenAI; S3 also needs outbound access or an appropriate VPC endpoint. A public subnet alone does not give Lambda internet access.

If your database is intentionally reachable without a VPC, leave both VPC parameters empty and check its firewall. Default Lambda egress addresses are not fixed.

Set `ExistingUploadBucket` to your current private photo bucket to preserve saved uploads. Leave it empty for a new bucket. Existing buckets must permit access by the new Lambda role; customer-managed KMS encryption also needs suitable KMS permissions and key policy. The default concurrency is ten with two pooled DB connections per execution environment; size against database capacity.

## 4. Build and validate

```powershell
npm ci
npm test
npm run package:lambda
sam validate --lint --template-file template.yaml --region ap-south-1
```

Packaging compiles TypeScript, recreates `build/lambda/`, copies only compiled code and package manifests, and installs Linux x64/glibc production dependencies. It verifies the `sharp`, libvips, and Argon2 prebuilds and excludes `.env`, exported secrets, tests, and development dependencies. On Windows it checks the Linux files; the live smoke test checks that they actually load in Lambda. Never substitute Windows `node_modules` for these dependencies.

## 5. First deployment

```powershell
sam deploy --guided --template-file template.yaml --stack-name leafcare-api-dev --region ap-south-1 --capabilities CAPABILITY_IAM
```

During the prompts:

1. Supply private subnet/security group IDs, or press Enter at both empty defaults for non-VPC deployment. Do not type literal quotation marks.
2. Supply `ExistingUploadBucket` for existing photos, or leave empty to create a new private bucket. Review concurrency.
3. Allow IAM role creation and the public Function URL. Protected application routes still require JWT authentication.
4. Keep CloudFormation rollback enabled. Save settings to the Git-ignored `server/samconfig.toml` and review the changes before deploying.

Fetch the outputs:

```powershell
aws cloudformation describe-stacks --stack-name leafcare-api-dev --region ap-south-1 --query 'Stacks[0].Outputs' --output table
```

Use `FunctionName` to find the Lambda, then add **all settings from step 2**, including `UPLOAD_BUCKET` from the output and the Function URL origin without a trailing slash. The initial function cannot start the app until these settings are saved. Leave Function URL CORS settings unset; NestJS handles CORS.

This template creates a new function; it does not adopt a manually created Lambda. If one already exists, retain it until the new deployment is verified, then update clients to the new URL. For an existing stack created with the **repository-root** template, continue using that template and its [legacy guide](../docs/aws-deployment.md); switching templates/configuration ownership requires a separate migration. Never apply this new server template blindly to that old stack.

## 6. Verify and connect clients

Replace the example with `ApiBaseUrl` (no `/api` suffix):

```powershell
$leafApiBase = 'https://YOUR_ID.lambda-url.ap-south-1.on.aws'
Invoke-RestMethod -Uri "$leafApiBase/api/health"
```

Expect `{"status":"ok"}`; this checks database connectivity. Open `$leafApiBase/api/docs`, sign in, authorize with the returned token, request history, analyze a real leaf, and reopen its saved photo. These verify database access, Linux native modules, OpenAI, and private S3 reads/writes. The bare `/` is not an API route.

For the website, retain relative `/api` requests. Configure Amplify's 200 rewrite from `/api/<*>` to `https://FUNCTION_HOST/api/<*>` before the SPA rule using `../deploy/amplify-rewrites.json`. Include the website origin in Lambda's `ALLOWED_ORIGINS`. This keeps refresh cookies on the website origin. Hosting proxies can time out earlier than Lambda; validate real analysis latency through the website.

For mobile, set `EXPO_PUBLIC_API_URL` to the base URL in `mobile/.env` and restart Expo with cache cleared. Installed builds need the same setting in their build environment. See the [mobile guide](../mobile/README.md).

### Swagger UI and API testing

Swagger is included in the backend and served on Lambda. No separate Swagger deployment or environment flag is needed. The stack outputs `SwaggerUrl` and `OpenApiUrl` alongside the function and API URL.

| Environment | Swagger UI | OpenAPI JSON |
| --- | --- | --- |
| Local (default port) | `http://localhost:8080/api/docs` | `http://localhost:8080/api/docs-json` |
| Lambda | `https://YOUR_FUNCTION_HOST/api/docs` | `https://YOUR_FUNCTION_HOST/api/docs-json` |
| Amplify (after the API rewrite) | `https://YOUR_WEBSITE_HOST/api/docs` | `https://YOUR_WEBSITE_HOST/api/docs-json` |

For local use, configure `server/.env` and run `npm run dev` from `server`. On Lambda, complete step 5's environment setup first. Include the origin where you open Swagger in `ALLOWED_ORIGINS` without a trailing slash, and leave Function URL CORS settings unset.

1. Open `SwaggerUrl`. For a new account, execute **Authentication → POST /api/auth/register** with your name, email, password, and language. Skip registration if you already have an account.
2. Execute **POST /api/auth/login** with that email and password. Copy the `accessToken` from the response.
3. Click **Authorize**, paste only the token (without `Bearer` or quotation marks), click **Authorize**, and close the dialog. Do not enter your OpenAI key here.
4. Execute **GET /api/analyses** to verify authenticated history.
5. Execute **POST /api/analyses**: choose a JPEG, PNG, or WebP in the `leaf` file picker, set `consent=true`, and select `en`, `te`, or `hi`. Use an image at least 300 × 300 pixels and within 4 MiB. This sends a real analysis request and saves its result.
6. Use the returned ID with **GET /api/analyses/{id}** and the saved-photo endpoint to verify retrieval.

Access tokens expire after 15 minutes. Sign in again or execute **POST /api/auth/refresh** in the same browser/origin and authorize with the new token. Authorization is cleared on a page reload. For HTTP 401, check the token; for origin errors, check `ALLOWED_ORIGINS`; for Swagger 404, confirm you opened `/api/docs` and repackaged/redeployed the current server.

## 7. Redeploy after code or dependency changes

From `server`, using the same profile and saved `samconfig.toml`:

```powershell
npm ci
npm test
npm run package:lambda
sam validate --lint --template-file template.yaml --region ap-south-1
sam deploy --template-file template.yaml --config-env default --no-fail-on-empty-changeset
```

Repackage after every server change. Keep the same stack/region; the URL normally stays the same. If the configuration file is missing, repeat step 5 with the **existing** stack name and region. Verify environment settings and repeat step 6. Git pushes alone do not deploy this backend; GitHub Actions will be added later.

## 8. Configuration, database, and infrastructure changes

- **Environment/model/credentials/origins:** edit Lambda environment variables and save; no packaging needed. CLI environment updates replace the entire map, so retain all required values. Keep the encryption key for existing photos.
- **Schema:** back up and run the applicable migration before code requiring it. SAM does not apply SQL automatically.
- **Networking/concurrency/IAM/timeout:** edit `template.yaml` or guided parameters, repackage, validate, and deploy to the same stack. Check environment settings after infrastructure changes or function replacement. Keep the template's `Environment` property omitted for console-managed configuration.
- **Website/mobile:** build and publish the affected client separately. Backend deployment does not update installed mobile apps or website assets.

## 9. Logs and rollback

```powershell
sam logs --name Api --stack-name leafcare-api-dev --region ap-south-1 --tail
```

For startup errors, check required environment variables and `dist/lambda.handler`. For native-module errors, rerun packaging and verify the x86_64 architecture. For database/OpenAI timeouts, check VPC routes, security groups, DNS, and credentials. For saved-photo errors, check bucket permissions and the original encryption key.

To roll back a successful release, use an isolated checkout of the previous working revision, copy the ignored SAM configuration into its `server` folder, install, test, package, and deploy to the **same stack and region**. Review infrastructure changes before applying them. Restore environment settings separately; code rollback does not undo database changes. Retained photo buckets survive stack deletion.

Installing, testing, packaging, and validation do not create AWS resources. Only deployment commands perform the deployment.

References: [SAM deployment workflow](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-deploy.html), [sharp cross-platform installation](https://sharp.pixelplumbing.com/install/), [Lambda VPC internet access](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html).
