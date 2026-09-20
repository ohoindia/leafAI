# AWS deployment

The website runs in Amplify Hosting. Its relative `/api` requests are forwarded by an Amplify HTTPS rewrite to a Lambda Function URL. Express retains responsibility for JWT authentication and origin checks. The refresh cookie stays `HttpOnly`, `Secure`, and `SameSite=Strict` on the website origin. Do not point browser requests directly at the Function URL; that would turn the refresh cookie into a cross-site cookie.

The SAM stack creates the Node.js 22 Lambda, public Function URL and both required invoke permissions, private S3 bucket, execution role, and 30-day CloudWatch log group. It uses an existing private MySQL 8 database, VPC subnets, security groups, and Secrets Manager secret. It does not create those prerequisites or an Amplify app. Local `npm run dev` and the existing Docker deployment still use the standalone Express server and local upload storage.

## 1. Prepare the database and network

Choose an AWS region. Provision MySQL 8 on RDS (or a compatible existing database) and import `database/schema.sql` from a machine that can reach it. Create a least-privilege application user with SELECT, INSERT, UPDATE, and DELETE on `leaf_ai.*`; run schema setup with a separate administrative user. This application does not run migrations at startup.

Choose private subnets with a NAT gateway and working DNS. Lambda needs outbound HTTPS to OpenAI, Secrets Manager, and S3; placing Lambda in a public subnet does not give it internet access. Allow the Lambda security group to connect to the database security group on port 3306. RDS Proxy is optional; use its endpoint as `DB_HOST` if configured. The default deployment permits ten concurrent Lambda invocations and two pooled connections per execution environment; size database capacity accordingly.

Download the appropriate RDS CA bundle from the [AWS RDS certificate documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html). Supply its full PEM contents as `DB_SSL_CA`; certificate verification remains enabled.

## 2. Store backend secrets

Copy `deploy/backend-secret.example.json` to `deploy/backend.secret.json` (ignored by Git), replace all placeholders, and JSON-escape PEM newlines as `\n`. Use a distinct random value for each JWT secret and a 32-byte random key encoded as 64 hex characters for `UPLOAD_ENCRYPTION_KEY`. Preserve that encryption key to retain access to existing uploads.

Create the secret using the default Secrets Manager encryption key:

```powershell
aws secretsmanager create-secret --region YOUR_REGION --name leafcare/backend --secret-string file://deploy/backend.secret.json
```

Record the resulting ARN. A customer-managed KMS key additionally requires a scoped `kms:Decrypt` permission on the Lambda execution role and a compatible key policy. Secrets are fetched once per execution environment before the app initializes. After rotating a secret, recycle execution environments by deploying a Lambda configuration/code update. Coordinate signing/encryption-key rotations with existing sessions and stored files.

## 3. Create Amplify Hosting

Connect this repository and your intended branch in the Amplify console. Use the repository root as the app root, select the Amazon Linux 2023 build image with Node.js 22 available, and use the committed `amplify.yml`. The configuration installs the client from its lockfile and publishes `client/dist`. Do not enable Amplify's monorepo app-root setting for this root-level configuration.

Record the actual branch HTTPS origin (for example, `https://main.APP_ID.amplifyapp.com`). Backend secrets must never be placed in Amplify or in `VITE_*` variables. The frontend requires no environment variables. Set up the API rewrite after deploying Lambda; until then the website's API calls will not work.

## 4. Package and deploy Lambda

Install AWS CLI, a current AWS SAM CLI, and Docker; authenticate to the intended AWS account. From the repository root, run the following when you are ready to build and deploy:

```powershell
sam validate --lint --template-file template.yaml
sam build --use-container --template-file template.yaml
sam deploy --guided
```

The container build is necessary for the Linux x86_64 native `sharp` and `argon2` dependencies, especially when deploying from Windows or macOS. Do not zip a Windows `node_modules` directory into Lambda. These commands are deployment instructions; no build needs to be run just to review the source changes.

In the guided deployment, choose a stack name such as `leafcare-api`, your region, and provide the secret ARN, Amplify origin without a trailing slash, private subnet IDs, Lambda security group IDs, and an OpenAI vision model ID available to your project. Approve the IAM capability and the public Function URL as appropriate. `AuthType: NONE` permits public HTTP access; protected application routes still require the application's JWT. Save the guided configuration locally; `samconfig.toml` is ignored.

For later backend updates, run `sam build --use-container` followed by `sam deploy`. Push frontend updates to the connected branch to trigger Amplify deployment. A build is required to publish new frontend assets and package native Lambda dependencies, even though it is not required for the source-editing checks.

## 5. Connect the website to the API

Copy the stack's `ApiUrl` output. In Amplify **Hosting → Rewrites and redirects**, paste the rules from `deploy/amplify-rewrites.json` and replace the placeholder hostname with the actual Lambda URL hostname. Keep `/api/<*>` → `https://FUNCTION_HOST/api/<*>` as a **200 rewrite**, first in the list, before the SPA rule. The repository JSON file is an example for the console; Amplify does not automatically import it.

Do not cache `/api` responses. The backend sets `Cache-Control: no-store, private` for every API response, including errors and authentication responses. Add custom website domains and additional branches to the stack's comma-separated `AllowedOrigins` parameter before using them; redeploy the backend configuration. All branches of an Amplify app share its rewrite rules, so use separate apps/stacks for isolated environments.

The default `TRUST_PROXY=0` avoids trusting spoofable forwarded addresses on the publicly reachable Function URL. Through Amplify, audit IPs and rate-limit keys may represent the proxy. In-memory rate limits apply separately in each Lambda execution environment, not across the deployment. Configure a managed edge rate limit/WAF or a shared rate-limit store before relying on a global abuse limit; do not simply trust all forwarded headers.

## 6. Verify after deployment

- Open `https://YOUR_AMPLIFY_HOST/api/health`; expect JSON `{"status":"ok"}` and a `no-store` cache header. This checks database connectivity and TLS too.
- Register and log in from the website. Verify the secure refresh cookie, refresh endpoint, authenticated history, and logout in the browser. Confirm there are no redirects to the Lambda domain and that two different accounts never see each other's cached responses.
- Upload a JPEG, PNG, or WebP smaller than 4 MiB. Confirm analysis completion, history persistence, and a private encrypted `.bin` object in the output S3 bucket. Files over 4 MiB are rejected before upload and by the backend; this leaves room for base64 expansion and multipart/event metadata within Lambda's 6 MB synchronous request limit.
- Exercise a real analysis through Amplify and observe its latency. Lambda is configured for 120 seconds, but the hosting proxy can time out sooner. If model latency exceeds the hosting request window, move analysis to a queued job and poll its status before releasing that workload; increasing Lambda's timeout alone cannot extend the proxy timeout.
- Review CloudWatch logs for failures and confirm native modules load in the deployed Linux runtime. Local tests do not replace this cloud smoke test.

S3 uploads survive Lambda restarts and are retained if the stack is deleted; deleting a stack does not delete retained uploads or the existing database/secret. Set retention and backup policies appropriate to your data. Existing local uploads are not migrated automatically.

References: [Amplify reverse-proxy rewrites](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html), [Lambda URL permissions](https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html), [Lambda request limits](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html).
