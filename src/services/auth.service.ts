import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User, type Role } from "../models/user.model";
import { HttpError } from "../utils/httpError";
import type { LoginInput, RegisterInput } from "../validators/schemas";

const isDuplicateKey = (e: unknown): boolean =>
  typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;

export async function registerUser(input: RegisterInput) {
  if (await User.exists({ email: input.email })) {
    throw new HttpError(409, "Ese correo ya está registrado");
  }
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  try {
    // Todo registro público crea un usuario normal; los administradores se crean con `npm run seed`.
    return await User.create({ name: input.name, email: input.email, passwordHash, role: "user" });
  } catch (e) {
    // Dos registros simultáneos con el mismo correo: gana el índice único.
    if (isDuplicateKey(e)) throw new HttpError(409, "Ese correo ya está registrado");
    throw e;
  }
}

export async function loginUser(input: LoginInput) {
  const user = await User.findOne({ email: input.email }).select("+passwordHash");
  const valid = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  // Mismo mensaje para «no existe» y «contraseña incorrecta»: no revela qué correos están registrados.
  if (!user || !valid) throw new HttpError(401, "Credenciales inválidas");

  const token = jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
  return { token, user };
}

export interface TokenPayload {
  id: string;
  role: Role;
}

export function verifyToken(token: string): TokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    if (typeof payload.sub !== "string" || (payload.role !== "user" && payload.role !== "admin")) {
      throw new Error("payload inválido");
    }
    return { id: payload.sub, role: payload.role };
  } catch {
    throw new HttpError(401, "Token inválido o expirado");
  }
}

export async function getUserById(id: string) {
  const user = await User.findById(id);
  if (!user) throw new HttpError(401, "La cuenta ya no existe");
  return user;
}

export async function listUsers() {
  const [users, total] = await Promise.all([User.find().sort({ createdAt: 1 }).limit(100), User.countDocuments()]);
  return { users, total };
}
