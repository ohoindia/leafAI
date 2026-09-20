import serverless from "serverless-http";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

// Load secrets before importing modules that validate configuration or create clients.
let application;
async function initialize() {
  if (process.env.APP_SECRET_ARN) {
    const client = new SecretsManagerClient({});
    try {
      const result = await client.send(new GetSecretValueCommand({ SecretId: process.env.APP_SECRET_ARN }));
      const secret = JSON.parse(result.SecretString);
      for (const key of ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "DB_SSL_CA", "OPENAI_API_KEY", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "UPLOAD_ENCRYPTION_KEY"]) {
        if (secret[key] !== undefined) process.env[key] = String(secret[key]);
      }
    } finally {
      client.destroy();
    }
  }
  const { default: app } = await import("./app.js");
  return serverless(app);
}

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;
  application ??= initialize().catch((error) => {
    application = undefined;
    throw error;
  });
  return (await application)(event, context);
}
