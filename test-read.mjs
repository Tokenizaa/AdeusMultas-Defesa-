import fs from "fs";
fs.writeFileSync("/tmp/test-read.log", "STEP A\n");
const content = fs.readFileSync("./src/server/config/pricing.ts", "utf8");
fs.writeFileSync("/tmp/test-read.log", "STEP B - content length: " + content.length + "\n", { flag: "a" });
console.log("File read OK");
