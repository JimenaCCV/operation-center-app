/** @type {import("jest").Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  testTimeout: 20000,
  // Variables de entorno de prueba: se cargan antes de importar src/config/env.
  setupFiles: ["<rootDir>/tests/setup-env.ts"],
};
