# Deploy the backend directly to AWS Lambda

For new deployments without manual ZIP uploads, use the [OHO-style SAM guide](../server/DEPLOYMENT.md). GitHub Actions can be added later. This page is the legacy manual ZIP alternative; use SAM to update SAM-managed functions.

This workflow uses a ZIP, Lambda environment variables, and a Function URL. It uses your existing AWS database. No Docker, SAM, Amplify, or database creation is required.

## Initial deployment checklist

Run commands from the repository root in PowerShell, one at a time, and stop on any failure. Install Node.js **22.19 or later** and AWS CLI, authenticate, and verify the account with `aws sts get-caller-identity`. Replace `YOUR_REGION` with your region (for example `ap-south-1`) and `leafcare-api` with your function name if different.

Complete these steps once, in order:

1. Prepare the existing database schema, private upload bucket, networking, and `server/.env` using section 1. For an older LeafCare database, apply the [additive migration](#before-deploying-the-current-server-to-an-existing-database); do not re-import the full schema over production data.
2. Install dependencies, run `npm --prefix server test`, and build `server/lambda.zip` using section 2.
3. Create the Lambda with the settings and permissions in section 3, then upload the ZIP.
4. Create the Function URL, add its origin to `ALLOWED_ORIGINS`, export and apply the environment, and wait using section 4.
5. Verify health, sign-in, history, a new analysis, and saved-photo retrieval using section 5. Connect mobile if needed. For the website, use the [Amplify setup and API rewrite](aws-deployment.md#3-create-amplify-hosting).
6. Record the account, region, function name, Function URL, upload bucket, and website origin. Keep the working ZIP and configuration securely for rollback; do not commit secrets.

## Which steps to repeat after changes

| What changed                                              | How to publish it                                                                                                                                     |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend code or dependencies                              | Test, rebuild the ZIP, upload to the existing Lambda, wait, and verify. See [code updates](#deploy-code-or-dependency-changes).                       |
| Backend environment, model, database endpoint, or origins | Export and apply the full environment map, wait, and verify. See [configuration updates](#deploy-environment-only-changes).                           |
| Database schema                                           | Back up and apply the migration before code that requires it. ZIP uploads do not apply SQL migrations.                                                |
| Website files in `client/`                                | Publish through Amplify. Lambda updates do not publish website changes. See [website updates](aws-deployment.md#update-the-website).                  |
| Mobile files or `EXPO_PUBLIC_API_URL`                     | Follow the [mobile build guide](../mobile/README.md) and distribute an updated build as appropriate. Lambda updates do not replace the installed app. |
| SAM template or SAM-managed backend                       | Use the [SAM update steps](aws-deployment.md#update-a-sam-managed-backend) with the same stack.                                                       |

For changes affecting multiple components, perform every applicable row. Git pushes do not deploy a manually uploaded Lambda.

## 1. Prepare server/.env

The local environment file is now `server/.env`. Existing values were preserved when it was moved. For a new checkout, copy `server/.env.example` to `server/.env` and fill it in. Lambda does not automatically import an uploaded `.env` file: settings must be added to **Configuration > Environment variables** or uploaded with the export command below.

Use your existing AWS database endpoint and credentials for `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. The existing database must already have this application's schema. Set `DB_SSL=true` and supply the appropriate trusted PEM CA as `DB_SSL_CA` if your database requires TLS. Dotenv supports quoted multiline PEM values. Lambda's environment variables have a combined 4 KB limit; the export command checks this limit.

Keep your existing `OPENAI_API_KEY`, model setting, JWT secrets, and upload encryption key. Set `UPLOAD_BUCKET` to a private S3 bucket for durable encrypted leaf uploads. This is required by the app in Lambda; `/tmp` is not permanent storage. Set `ALLOWED_ORIGINS` to the browser origins you use, separated by commas without trailing slashes. After creating the Function URL, include its origin so Swagger can execute requests.

## 2. Build the ZIP on Windows

From the repository root, with Node.js 22 and npm installed:

```powershell
npm --prefix server ci
npm --prefix server run lambda:package
```

The result is `server/lambda.zip`. The packaging script compiles TypeScript, installs fresh Linux x64/glibc production dependencies into a separate staging directory, checks the native sharp/libvips and Argon2 binaries, and archives `dist/`, `node_modules/`, and `package.json` at the ZIP root. It excludes `.env` and exported secrets. It does not copy the Windows development `node_modules` directory. Match the Lambda architecture to **x86_64**.

## 3. Create or update the Lambda function

In the AWS Lambda console, choose **Create function > Author from scratch**:

| Setting                                             | Value                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Function name                                       | `leafcare-api` (or your chosen name)                                           |
| Runtime                                             | Node.js 22.x                                                                   |
| Architecture                                        | x86_64                                                                         |
| Execution role                                      | Role with CloudWatch Logs access and permission to write to your upload bucket |
| Handler, under Code > Runtime settings              | `dist/lambda.handler`                                                          |
| Memory, under Configuration > General configuration | 1024 MB                                                                        |
| Timeout                                             | 120 seconds                                                                    |

Under **Code > Upload from > .zip file**, upload `server/lambda.zip`. If it exceeds the console's direct-upload limit, upload the ZIP to a private S3 bucket in the function's region and choose **Amazon S3 location** instead. The uncompressed package must fit Lambda's 250 MB deployment limit.

The execution role needs both `s3:PutObject` and `s3:GetObject` on `arn:aws:s3:::YOUR_UPLOAD_BUCKET/*`. Writing stores new uploads; reading lets authenticated owners retrieve saved photos. Keep the upload bucket private. If its encryption uses a customer-managed KMS key, grant the corresponding KMS permissions as well.

For a private database, connect Lambda to your existing VPC, private subnets, and security group under **Configuration > VPC**. The execution role needs VPC network-interface permissions. Allow the Lambda security group to reach the existing database on its MySQL port. Those subnets also need outbound HTTPS access to OpenAI and S3, typically through your existing NAT route. A public subnet alone does not provide internet access to Lambda. No new database is needed.

## 4. Create the URL and configure environment variables

Open **Configuration > Function URL > Create function URL**. Choose **Auth type: NONE**, buffered invocation, and save. The app's protected endpoints still validate JWT bearer tokens. Creating the URL through the console adds the public invocation policy; it needs both `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction`. Leave Function URL CORS settings unset because the NestJS app handles CORS.

Copy the resulting URL, for example `https://YOUR_ID.lambda-url.YOUR_REGION.on.aws/`. Add that origin, without the final slash, to `ALLOWED_ORIGINS` in `server/.env` along with your website origins.

You can copy the settings into **Configuration > Environment variables > Edit** manually. Include these Lambda-specific values:

```text
NODE_ENV=production
DB_CONNECTION_LIMIT=2
MAX_UPLOAD_BYTES=4194304
TRUST_PROXY=0
UPLOAD_BUCKET=your-private-upload-bucket
```

Alternatively, install/configure AWS CLI for your account and export the supported settings from `server/.env`:

```powershell
npm --prefix server run lambda:env
aws lambda update-function-configuration --function-name leafcare-api --region YOUR_REGION --environment file://server/lambda-environment.json --query FunctionName --output text
aws lambda wait function-updated --function-name leafcare-api --region YOUR_REGION
```

The export sets the production values above automatically. `server/lambda-environment.json` contains secrets and is ignored by Git. Do not include it in the ZIP. The AWS command replaces the complete environment-variable map, so preserve any additional variables if updating a function with other settings. Do not set `APP_SECRET_ARN` for this direct-environment workflow; that setting selects the older optional Secrets Manager startup path.

## 5. Verify and connect mobile

Open your Function URL with these paths:

- `/api/health`: checks the existing database connection.
- `/api/docs`: Swagger UI. Register/login, copy `accessToken`, and paste only the token into **Authorize**.
- `/api/docs-json`: OpenAPI schema.

The bare URL `/` is not an API route and will return `Not found`. Verify an authenticated history request and one real leaf upload; this checks native modules, database access, OpenAI access, and S3 permissions in AWS. A locally built ZIP has not been runtime-tested on Lambda until these checks succeed.

In `mobile/.env`, set the Function URL without `/api` or a trailing slash:

```env
EXPO_PUBLIC_API_URL=https://YOUR_ID.lambda-url.YOUR_REGION.on.aws
```

Restart Expo with `npx expo start --clear` (or add `--tunnel`). The phone can then use the deployed API without reaching your PC's backend. Browser website sessions should retain the existing same-origin `/api` proxy design for refresh cookies; the native app uses bearer tokens directly.

## Later updates

Local server edits and Git pushes do not automatically update a directly uploaded Lambda function. Rebuild and upload the ZIP for every backend code or dependency change. Keep the previous working ZIP and a secure record of its configuration so you can restore it if a release fails. Use the same deployment method that created the function: for a SAM-managed function, use the [SAM update workflow](aws-deployment.md#4-package-and-deploy-lambda) instead of manual ZIP updates.

### Before deploying the current server to an existing database

The current server stores optional plant name and location and supports retrieving saved photos. Existing databases need the additive migration below before the updated code receives traffic. Back up the database, then run from the repository root on a machine with access to the production database. Configure `server/.env` for that database and use a migration credential with `ALTER` permission; the normal application user does not need that permission.

```powershell
npm --prefix server ci
npm --prefix server run build
node server/scripts/migrate-analysis-context.mjs
```

Stop if any command fails. The script adds `provided_plant_name` and `plant_location` to `leaf_analyses`, preserves existing rows, and is safe to rerun. New databases initialized with the current `database/schema.sql` already have these columns. The equivalent SQL is `database/migrations/001_analysis_context.sql`. Confirm the Lambda role has both S3 permissions above, and preserve the existing `UPLOAD_BUCKET` and `UPLOAD_ENCRYPTION_KEY` so saved photos remain accessible. Local files are not automatically copied into S3.

### Deploy code or dependency changes

From the repository root, rebuild and upload to the same function:

1. Securely save the previous working ZIP and configuration before rebuilding. Confirm the account with `aws sts get-caller-identity` and apply required migrations first.
2. Run the following commands **one at a time**. Stop on any failure; PowerShell can otherwise continue to upload an older ZIP after a failed build.

```powershell
npm --prefix server ci
npm --prefix server test
npm --prefix server run lambda:package
aws lambda update-function-code --function-name leafcare-api --region YOUR_REGION --zip-file fileb://server/lambda.zip --query '{Function:FunctionName,Status:LastUpdateStatus}' --output json
aws lambda wait function-updated --function-name leafcare-api --region YOUR_REGION
```

Stop if a build or test fails. Its URL and environment settings stay the same. Alternatively upload the rebuilt ZIP through the existing function's console page. For environment-only changes, edit `server/.env`, regenerate the environment JSON, and apply it using the configuration command above; a ZIP rebuild is not required. Check `/api/health` after deployment and **Monitor > View CloudWatch logs** for startup or request errors.

For a ZIP larger than 50 MB, upload it to a private deployment-artifact bucket in the function's region, then update from S3 (replace all placeholders):

```powershell
aws s3 cp server/lambda.zip s3://YOUR_ARTIFACT_BUCKET/releases/leafcare-api.zip --region YOUR_REGION
aws lambda update-function-code --function-name leafcare-api --region YOUR_REGION --s3-bucket YOUR_ARTIFACT_BUCKET --s3-key releases/leafcare-api.zip --query '{Function:FunctionName,Status:LastUpdateStatus}' --output json
aws lambda wait function-updated --function-name leafcare-api --region YOUR_REGION
```

After uploading, apply any changed environment settings using the next section, then [confirm the deployed ZIP and test the application](#confirm-the-function-was-updated). Record the release date and source commit, if available, alongside the working artifact.

### Deploy environment-only changes

Edit `server/.env`, then run each command from the repository root. Stop on any failure:

```powershell
npm --prefix server run lambda:env
aws lambda update-function-configuration --function-name leafcare-api --region YOUR_REGION --environment file://server/lambda-environment.json --query FunctionName --output text
aws lambda wait function-updated --function-name leafcare-api --region YOUR_REGION
```

The exporter supports the keys in `server/scripts/export-lambda-env.mjs` and supplies fixed Lambda defaults; it does not copy arbitrary `.env` keys. Add additional required variables to the exported `Variables` map before applying it, because AWS replaces the entire map. Preserve the upload bucket and encryption key for existing photos. Verify health and a signed-in request. If both code and configuration changed, wait for each AWS update to finish before starting the next.

### Confirm the function was updated

After the wait succeeds, inspect deployment metadata without printing environment secrets:

```powershell
aws lambda get-function-configuration --function-name leafcare-api --region YOUR_REGION --query '{Function:FunctionName,Modified:LastModified,State:State,Update:LastUpdateStatus,Reason:LastUpdateStatusReason,Runtime:Runtime,Architecture:Architectures,Handler:Handler,CodeSha256:CodeSha256}' --output json
```

Expect `State` to be `Active`, `Update` to be `Successful`, and the modification timestamp to match your deployment. To verify the exact ZIP, compare `CodeSha256` with this local base64 SHA-256 value:

```powershell
$zipPath = (Resolve-Path -LiteralPath 'server/lambda.zip').Path
$zipHasher = [System.Security.Cryptography.SHA256]::Create()
try {
  [Convert]::ToBase64String($zipHasher.ComputeHash([System.IO.File]::ReadAllBytes($zipPath)))
} finally {
  $zipHasher.Dispose()
}
```

A successful upload alone does not prove the application works. Check `/api/health`, login, authenticated history, one new analysis with plant name/location, and reopening its saved photo. Review CloudWatch logs if any check fails. These commands update `$LATEST`; if your Function URL targets an alias, publish a version and move that alias to the verified version before expecting the URL to serve the new code.

If the new release fails, upload your previous working ZIP to the same function, wait for completion, and repeat the checks. Restore configuration separately if it changed. The additive columns can remain when rolling back code; restoring a ZIP does not undo database migrations.

References: [AWS Node.js ZIP deployments](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-package.html), [Update function code](https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-code.html), [Inspect deployment metadata](https://docs.aws.amazon.com/cli/latest/reference/lambda/get-function-configuration.html), [Lambda environment variables](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html), [Function URLs](https://docs.aws.amazon.com/lambda/latest/dg/urls-configuration.html), [VPC internet access](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html), [sharp Linux prebuilds](https://sharp.pixelplumbing.com/install/).
