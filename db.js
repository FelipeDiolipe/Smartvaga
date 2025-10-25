// db.js
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "estacionamento"
});

db.connect(err => {
  if (err) throw err;
  console.log("✅ Conectado ao banco de dados MySQL");
});

module.exports = db;
