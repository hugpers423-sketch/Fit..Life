const test = require("node:test");
const assert = require("node:assert");
const { hashPassword, verifyPassword, newToken, isEmail } = require("./auth");

test("hashPassword + verifyPassword: roundtrip correcto", () => {
  const h = hashPassword("clave12345");
  assert.ok(h.startsWith("scrypt$"));
  assert.strictEqual(verifyPassword("clave12345", h), true);
  assert.strictEqual(verifyPassword("otraClave", h), false);
});

test("verifyPassword rechaza hashes inválidos", () => {
  assert.strictEqual(verifyPassword("x", null), false);
  assert.strictEqual(verifyPassword("x", ""), false);
  assert.strictEqual(verifyPassword("x", "hash:viejo"), false);
  assert.strictEqual(verifyPassword("x", "scrypt$0$0$0$AAAA$BBBB"), false);
});

test("hashes generados son distintos aunque la contraseña sea la misma (sal aleatoria)", () => {
  const a = hashPassword("misma");
  const b = hashPassword("misma");
  assert.notStrictEqual(a, b);
  assert.strictEqual(verifyPassword("misma", a), true);
  assert.strictEqual(verifyPassword("misma", b), true);
});

test("newToken genera tokens opacos únicos con prefijo", () => {
  const t1 = newToken("nf_");
  const t2 = newToken("nf_");
  assert.ok(t1.startsWith("nf_"));
  assert.notStrictEqual(t1, t2);
  assert.ok(t1.length > 30);
});

test("isEmail valida correos simples", () => {
  assert.strictEqual(isEmail("a@b.com"), true);
  assert.strictEqual(isEmail("no-email"), false);
  assert.strictEqual(isEmail(""), false);
});