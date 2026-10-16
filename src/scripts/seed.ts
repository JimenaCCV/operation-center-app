import bcrypt from "bcryptjs";
import { connectDb, disconnectDb } from "../config/db";
import { env } from "../config/env";
import { User } from "../models/user.model";

/** Crea (o actualiza el rol de) un administrador con ADMIN_EMAIL / ADMIN_PASSWORD de tu .env. */
async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = process.env.ADMIN_NAME ?? "Administrador";
  if (!email || password.length < 8) {
    throw new Error("Define ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 8 caracteres) en tu .env");
  }

  await connectDb(env.MONGODB_URI);
  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = "admin";
    await existing.save();
    console.log(`Usuario ${email} ya existía: ahora es admin.`);
  } else {
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    await User.create({ name, email, passwordHash, role: "admin" });
    console.log(`Administrador creado: ${email}`);
  }
  await disconnectDb();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
