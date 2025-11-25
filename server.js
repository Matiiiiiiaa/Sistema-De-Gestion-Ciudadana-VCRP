// ======================================================
// CARABINEROS WEB - SISTEMA COMPLETO CORREGIDO
// ======================================================

const express = require("express");
const path = require("path");
const session = require("express-session");
const db = require("./database");
const axios = require("axios");

const app = express();

// ===============================================
// CONFIG OAUTH DISCORD
// ===============================================
const DISCORD_CLIENT_ID = "1243396812849811516";
const DISCORD_CLIENT_SECRET = "70sG7d5SNzvOW2p6Bz4PJOM5_MpRr4Pc";
const DISCORD_REDIRECT_URI = "http://localhost:3000/auth/discord/callback";

// ===============================================
// MIDDLEWARES
// ===============================================
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "clave_secreta_carabineros",
    resave: false,
    saveUninitialized: true,
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

console.log("🟢 Server.js cargado correctamente");

// ===============================================
// CREAR ADMIN POR DEFECTO
// ===============================================
db.get(
  "SELECT * FROM administradores WHERE usuario = ?",
  ["vivachile"],
  (err, row) => {
    if (!row) {
      db.run(
        "INSERT INTO administradores (usuario, password) VALUES (?, ?)",
        ["vivachile", "vivachile2026x"],
        () => console.log("✔ Administrador creado: vivachile")
      );
    }
  }
);

// ===============================================
// LOGIN GENERAL
// ===============================================
app.get("/", (req, res) => {
  res.render("login");
});

// ===============================================
// LOGIN FUNCIONARIO
// ===============================================
app.get("/login_funcionario", (req, res) => {
  res.render("login_funcionario", { error: null });
});

app.post("/login_funcionario", (req, res) => {
  const { usuario, password } = req.body;

  db.get(
    "SELECT * FROM funcionarios WHERE usuario = ? AND password = ?",
    [usuario, password],
    (err, row) => {
      if (!row) {
        return res.render("login_funcionario", {
          error: "Usuario o contraseña incorrectos",
        });
      }

      req.session.funcionario = row;
      return res.redirect("/dashboard_funcionario");
    }
  );
});

// ===============================================
// DASHBOARD FUNCIONARIO
// ===============================================
app.get("/dashboard_funcionario", (req, res) => {
  if (!req.session.funcionario) return res.redirect("/login_funcionario");
  res.render("dashboard_funcionario", { funcionario: req.session.funcionario });
});

// ===============================================
// OAUTH DISCORD - CIUDADANO
// ===============================================
app.get("/auth/discord", (req, res) => {
  const authorizeUrl =
    "https://discord.com/oauth2/authorize" +
    "?client_id=" +
    DISCORD_CLIENT_ID +
    "&redirect_uri=" +
    encodeURIComponent(DISCORD_REDIRECT_URI) +
    "&response_type=code" +
    "&scope=identify";

  res.redirect(authorizeUrl);
});

app.get("/auth/discord/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("❌ Error: Discord no devolvió código.");

  try {
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
        scope: "identify",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const access_token = tokenResponse.data.access_token;

    const userResponse = await axios.get(
      "https://discord.com/api/users/@me",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    req.session.ciudadano = {
      id: userResponse.data.id,
      username: userResponse.data.username.toLowerCase(),
      avatar: userResponse.data.avatar,
    };

    return res.redirect("/ciudadano/expediente");
  } catch (err) {
    return res.send("❌ Error al autenticar con Discord.");
  }
});

// ===============================================
// EXPEDIENTE CIUDADANO
// ===============================================
app.get("/ciudadano/expediente", (req, res) => {
  if (!req.session.ciudadano) return res.redirect("/");

  const username = req.session.ciudadano.username.toLowerCase();

  db.all(
    "SELECT * FROM multas WHERE LOWER(usuario) = ?",
    [username],
    (e1, multas = []) => {
      db.all(
        "SELECT * FROM antecedentes WHERE LOWER(usuario) = ?",
        [username],
        (e2, antecedentes = []) => {
          db.all(
            "SELECT * FROM amonestaciones WHERE LOWER(usuario) = ?",
            [username],
            (e3, amonestaciones = []) => {
              const total = multas.length + antecedentes.length;

              let estado = {};
              if (total === 0 && amonestaciones.length === 0)
                estado = { texto: "LIMPIO", color: "estado-verde" };
              else if (antecedentes.length >= 3 || multas.length >= 5)
                estado = { texto: "ALTO RIESGO", color: "estado-rojo" };
              else estado = { texto: "ADVERTENCIAS", color: "estado-amarillo" };

              res.render("ciudadano_expediente", {
                ciudadano: req.session.ciudadano,
                multas,
                antecedentes,
                amonestaciones,
                estado,
              });
            }
          );
        }
      );
    }
  );
});

// ===============================================
// REGISTRAR MULTA
// ===============================================
app.get("/funcionario/registrar_multa", (req, res) => {
  if (!req.session.funcionario) return res.redirect("/login_funcionario");
  res.render("registrar_multa", {
    error: null,
    success: null,
    funcionario: req.session.funcionario,
  });
});

app.post("/funcionario/registrar_multa", (req, res) => {
  let { usuario, nombre, apellido, rut, articulo, monto, valido } = req.body;

  usuario = usuario.toLowerCase().trim();
  const carabinero = req.session.funcionario.usuario;

  db.run(
    `INSERT INTO multas (usuario, nombre, apellido, rut, articulo, monto, valido, carabinero)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [usuario, nombre, apellido, rut, articulo, monto, valido, carabinero],
    (err) => {
      if (err)
        return res.render("registrar_multa", {
          error: "❌ Error: " + err.message,
          success: null,
          funcionario: req.session.funcionario,
        });

      res.render("registrar_multa", {
        success: "✔ Multa registrada correctamente",
        error: null,
        funcionario: req.session.funcionario,
      });
    }
  );
});

// ===============================================
// REGISTRAR ANTECEDENTE
// ===============================================
app.get("/funcionario/registrar_antecedente", (req, res) => {
  if (!req.session.funcionario) return res.redirect("/login_funcionario");
  res.render("registrar_antecedente", {
    error: null,
    success: null,
    funcionario: req.session.funcionario,
  });
});

app.post("/funcionario/registrar_antecedente", (req, res) => {
  let { usuario, nombre, apellido, rut, articulo, monto, valido } = req.body;

  usuario = usuario.toLowerCase().trim();
  const carabinero = req.session.funcionario.usuario;

  db.run(
    `INSERT INTO antecedentes (usuario, nombre, apellido, rut, articulo, monto, valido, carabinero)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [usuario, nombre, apellido, rut, articulo, monto, valido, carabinero],
    (err) => {
      if (err)
        return res.render("registrar_antecedente", {
          error: "❌ Error: " + err.message,
          success: null,
          funcionario: req.session.funcionario,
        });

      res.render("registrar_antecedente", {
        success: "✔ Antecedente registrado correctamente",
        error: null,
        funcionario: req.session.funcionario,
      });
    }
  );
});

// ===============================================
// AMONESTACIONES
// ===============================================
app.get("/funcionario/registrar_amonestacion", (req, res) => {
  if (!req.session.funcionario) return res.redirect("/login_funcionario");

  res.render("registrar_amonestacion", {
    error: null,
    success: null,
    funcionario: req.session.funcionario,
  });
});

app.post("/funcionario/registrar_amonestacion", (req, res) => {
  const { usuario, motivo } = req.body;
  const carabinero = req.session.funcionario.usuario;
  const fecha = new Date().toLocaleDateString("es-CL");

  db.run(
    `INSERT INTO amonestaciones (usuario, motivo, carabinero, fecha)
     VALUES (?, ?, ?, ?)`,
    [usuario.toLowerCase(), motivo, carabinero, fecha],
    (err) => {
      if (err)
        return res.render("registrar_amonestacion", {
          error: "❌ Error: " + err.message,
          success: null,
          funcionario: req.session.funcionario,
        });

      res.render("registrar_amonestacion", {
        success: "✔ Amonestación registrada correctamente",
        error: null,
        funcionario: req.session.funcionario,
      });
    }
  );
});

// ===============================================
// BUSCAR AMONESTACIONES (FUNCIONARIO)
// ===============================================
app.get("/funcionario/buscar_amonestacion", (req, res) => {
  if (!req.session.funcionario) return res.redirect("/login_funcionario");

  res.render("buscar_amonestacion", {
    resultados: null,
    error: null,
    funcionario: req.session.funcionario,
  });
});

app.post("/funcionario/buscar_amonestacion", (req, res) => {
  const usuario = req.body.usuario.toLowerCase();

  db.all(
    "SELECT * FROM amonestaciones WHERE LOWER(usuario) = ?",
    [usuario],
    (err, rows) => {
      res.render("buscar_amonestacion", {
        resultados: rows,
        error: null,
        funcionario: req.session.funcionario,
      });
    }
  );
});

// ===============================================
// ADMIN - LOGIN
// ===============================================
app.get("/login_admin", (req, res) => {
  res.render("login_admin", { error: null });
});

app.post("/login_admin", (req, res) => {
  const { usuario, password } = req.body;

  db.get(
    "SELECT * FROM administradores WHERE usuario = ? AND password = ?",
    [usuario, password],
    (err, row) => {
      if (!row)
        return res.render("login_admin", {
          error: "❌ Credenciales incorrectas",
        });

      req.session.admin = row;
      res.redirect("/dashboard_admin");
    }
  );
});

app.get("/dashboard_admin", (req, res) => {
  if (!req.session.admin) return res.redirect("/login_admin");

  res.render("dashboard_admin", { admin: req.session.admin });
});

// ===============================================
// ADMIN - FUNCIONARIOS
// ===============================================
app.get("/admin/crear_funcionario", (req, res) => {
  if (!req.session.admin) return res.redirect("/login_admin");
  res.render("crear_funcionario", {
    error: null,
    success: null,
    admin: req.session.admin,
  });
});

app.post("/admin/crear_funcionario", (req, res) => {
  const { usuario, password } = req.body;

  db.get(
    "SELECT * FROM funcionarios WHERE usuario = ?",
    [usuario],
    (err, row) => {
      if (row)
        return res.render("crear_funcionario", {
          error: "❌ El funcionario ya existe",
          success: null,
          admin: req.session.admin,
        });

      db.run(
        "INSERT INTO funcionarios (usuario, password) VALUES (?, ?)",
        [usuario, password],
        () =>
          res.render("crear_funcionario", {
            success: "✔ Funcionario creado",
            error: null,
            admin: req.session.admin,
          })
      );
    }
  );
});

app.get("/admin/lista_funcionarios", (req, res) => {
  if (!req.session.admin) return res.redirect("/login_admin");

  db.all("SELECT * FROM funcionarios", [], (err, rows) => {
    res.render("lista_funcionarios", {
      funcionarios: rows,
      admin: req.session.admin,
    });
  });
});

app.get("/admin/eliminar_funcionario/:id", (req, res) => {
  db.run("DELETE FROM funcionarios WHERE id = ?", [req.params.id], () => {
    res.redirect("/admin/lista_funcionarios");
  });
});

// ===============================================
// ADMIN - MULTAS
// ===============================================
app.get("/admin/lista_multas", (req, res) => {
  if (!req.session.admin) return res.redirect("/login_admin");

  db.all("SELECT * FROM multas ORDER BY id DESC", [], (err, rows) => {
    res.render("lista_multas", { multas: rows, admin: req.session.admin });
  });
});

app.get("/admin/editar_multa/:id", (req, res) => {
  db.get(
    "SELECT * FROM multas WHERE id = ?",
    [req.params.id],
    (err, multa) => {
      res.render("editar_multa", { multa, admin: req.session.admin });
    }
  );
});

app.post("/admin/editar_multa/:id", (req, res) => {
  const { usuario, nombre, apellido, rut, articulo, monto, valido } = req.body;

  db.run(
    `UPDATE multas SET usuario=?, nombre=?, apellido=?, rut=?, articulo=?, monto=?, valido=? WHERE id=?`,
    [usuario, nombre, apellido, rut, articulo, monto, valido, req.params.id],
    () => res.redirect("/admin/lista_multas")
  );
});

app.get("/admin/eliminar_multa/:id", (req, res) => {
  db.run("DELETE FROM multas WHERE id = ?", [req.params.id], () => {
    res.redirect("/admin/lista_multas");
  });
});

// ===============================================
// ADMIN - ANTECEDENTES
// ===============================================
app.get("/admin/lista_antecedentes", (req, res) => {
  if (!req.session.admin) return res.redirect("/login_admin");

  db.all(
    "SELECT * FROM antecedentes ORDER BY id DESC",
    [],
    (err, rows) => {
      res.render("lista_antecedentes", {
        antecedentes: rows,
        admin: req.session.admin,
      });
    }
  );
});

app.get("/admin/editar_antecedente/:id", (req, res) => {
  db.get(
    "SELECT * FROM antecedentes WHERE id = ?",
    [req.params.id],
    (err, antecedente) => {
      res.render("editar_antecedente", {
        antecedente,
        admin: req.session.admin,
      });
    }
  );
});

app.post("/admin/editar_antecedente/:id", (req, res) => {
  const { usuario, nombre, apellido, rut, articulo, monto, valido } = req.body;

  db.run(
    `UPDATE antecedentes SET usuario=?, nombre=?, apellido=?, rut=?, articulo=?, monto=?, valido=? WHERE id=?`,
    [
      usuario,
      nombre,
      apellido,
      rut,
      articulo,
      monto,
      valido,
      req.params.id,
    ],
    () => res.redirect("/admin/lista_antecedentes")
  );
});

app.get("/admin/eliminar_antecedente/:id", (req, res) => {
  db.run("DELETE FROM antecedentes WHERE id = ?", [req.params.id], () => {
    res.redirect("/admin/lista_antecedentes");
  });
});

// ===============================================
// ADMIN - AMONESTACIONES
// ===============================================
app.get("/admin/lista_amonestaciones", (req, res) => {
  if (!req.session.admin) return res.redirect("/login_admin");

  db.all(
    "SELECT * FROM amonestaciones ORDER BY id DESC",
    [],
    (err, rows) => {
      res.render("lista_amonestaciones", {
        amonestaciones: rows,
        admin: req.session.admin,
      });
    }
  );
});

app.get("/admin/eliminar_amonestacion/:id", (req, res) => {
  db.run("DELETE FROM amonestaciones WHERE id = ?", [req.params.id], () => {
    res.redirect("/admin/lista_amonestaciones");
  });
});
  // ===============================================
// ADMIN - AMONESTACIONES
// ===============================================
app.get("/admin/lista_amonestaciones", (req, res) => {
  if (!req.session.admin) return res.redirect("/login_admin");

  db.all(
    "SELECT * FROM amonestaciones ORDER BY id DESC",
    [],
    (err, rows) => {
      res.render("lista_amonestaciones", {
        amonestaciones: rows,
        admin: req.session.admin,
      });
    }
  );
});

app.get("/admin/eliminar_amonestacion/:id", (req, res) => {
  if (!req.session.admin) return res.redirect("/login_admin");

  db.run("DELETE FROM amonestaciones WHERE id = ?", [req.params.id], () => {
    res.redirect("/admin/lista_amonestaciones");
  });
});

// ===============================================
// LOGOUT
// ===============================================

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// ===============================
// LEVANTAR SERVIDOR
// ===============================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚓 Servidor funcionando en http://localhost:${PORT}`);
});
