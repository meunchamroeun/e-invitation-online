// Creates .env.local with a strong random APP_SECRET on first run (never overwrites an existing one).
import fs from "node:fs";
import crypto from "node:crypto";
const file = ".env.local";
let text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
if (!/^APP_SECRET=.{16,}/m.test(text)) {
  text = text.replace(/^APP_SECRET=.*$/m, "").trimEnd();
  text += `${text ? "\n" : ""}APP_SECRET=${crypto.randomBytes(32).toString("base64")}\n`;
  if (!/^APP_URL=/m.test(text)) text += "APP_URL=http://localhost:3000\n";
  fs.writeFileSync(file, text);
  console.log("✓ wrote .env.local with a new APP_SECRET (keep it secret; changing it invalidates copyable guest links)");
} else console.log("✓ .env.local already has APP_SECRET");
