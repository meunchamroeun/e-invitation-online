import { openDb } from "./db";
const { migrate, close } = await openDb();
await migrate();
await close();
console.log("✓ migrations applied");
