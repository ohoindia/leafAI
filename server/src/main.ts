import { createApplication } from "./app.js";
import { env } from "./config.js";
import { db } from "./db.js";
import { runMarketImport } from "./market/import.js";
import { startMarketScheduler } from "./market/scheduler.js";
async function bootstrap() {
  const app = await createApplication();
  app.enableShutdownHooks();
  await app.listen(env.PORT);
  if (process.env.MARKET_SCHEDULER_ENABLED === "true") startMarketScheduler(() => runMarketImport(db));
  console.log(`Leaf Care API listening on ${env.PORT}`);
}
bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
