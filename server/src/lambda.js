import serverless from "serverless-http";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

// Load secrets before importing modules that validate configuration or create clients.
let application;
let secrets;
async function loadSecrets() {
  if (process.env.APP_SECRET_ARN) {
    const client = new SecretsManagerClient({});
    try {
      const result = await client.send(
        new GetSecretValueCommand({ SecretId: process.env.APP_SECRET_ARN }),
      );
      const secret = JSON.parse(result.SecretString);
      for (const key of [
        "DB_HOST",
        "DB_PORT",
        "DB_NAME",
        "DB_USER",
        "DB_PASSWORD",
        "DB_SSL_CA",
        "OPENAI_API_KEY",
        "JWT_ACCESS_SECRET",
        "JWT_REFRESH_SECRET",
        "UPLOAD_ENCRYPTION_KEY",
        "DATA_GOV_IN_API_KEY",
      ]) {
        if (secret[key] !== undefined) process.env[key] = String(secret[key]);
      }
    } finally {
      client.destroy();
    }
  }
}
async function initialize() {
  secrets ??= loadSecrets().catch((error) => { secrets = undefined; throw error; });
  await secrets;
  const { createApplication } = await import("./app.js");
  const app = await createApplication();
  return serverless(app.getHttpAdapter().getInstance(), {
    binary: ["image/jpeg", "image/png"],
  });
}

export async function handler(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;
  // Schedule events have no HTTP request context. A caller of the Function URL
  // cannot choose this path by placing a job name in their JSON request body.
  if (!event.requestContext && event.job === "market-import") {
    secrets ??= loadSecrets().catch((error) => { secrets = undefined; throw error; });
    await secrets;
    const { db } = await import("./db.js");
    const { runMarketImport } = await import("./market/import.js");
    const milliseconds = Math.max(1000, (context.getRemainingTimeInMillis?.() ?? 120000) - 15000);
    const result = await runMarketImport(db, { signal: AbortSignal.timeout(milliseconds) });
    console.log("Market import", result);
    return result;
  }
  application ??= initialize().catch((error) => {
    application = undefined;
    throw error;
  });
  const response = await (await application)(event, context);
  // Express can emit a single Set-Cookie as a string. Normalize it to the
  // Function URL v2 cookie array, just like the adapter does for multiple cookies.
  if (event.version === "2.0" && response.headers?.["set-cookie"]) {
    response.cookies = [
      ...(response.cookies || []),
      response.headers["set-cookie"],
    ];
    delete response.headers["set-cookie"];
  }
  return response;
}
