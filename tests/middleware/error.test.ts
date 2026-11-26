import express from "express";
import request from "supertest";
import { describe, expect, it } from "@jest/globals";
import { createApp } from "../../src/app";
import { errorHandler } from "../../src/middleware/error.middleware";

// El body se lee antes de autenticar, así que estas pruebas no necesitan MongoDB ni token.
const app = createApp();
const post = () => request(app).post("/api/auth/login");

describe("errorHandler · errores al leer el body", () => {
  it("JSON mal formado → 400", async () => {
    const res = await post().set("Content-Type", "application/json").send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { message: "El body no es un JSON válido" } });
  });

  it("body de más de 100 kb → 413 en JSON (antes 500)", async () => {
    const res = await post().send({ email: "a".repeat(120_000) });
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: { message: "El body supera el tamaño máximo permitido (100 kb)" } });
  });

  it("charset no soportado → 415 (antes 500)", async () => {
    const res = await post().set("Content-Type", "application/json; charset=latin9").send('{"a":1}');
    expect(res.status).toBe(415);
    expect(res.body.error.message).toBe("Charset no soportado: envía el body en UTF-8");
  });

  it("Content-Encoding desconocido o gzip inválido → 4xx en JSON (antes 500)", async () => {
    const raro = await post().set("Content-Type", "application/json").set("Content-Encoding", "xyz").send('{"a":1}');
    expect(raro.status).toBe(415);
    const gzip = await post().set("Content-Type", "application/json").set("Content-Encoding", "gzip").send('{"a":1}');
    expect(gzip.status).toBe(400);
    expect(gzip.body).toEqual({ error: { message: "No se pudo leer el body de la petición" } });
  });
});

describe("errorHandler · error inesperado", () => {
  it("responde 500 con mensaje genérico, sin stack ni detalles internos", async () => {
    const mini = express();
    mini.get("/boom", () => {
      throw new Error("detalle interno: conexión a la base perdida");
    });
    mini.use(errorHandler);
    const res = await request(mini).get("/boom");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { message: "Error interno del servidor" } });
    expect(res.text).not.toMatch(/detalle interno|at |stack/);
  });
});
