import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app, bearer, createAdminAndLogin, registerAndLogin, setupDb, teardownDb, uniqueEmail } from "./helpers";

beforeAll(setupDb);
afterAll(teardownDb);

describe("POST /api/auth/register", () => {
  it("crea la cuenta (201) y nunca devuelve el hash", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Jimena", email: "Jimena@Example.com", password: "contrasena-1" });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: "Jimena", email: "jimena@example.com", role: "user" });
    expect(res.body.user.id).toBeTypeOf("string");
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|contrasena-1/);
  });

  it("rechaza datos inválidos (400) con el detalle de cada campo", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "J", email: "no-es-correo", password: "123" });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field).sort();
    expect(fields).toEqual(["email", "name", "password"]);
  });

  it("rechaza un correo repetido (409), sin importar mayúsculas", async () => {
    const email = uniqueEmail();
    await request(app).post("/api/auth/register").send({ name: "Uno", email, password: "contrasena-1" }).expect(201);
    const res = await request(app).post("/api/auth/register").send({ name: "Dos", email: email.toUpperCase(), password: "contrasena-1" });
    expect(res.status).toBe(409);
  });

  it("ignora un intento de registrarse como admin", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Intruso", email: uniqueEmail(), password: "contrasena-1", role: "admin" });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("user");
  });

  it("body que no es JSON → 400", async () => {
    const res = await request(app).post("/api/auth/register").set("Content-Type", "application/json").send("{no-json");
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("con credenciales correctas devuelve 200 y un JWT con el rol", async () => {
    const { token, userId } = await registerAndLogin();
    const payload = jwt.decode(token) as jwt.JwtPayload;
    expect(payload.sub).toBe(userId);
    expect(payload.role).toBe("user");
    expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it("contraseña incorrecta y correo inexistente dan el mismo 401", async () => {
    const { email } = await registerAndLogin();
    const wrongPass = await request(app).post("/api/auth/login").send({ email, password: "otra-contrasena" });
    const noUser = await request(app).post("/api/auth/login").send({ email: uniqueEmail("nadie"), password: "otra-contrasena" });
    expect(wrongPass.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPass.body).toEqual(noUser.body);
  });

  it("falta la contraseña → 400", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "a@b.com" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me y control de acceso", () => {
  it("sin token → 401", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
  });

  it("token con firma falsa → 401", async () => {
    const fake = jwt.sign({ role: "admin" }, "otro-secreto-que-no-es-el-real", { subject: "abc" });
    expect((await request(app).get("/api/auth/me").set(bearer(fake))).status).toBe(401);
  });

  it("token válido → 200 con el usuario", async () => {
    const { token, email } = await registerAndLogin();
    const res = await request(app).get("/api/auth/me").set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
  });

  it("GET /api/users: usuario normal → 403, admin → 200", async () => {
    const { token } = await registerAndLogin();
    expect((await request(app).get("/api/users").set(bearer(token))).status).toBe(403);

    const adminToken = await createAdminAndLogin();
    const res = await request(app).get("/api/users").set(bearer(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(1);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
  });
});
