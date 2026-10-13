import { db } from "../dist/db.js";
import { runMarketImport } from "../dist/market/import.js";
try { console.log(JSON.stringify(await runMarketImport(db))); }
catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await db.end(); }
