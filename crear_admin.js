const db = require("./database");

db.run(
  "INSERT INTO administradores (usuario, password) VALUES (?, ?)",
  ["vivachile", "vivachile2026x"],
  function (err) {
    if (err) {
      return console.log("Error creando admin:", err.message);
    }
    console.log("Administrador creado con éxito ✔");
  }
);
