// Entorno de pruebas. Jest carga este archivo (setupFiles) antes de cada archivo de prueba,
// así que src/config/env ya lee estos valores al importarse.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "secreto-solo-para-pruebas-no-usar-en-produccion";
process.env.BCRYPT_ROUNDS = "4";
process.env.MONGODB_URI = process.env.MONGODB_TEST_URI ?? "mongodb://127.0.0.1:27017/op-jccv-test";
