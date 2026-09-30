import { createApplication } from "./app.js";
import { env } from "./config.js";
async function bootstrap() {
  const app = await createApplication();
  app.enableShutdownHooks();
  await app.listen(env.PORT);
  console.log(`Leaf Care API listening on ${env.PORT}`);
}
bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
