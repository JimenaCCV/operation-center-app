import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Las pruebas de API comparten una base de datos de prueba: se ejecutan una por una.
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 20000,
    env: {
      NODE_ENV: "test",
      JWT_SECRET: "secreto-solo-para-pruebas-no-usar-en-produccion",
      BCRYPT_ROUNDS: "4",
      MONGODB_URI: process.env.MONGODB_TEST_URI ?? "mongodb://127.0.0.1:27017/op-jccv-test",
    },
  },
});
