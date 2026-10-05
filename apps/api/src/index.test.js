const test = require("node:test");
const assert = require("node:assert");
test("la API exporta una app express", () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://x:x@localhost:5432/x";
  const app = require("./index.js");
  assert.strictEqual(typeof app.listen, "function");
});
