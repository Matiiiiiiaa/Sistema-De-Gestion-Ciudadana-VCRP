const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./data/database.db");

// ================================
// TABLAS DEL SISTEMA — COMPLETAS 🔥
// ================================
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS administradores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT,
            password TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS funcionarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT,
            password TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS multas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT,
            nombre TEXT,
            apellido TEXT,
            rut TEXT,
            articulo TEXT,
            monto INTEGER,
            valido TEXT,
            carabinero TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS antecedentes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT,
            nombre TEXT,
            apellido TEXT,
            rut TEXT,
            articulo TEXT,
            monto INTEGER,
            valido TEXT,
            carabinero TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS amonestaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT,
            motivo TEXT,
            carabinero TEXT,
            fecha TEXT
        );
    `);
});

module.exports = db;
