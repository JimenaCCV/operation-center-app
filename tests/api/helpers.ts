import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../../src/app";
import { connectDb, disconnectDb } from "../../src/config/db";
import { env } from "../../src/config/env";
import { User } from "../../src/models/user.model";

export const app = createApp();

/** Conecta a la base de pruebas (MONGODB_TEST_URI) y la deja vacía. */
export async function setupDb() {
  await connectDb(env.MONGODB_URI);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}

export async function teardownDb() {
  await mongoose.connection.dropDatabase();
  await disconnectDb();
}

let counter = 0;
export const uniqueEmail = (prefix = "user") => `${prefix}${Date.now()}${counter++}@example.com`;

/** Registra un usuario normal, inicia sesión y devuelve su token. */
export async function registerAndLogin(name = "Ana Prueba") {
  const email = uniqueEmail();
  const password = "contrasena-segura-1";
  await request(app).post("/api/auth/register").send({ name, email, password }).expect(201);
  const res = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return { token: res.body.token as string, email, password, userId: res.body.user.id as string };
}

/** Crea un administrador directamente en la base (el registro público nunca da rol admin). */
export async function createAdminAndLogin() {
  const email = uniqueEmail("admin");
  const password = "admin-contrasena-1";
  await User.create({ name: "Admin", email, passwordHash: await bcrypt.hash(password, 4), role: "admin" });
  const res = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return res.body.token as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
