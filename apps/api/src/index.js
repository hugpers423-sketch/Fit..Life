const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || false }));
app.use(express.json({ limit: "100kb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Solo se aceptan campos permitidos: nunca se copia req.body completo
// (evita que un cliente se asigne role ADMIN).
app.post("/api/users", async (req, res) => {
  const { email, name } = req.body || {};
  if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "email y name son obligatorios" });
  }
  try {
    const user = await prisma.user.create({ data: { email: email.toLowerCase(), name: name.trim() } });
    res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    res.status(error.code === "P2002" ? 409 : 500).json({ error: "No se pudo crear el usuario" });
  }
});

if (require.main === module) app.listen(PORT, () => console.log(`API on ${PORT}`));
module.exports = app;
