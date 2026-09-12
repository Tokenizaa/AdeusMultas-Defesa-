import fs from "fs";
fs.writeFileSync("/tmp/test-bare-dynamic.log", "STEP A\n");
const { PRICING } = await import("./src/server/config/pricing.ts");
fs.writeFileSync("/tmp/test-bare-dynamic.log", "STEP B\n", { flag: "a" });
console.log("PRICING:", PRICING);
