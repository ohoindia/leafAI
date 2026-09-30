# Deploy the backend directly to AWS Lambda

This workflow uses a ZIP, Lambda environment variables, and a Function URL. It uses your existing AWS database. No Docker, SAM, Amplify, or database creation is required.

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

| Setting | Value |
| --- | --- |
| Function name | `leafcare-api` (or your chosen name) |
| Runtime | Node.js 22.x |
| Architecture | x86_64 |
| Execution role | Role with CloudWatch Logs access and permission to write to your upload bucket |
| Handler, under Code > Runtime settings | `dist/lambda.handler` |
| Memory, under Configuration > General configuration | 1024 MB |
| Timeout | 120 seconds |

Under **Code > Upload from > .zip file**, upload `server/lambda.zip`. If it exceeds the console's direct-upload limit, upload the ZIP to a private S3 bucket in the function's region and choose **Amazon S3 location** instead. The uncompressed package must fit Lambda's 250 MB deployment limit.

The execution role needs `s3:PutObject` on `arn:aws:s3:::YOUR_UPLOAD_BUCKET/*`. Keep the upload bucket private. If its encryption uses a customer-managed KMS key, grant the corresponding KMS permissions as well.

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

Run `npm --prefix server run lambda:package` and upload the new ZIP to the same function. Its URL stays the same. For environment changes, edit `server/.env`, regenerate the environment JSON, and apply it using the command above. Check **Monitor > View CloudWatch logs** for startup or request errors.

References: [AWS Node.js ZIP deployments](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-package.html), [Lambda environment variables](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html), [Function URLs](https://docs.aws.amazon.com/lambda/latest/dg/urls-configuration.html), [VPC internet access](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html), [sharp Linux prebuilds](https://sharp.pixelplumbing.com/install/).
