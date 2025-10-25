// ==================== IMPORTS E CONFIGURAÇÕES ====================
const express = require("express");
const cors = require("cors");
const db = require("./db");
const Tesseract = require("tesseract.js");
const bcrypt = require("bcryptjs");

const app = express();

app.use(express.json({ limit: "25mb" })); // permite imagens base64 maiores (OCR)
app.use(cors());
app.use(express.static("public"));

// ==================== CLIENTES ====================
app.get("/clientes", (req, res) => {
  db.query("SELECT * FROM cliente ORDER BY id_cliente DESC", (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

app.post("/clientes", (req, res) => {
  const { nome, tipo, documento } = req.body;
  const sql = "INSERT INTO cliente (nome, tipo, documento) VALUES (?, ?, ?)";
  db.query(sql, [nome, tipo, documento], err => {
    if (err) return res.status(500).send(err);
    res.json({ message: "Cliente cadastrado com sucesso!" });
  });
});

app.put("/clientes/:id", (req, res) => {
  const { nome, tipo, documento } = req.body;
  const sql = "UPDATE cliente SET nome=?, tipo=?, documento=? WHERE id_cliente=?";
  db.query(sql, [nome, tipo, documento, req.params.id], err => {
    if (err) return res.status(500).send(err);
    res.json({ message: "Cliente atualizado com sucesso!" });
  });
});

// 🔧 Remove cliente + veículos + registros
app.delete("/clientes/:id", (req, res) => {
  const id = req.params.id;

  const sqlRegistros = `
    DELETE ra FROM registro_acesso ra
    JOIN veiculo v ON ra.id_veiculo = v.id_veiculo
    WHERE v.id_cliente = ?
  `;

  db.query(sqlRegistros, [id], err1 => {
    if (err1) return res.status(500).json({ error: "Erro ao remover registros de acesso.", detalhes: err1 });

    db.query("DELETE FROM veiculo WHERE id_cliente = ?", [id], err2 => {
      if (err2) return res.status(500).json({ error: "Erro ao remover veículos do cliente.", detalhes: err2 });

      db.query("DELETE FROM cliente WHERE id_cliente = ?", [id], err3 => {
        if (err3) return res.status(500).json({ error: "Erro ao remover cliente.", detalhes: err3 });

        res.json({ message: "✅ Cliente, veículos e registros removidos com sucesso!" });
      });
    });
  });
});

// ==================== VEÍCULOS ====================
app.get("/veiculos", (req, res) => {
  const { placa } = req.query;

  if (placa) {
    db.query("SELECT * FROM veiculo WHERE placa = ?", [placa], (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result);
    });
    return;
  }

  const sql = `
    SELECT v.id_veiculo, v.placa, v.modelo, v.cor, v.id_cliente, c.nome AS cliente
    FROM veiculo v
    JOIN cliente c ON v.id_cliente = c.id_cliente
    ORDER BY v.id_veiculo DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

app.post("/veiculos", (req, res) => {
  const { placa, modelo, cor, id_cliente } = req.body;
  if (!id_cliente) return res.status(400).json({ error: "id_cliente é obrigatório" });

  db.query("SELECT id_cliente FROM cliente WHERE id_cliente = ?", [id_cliente], (err, rows) => {
    if (err) return res.status(500).send(err);
    if (rows.length === 0)
      return res.status(400).json({ error: "Cliente não encontrado (id_cliente inválido)" });

    const sql = "INSERT INTO veiculo (placa, modelo, cor, id_cliente) VALUES (?, ?, ?, ?)";
    db.query(sql, [placa, modelo, cor, id_cliente], err2 => {
      if (err2) return res.status(500).send(err2);
      res.json({ message: "Veículo cadastrado com sucesso!" });
    });
  });
});

app.put("/veiculos/:id", (req, res) => {
  const { placa, modelo, cor, id_cliente } = req.body;
  if (!id_cliente) return res.status(400).json({ error: "id_cliente é obrigatório" });

  db.query("SELECT id_cliente FROM cliente WHERE id_cliente = ?", [id_cliente], (err, rows) => {
    if (err) return res.status(500).send(err);
    if (rows.length === 0)
      return res.status(400).json({ error: "Cliente não encontrado (id_cliente inválido)" });

    const sql = "UPDATE veiculo SET placa=?, modelo=?, cor=?, id_cliente=? WHERE id_veiculo=?";
    db.query(sql, [placa, modelo, cor, id_cliente, req.params.id], err2 => {
      if (err2) return res.status(500).send(err2);
      res.json({ message: "Veículo atualizado com sucesso!" });
    });
  });
});

// 🔧 Deletar veículo e seus registros
app.delete("/veiculos/:id", (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM registro_acesso WHERE id_veiculo=?", [id], err1 => {
    if (err1) return res.status(500).json({ error: "Erro ao remover registros do veículo.", detalhes: err1 });

    db.query("DELETE FROM veiculo WHERE id_veiculo=?", [id], err2 => {
      if (err2) return res.status(500).json({ error: "Erro ao remover veículo.", detalhes: err2 });
      res.json({ message: "✅ Veículo e registros removidos com sucesso!" });
    });
  });
});

// ==================== PAGAMENTOS ====================
app.get("/pagamentos", (req, res) => {
  const sql = `
    SELECT p.id_pagamento, c.nome AS cliente, p.valor, p.metodo, p.data_hora
    FROM pagamento p
    JOIN cliente c ON p.id_cliente = c.id_cliente
    ORDER BY p.data_hora DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

app.post("/pagamentos", (req, res) => {
  const { id_cliente, valor, metodo } = req.body;

  if (!id_cliente || !valor || !metodo) {
    return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
  }

  const sql = "INSERT INTO pagamento (id_cliente, valor, metodo) VALUES (?, ?, ?)";
  db.query(sql, [id_cliente, valor, metodo], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ message: "✅ Pagamento registrado com sucesso!" });
  });
});

app.delete("/pagamentos/:id", (req, res) => {
  const id = req.params.id;
  db.query("DELETE FROM pagamento WHERE id_pagamento = ?", [id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ message: "🗑️ Pagamento removido com sucesso!" });
  });
});

// ==================== REGISTROS DE ENTRADA/SAÍDA ====================
app.get("/registros", (req, res) => {
  const sql = `
    SELECT r.id_registro, v.id_veiculo, v.placa, c.nome AS cliente, r.status, r.data_hora
    FROM registro_acesso r
    JOIN veiculo v ON r.id_veiculo = v.id_veiculo
    JOIN cliente c ON v.id_cliente = c.id_cliente
    ORDER BY r.data_hora DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

app.post("/registros", (req, res) => {
  const id_veiculo = req.body.id_veiculo || req.body.veiculo_id;
  const { status } = req.body;

  if (!id_veiculo || !status) {
    return res.status(400).json({ error: "Campos obrigatórios: id_veiculo e status" });
  }

  const sql = "INSERT INTO registro_acesso (id_veiculo, status, data_hora) VALUES (?, ?, NOW())";
  db.query(sql, [id_veiculo, status], err => {
    if (err) return res.status(500).send(err);
    res.json({ message: "Registro salvo com sucesso!" });
  });
});

// 🟡 Editar registro existente
app.put("/registros/:id", (req, res) => {
  const { id_veiculo, status } = req.body;
  db.query(
    "UPDATE registro_acesso SET id_veiculo=?, status=? WHERE id_registro=?",
    [id_veiculo, status, req.params.id],
    err => {
      if (err) return res.status(500).send(err);
      res.json({ message: "Registro atualizado com sucesso!" });
    }
  );
});

// 🔴 Excluir registro
app.delete("/registros/:id", (req, res) => {
  db.query("DELETE FROM registro_acesso WHERE id_registro=?", [req.params.id], err => {
    if (err) return res.status(500).send(err);
    res.json({ message: "Registro excluído com sucesso!" });
  });
});

// ==================== RECONHECIMENTO DE PLACAS ====================
app.post("/reconhecer-placa", async (req, res) => {
  try {
    let { imagem } = req.body;
    if (!imagem) return res.status(400).json({ erro: "Imagem não recebida" });

    if (imagem.startsWith("data:image") && imagem.includes(",")) {
      imagem = imagem.split(",")[1];
    }

    const buffer = Buffer.from(imagem, "base64");
    const { data: resultado } = await Tesseract.recognize(buffer, "eng");

    let texto = (resultado.text || "").replace(/\s/g, "").toUpperCase();
    const padroes = [/[A-Z]{3}\d{4}/, /[A-Z]{3}\d[A-Z0-9]{2}\d?/];

    let placa = null;
    for (const p of padroes) {
      const m = texto.match(p);
      if (m) { placa = m[0]; break; }
    }

    if (!placa) return res.json({ placa: null, mensagem: "Placa não reconhecida" });

    db.query("SELECT id_veiculo FROM veiculo WHERE placa = ?", [placa], (err, veiculos) => {
      if (err) return res.status(500).json({ erro: "Erro ao buscar veículo" });
      if (veiculos.length === 0)
        return res.json({ placa, mensagem: "Veículo não cadastrado no sistema" });

      const id_veiculo = veiculos[0].id_veiculo;

      db.query(
        "SELECT status FROM registro_acesso WHERE id_veiculo = ? ORDER BY data_hora DESC LIMIT 1",
        [id_veiculo],
        (err2, registros) => {
          if (err2) return res.status(500).json({ erro: "Erro ao buscar registros" });

          let novoStatus;
          if (registros.length === 0) {
            novoStatus = "Entrada";
          } else {
            const ultimoStatus = registros[0].status.toLowerCase();
            novoStatus = ultimoStatus === "entrada" ? "Saída" : "Entrada";
          }

          db.query(
            "INSERT INTO registro_acesso (id_veiculo, status, data_hora) VALUES (?, ?, NOW())",
            [id_veiculo, novoStatus],
            (err3) => {
              if (err3) return res.status(500).json({ erro: "Erro ao registrar acesso" });
              res.json({
                placa,
                status: novoStatus,
                mensagem: `Registro de ${novoStatus} salvo com sucesso!`,
              });
            }
          );
        }
      );
    });
  } catch (erro) {
    console.error("❌ Erro em /reconhecer-placa:", erro);
    res.status(500).json({ erro: "Falha ao processar OCR", detalhe: erro.message });
  }
});


// ==================== EMPRESAS (CADASTRO E LOGIN) ====================
app.post("/empresas/cadastro", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ error: "Preencha todos os campos." });

    db.query("SELECT * FROM empresa WHERE email = ?", [email], async (err, result) => {
      if (err) return res.status(500).json({ error: "Erro no banco de dados." });
      if (result.length > 0) return res.status(400).json({ error: "E-mail já cadastrado." });

      const hash = await bcrypt.hash(senha, 10);
      db.query("INSERT INTO empresa (nome, email, senha) VALUES (?, ?, ?)", [nome, email, hash], err2 => {
        if (err2) return res.status(500).json({ error: "Erro ao cadastrar empresa." });
        res.json({ message: "Empresa cadastrada com sucesso!" });
      });
    });
  } catch {
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

app.post("/empresas/login", (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: "E-mail e senha obrigatórios." });

  db.query("SELECT * FROM empresa WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ error: "Erro no banco de dados." });
    if (result.length === 0) return res.status(400).json({ error: "Empresa não encontrada." });

    const empresa = result[0];
    const senhaCorreta = await bcrypt.compare(senha, empresa.senha);
    if (!senhaCorreta) return res.status(401).json({ error: "Senha incorreta." });

    res.json({ message: "Login realizado com sucesso!", empresa: { id: empresa.id_empresa, nome: empresa.nome, email: empresa.email } });
  });
});


app.post("/reconhecimento", (req, res) => {
  const { placa } = req.body;

  if (!placa) return res.status(400).json({ error: "Placa não fornecida." });

  // 🔍 Verifica se o veículo existe
  db.query("SELECT * FROM veiculos WHERE placa = ?", [placa], (err, veiculos) => {
    if (err) return res.status(500).json({ error: "Erro no banco de dados." });
    if (veiculos.length === 0) return res.json({ status: "nao_encontrado" });

    const veiculo = veiculos[0];

    // 🔄 Verifica se já tem uma entrada aberta (sem saída)
    db.query(
      "SELECT * FROM registros WHERE id_veiculo = ? AND hora_saida IS NULL ORDER BY hora_entrada DESC LIMIT 1",
      [veiculo.id_veiculo],
      (err, registros) => {
        if (err) return res.status(500).json({ error: "Erro ao verificar registro." });

        // Se já está dentro → registrar SAÍDA
        if (registros.length > 0) {
          db.query(
            "UPDATE registros SET hora_saida = NOW() WHERE id_registro = ?",
            [registros[0].id_registro],
            (err2) => {
              if (err2) return res.status(500).json({ error: "Erro ao registrar saída." });
              return res.json({ status: "saida", veiculo });
            }
          );
        } else {
          // Se não está dentro → registrar ENTRADA
          db.query(
            "INSERT INTO registros (id_veiculo, hora_entrada) VALUES (?, NOW())",
            [veiculo.id_veiculo],
            (err3) => {
              if (err3) return res.status(500).json({ error: "Erro ao registrar entrada." });
              return res.json({ status: "entrada", veiculo });
            }
          );
        }
      }
    );
  });
});


// ==================== DASHBOARD ====================
app.get("/dashboard", (req, res) => {
  const sqlEntradasHoje = `
    SELECT COUNT(*) AS entradas_hoje
    FROM registro_acesso
    WHERE DATE(data_hora) = CURDATE() AND LOWER(status) = 'entrada'
  `;
  const sqlClientes = "SELECT COUNT(*) AS total_clientes FROM cliente";
  const sqlVeiculos = "SELECT COUNT(*) AS total_veiculos FROM veiculo";
  const sqlHistorico = `
    SELECT DATE(data_hora) AS dia, COUNT(*) AS total
    FROM registro_acesso
    WHERE status = 'Entrada'
    GROUP BY DATE(data_hora)
    ORDER BY dia DESC
    LIMIT 7
  `;

  db.query(sqlEntradasHoje, (err1, result1) => {
    if (err1) return res.status(500).send(err1);
    db.query(sqlClientes, (err2, result2) => {
      if (err2) return res.status(500).send(err2);
      db.query(sqlVeiculos, (err3, result3) => {
        if (err3) return res.status(500).send(err3);
        db.query(sqlHistorico, (err4, result4) => {
          if (err4) return res.status(500).send(err4);
          res.json({
            entradas_hoje: result1[0].entradas_hoje,
            total_clientes: result2[0].total_clientes,
            total_veiculos: result3[0].total_veiculos,
            historico: result4.reverse()
          });
        });
      });
    });
  });
});

const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// === Exportar Clientes ===
app.get("/exportar/clientes", (req, res) => {
  const empresaNome = req.query.empresa || "SmartVaga";

  const sql = "SELECT id_cliente, nome, tipo, documento FROM cliente ORDER BY id_cliente DESC";
  db.query(sql, (err, clientes) => {
    if (err) return res.status(500).send("Erro ao gerar PDF de clientes");

    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ margin: 50 });
    const nomeArquivo = "clientes.pdf";

    res.setHeader("Content-Disposition", `attachment; filename=${nomeArquivo}`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // 🧾 Cabeçalho
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Relatório de Clientes", { align: "center" })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Empresa: ${empresaNome}`, { align: "center" })
      .text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, { align: "center" })
      .moveDown(1.5);

    // 🟣 Cabeçalho da tabela
    const startX = 50;
    const startY = doc.y;
    const colWidths = [40, 200, 100, 150]; // ID | Nome | Tipo | Documento

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("ID", startX, startY)
      .text("Nome", startX + colWidths[0], startY)
      .text("Tipo", startX + colWidths[0] + colWidths[1], startY)
      .text("Documento", startX + colWidths[0] + colWidths[1] + colWidths[2], startY);

    doc.moveTo(startX, startY + 15).lineTo(560, startY + 15).strokeColor("#999").stroke();
    doc.moveDown(0.5);

    // 🟢 Linhas
    let y = startY + 25;
    doc.font("Helvetica").fontSize(11);

    clientes.forEach(c => {
      if (y > 750) {
        doc.addPage();
        y = 50;
      }

      doc.text(c.id_cliente.toString(), startX, y, { width: colWidths[0] });
      doc.text(c.nome || "-", startX + colWidths[0], y, { width: colWidths[1] });
      doc.text(c.tipo || "-", startX + colWidths[0] + colWidths[1], y, { width: colWidths[2] });
      doc.text(c.documento || "-", startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] });

      y += 20;
    });

    doc.end();
  });
});


// === Exportar Registros de Entradas/Saídas ===
app.get("/exportar/registros", (req, res) => {
  const empresaNome = req.query.empresa || "SmartVaga";

  const sql = `
    SELECT r.id_registro, v.placa, c.nome AS cliente, r.status, r.data_hora
    FROM registro_acesso r
    JOIN veiculo v ON r.id_veiculo = v.id_veiculo
    JOIN cliente c ON v.id_cliente = c.id_cliente
    ORDER BY r.data_hora DESC
  `;
  db.query(sql, (err, registros) => {
    if (err) return res.status(500).send("Erro ao gerar PDF de registros");

    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ margin: 50 });
    const nomeArquivo = "entradas_saidas.pdf";

    res.setHeader("Content-Disposition", `attachment; filename=${nomeArquivo}`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // Cabeçalho
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Relatório de Entradas e Saídas", { align: "center" })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Empresa: ${empresaNome}`, { align: "center" })
      .text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, { align: "center" })
      .moveDown(1.5);

    // Cabeçalho tabela
    const startX = 50;
    const startY = doc.y;
    const colWidths = [40, 150, 80, 100, 150]; // ID | Cliente | Placa | Status | Data/Hora

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("ID", startX, startY)
      .text("Cliente", startX + colWidths[0], startY)
      .text("Placa", startX + colWidths[0] + colWidths[1], startY)
      .text("Status", startX + colWidths[0] + colWidths[1] + colWidths[2], startY)
      .text("Data/Hora", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], startY);

    doc.moveTo(startX, startY + 15).lineTo(560, startY + 15).strokeColor("#999").stroke();

    let y = startY + 25;
    doc.font("Helvetica").fontSize(11);

    registros.forEach(r => {
      if (y > 750) {
        doc.addPage();
        y = 50;
      }

      doc.text(r.id_registro.toString(), startX, y, { width: colWidths[0] });
      doc.text(r.cliente || "-", startX + colWidths[0], y, { width: colWidths[1] });
      doc.text(r.placa || "-", startX + colWidths[0] + colWidths[1], y, { width: colWidths[2] });
      doc.text(r.status || "-", startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] });
      doc.text(new Date(r.data_hora).toLocaleString("pt-BR"), startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4] });

      y += 20;
    });

    doc.end();
  });
});



// === Exportar veículos cadastrados (com cabeçalho da empresa) ===
app.get("/exportar/veiculos", (req, res) => {
  const empresaNome = req.query.empresa || "SmartVaga"; // nome enviado pela URL (ex: ?empresa=EstacionamentoX)

  const sql = `
    SELECT v.id_veiculo, v.placa, v.modelo, v.cor, c.nome AS cliente
    FROM veiculo v
    JOIN cliente c ON v.id_cliente = c.id_cliente
    ORDER BY v.id_veiculo DESC
  `;

  db.query(sql, (err, veiculos) => {
    if (err) return res.status(500).send("Erro ao gerar PDF de veículos");

    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ margin: 50 });
    const nomeArquivo = "veiculos.pdf";

    res.setHeader("Content-Disposition", `attachment; filename=${nomeArquivo}`);
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // 🏢 Cabeçalho
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("Relatório de Veículos Cadastrados", { align: "center" })
      .moveDown(0.5);

    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Empresa: ${empresaNome}`, { align: "center" })
      .text(`Emitido em: ${new Date().toLocaleString("pt-BR")}`, { align: "center" })
      .moveDown(1.5);

    // 🟣 Cabeçalho da tabela
    const startX = 50;
    const startY = doc.y;
    const colWidths = [40, 80, 120, 80, 180]; // ID | Placa | Modelo | Cor | Cliente

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("ID", startX, startY)
      .text("Placa", startX + colWidths[0], startY)
      .text("Modelo", startX + colWidths[0] + colWidths[1], startY)
      .text("Cor", startX + colWidths[0] + colWidths[1] + colWidths[2], startY)
      .text("Cliente", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], startY);

    doc.moveTo(startX, startY + 15).lineTo(560, startY + 15).strokeColor("#999").stroke();
    doc.moveDown(0.5);

    // 🟢 Linhas da tabela
    let y = startY + 25;
    doc.font("Helvetica").fontSize(11);

    veiculos.forEach(v => {
      if (y > 750) {
        doc.addPage();
        y = 50;
      }

      doc.text(v.id_veiculo.toString(), startX, y, { width: colWidths[0] });
      doc.text(v.placa || "-", startX + colWidths[0], y, { width: colWidths[1] });
      doc.text(v.modelo || "-", startX + colWidths[0] + colWidths[1], y, { width: colWidths[2] });
      doc.text(v.cor || "-", startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] });
      doc.text(v.cliente || "-", startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4] });

      y += 20;
    });

    doc.end();
  });
});



// ==================== INICIALIZAÇÃO ====================
app.listen(3000, () =>
  console.log("🚗 Servidor rodando com sucesso em http://localhost:3000")
);
