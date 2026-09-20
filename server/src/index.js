import app from "./app.js";
import { env } from "./config.js";

app.listen(env.PORT, () =>
  console.log(`Leaf Care API listening on ${env.PORT}`),
);
