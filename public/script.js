/* =====================================================
   script.js - Consolidado e ajustado (SmartVaga)
   Substitua seu script.js por este e limpe cache (Ctrl+F5)
===================================================== */

console.log("script.js carregado");

// ==================== HELPERS ====================
async function fetchJson(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} - ${text}`);
    }
    return await res.json();
  } catch (err) {
    console.error("fetchJson erro:", url, err);
    throw err;
  }
}

// ==================== CLIENTES ====================
let idClienteEditando = null;

async function carregarClientes() {
  const tabela = document.getElementById("listaClientes");
  if (!tabela) return;

  try {
    const data = await fetchJson("/clientes");
    tabela.innerHTML = data.map(c => `
      <tr class="text-center border-t">
        <td>${c.nome}</td>
        <td>${c.tipo}</td>
        <td>${c.documento}</td>
        <td>
          <button onclick="editarCliente(${c.id_cliente}, '${escapeJS(c.nome)}', '${escapeJS(c.tipo)}', '${escapeJS(c.documento)}')"
                  class="bg-yellow-500 text-white px-2 py-1 rounded">Editar</button>
          <button onclick="removerCliente(${c.id_cliente})"
                  class="bg-red-500 text-white px-2 py-1 rounded">Excluir</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tabela.innerHTML = `<tr><td colspan="4" class="text-red-500 p-2">Erro ao carregar clientes</td></tr>`;
  }
}

function escapeJS(str = "") {
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function editarCliente(id, nome, tipo, documento) {
  const elNome = document.getElementById("nome");
  const elTipo = document.getElementById("tipo");
  const elDoc = document.getElementById("documento");
  if (!elNome || !elTipo || !elDoc) return;

  elNome.value = nome;
  elTipo.value = tipo;
  elDoc.value = documento;

  idClienteEditando = id;
  const btn = document.querySelector("#formCliente button");
  if (btn) {
    btn.textContent = "Atualizar";
    btn.classList.replace("bg-blue-600", "bg-yellow-600");
  }
}

async function removerCliente(id) {
  if (!confirm("Deseja realmente excluir este cliente?")) return;
  try {
    const res = await fetch(`/clientes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const txt = await res.text();
      alert("Erro ao excluir cliente: " + txt);
      return;
    }
    alert("✅ Cliente excluído com sucesso!");
    carregarClientes();
    carregarClientesSelect();
  } catch (err) {
    console.error("Erro ao remover cliente:", err);
    alert("Erro ao excluir cliente (ver console).");
  }
}

// Form clientes
(function hookupFormCliente(){
  const formCliente = document.getElementById("formCliente");
  if (!formCliente) return;
  formCliente.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("nome").value.trim();
    const tipo = document.getElementById("tipo").value.trim();
    const documento = document.getElementById("documento").value.trim();

    if (!nome || !documento) {
      alert("Preencha nome e documento.");
      return;
    }

    try {
      if (idClienteEditando) {
        await fetchJson(`/clientes/${idClienteEditando}`, {
          method: "PUT",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ nome, tipo, documento })
        });
        alert("✅ Cliente atualizado!");
        idClienteEditando = null;
      } else {
        await fetchJson("/clientes", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ nome, tipo, documento })
        });
        alert("✅ Cliente cadastrado!");
      }
      formCliente.reset();
      const btn = document.querySelector("#formCliente button");
      if (btn) { btn.textContent = "Salvar"; btn.classList.replace("bg-yellow-600","bg-blue-600"); }
      carregarClientes();
      carregarClientesSelect();
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
      alert("Erro ao salvar cliente (ver console).");
    }
  });
})();

// ==================== carregarClientesSelect (CORRIGIDA) ====================
async function carregarClientesSelect() {
  // Prioriza select com id 'id_cliente' (veículos), depois 'cliente_id' (pagamentos)
  const select = document.getElementById("id_cliente") || document.getElementById("cliente_id");
  if (!select) {
    console.log("carregarClientesSelect: nenhum select encontrado (id_cliente / cliente_id)");
    return;
  }

  try {
    const clientes = await fetchJson("/clientes");
    if (!Array.isArray(clientes) || clientes.length === 0) {
      select.innerHTML = '<option value="">Nenhum cliente encontrado</option>';
      select.disabled = true;
      return;
    }
    select.disabled = false;
    select.innerHTML = '<option value="">Selecione um cliente</option>' +
      clientes.map(c => `<option value="${c.id_cliente}">${c.nome} (${c.tipo})</option>`).join("");
    console.log("carregarClientesSelect: preenchido com", clientes.length, "clientes");
  } catch (err) {
    select.innerHTML = '<option value="">Erro ao carregar clientes</option>';
  }
}

// ==================== VEÍCULOS ====================
let idVeiculoEditando = null;

async function carregarVeiculos() {
  const tabela = document.getElementById("listaVeiculos");
  if (!tabela) return;

  try {
    const data = await fetchJson("/veiculos");
    tabela.innerHTML = data.map(v => `
      <tr class="text-center border-t">
        <td>${v.placa}</td>
        <td>${v.modelo ?? ""}</td>
        <td>${v.cor ?? ""}</td>
        <td>${v.cliente ?? ""}</td>
        <td>
          <button onclick="editarVeiculo(${v.id_veiculo}, '${escapeJS(v.placa)}', '${escapeJS(v.modelo)}', '${escapeJS(v.cor)}', ${v.id_cliente})"
                  class="bg-yellow-500 text-white px-2 py-1 rounded">Editar</button>
          <button onclick="removerVeiculo(${v.id_veiculo})"
                  class="bg-red-500 text-white px-2 py-1 rounded">Excluir</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tabela.innerHTML = `<tr><td colspan="5" class="text-red-500 p-2">Erro ao carregar veículos</td></tr>`;
  }
}

function editarVeiculo(id, placa, modelo, cor, id_cliente) {
  const elPlaca = document.getElementById("placa");
  if (!elPlaca) return;
  document.getElementById("placa").value = placa;
  document.getElementById("modelo").value = modelo || "";
  document.getElementById("cor").value = cor || "";
  document.getElementById("id_cliente").value = id_cliente || "";

  idVeiculoEditando = id;
  const btn = document.querySelector("#formVeiculo button");
  if (btn) { btn.textContent = "Atualizar"; btn.classList.replace("bg-blue-600","bg-yellow-600"); }
}

async function removerVeiculo(id) {
  if (!confirm("Deseja realmente excluir este veículo?")) return;
  try {
    const res = await fetch(`/veiculos/${id}`, { method: "DELETE" });
    if (!res.ok) { const t = await res.text(); throw new Error(t); }
    alert("✅ Veículo excluído!");
    carregarVeiculos();
    carregarVeiculosRegistro();
  } catch (err) {
    console.error("Erro ao remover veículo:", err);
    alert("Erro ao remover veículo (ver console).");
  }
}

// form veiculo hookup
(function hookupFormVeiculo(){
  const formVeiculo = document.getElementById("formVeiculo");
  if (!formVeiculo) return;
  formVeiculo.addEventListener("submit", async (e) => {
    e.preventDefault();
    const placa = (document.getElementById("placa")||{}).value || "";
    const modelo = (document.getElementById("modelo")||{}).value || "";
    const cor = (document.getElementById("cor")||{}).value || "";
    const id_cliente = (document.getElementById("id_cliente")||{}).value || "";

    if (!placa || !id_cliente) { alert("Placa e cliente são obrigatórios."); return; }

    try {
      if (idVeiculoEditando) {
        await fetchJson(`/veiculos/${idVeiculoEditando}`, {
          method: "PUT",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ placa, modelo, cor, id_cliente })
        });
        alert("✅ Veículo atualizado!");
        idVeiculoEditando = null;
      } else {
        await fetchJson("/veiculos", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ placa, modelo, cor, id_cliente })
        });
        alert("✅ Veículo cadastrado!");
      }

      formVeiculo.reset();
      const btn = document.querySelector("#formVeiculo button");
      if (btn) { btn.textContent = "Salvar"; btn.classList.replace("bg-yellow-600","bg-blue-600"); }
      carregarVeiculos();
      carregarVeiculosRegistro();
    } catch (err) {
      console.error("Erro ao salvar veículo:", err);
      alert("Erro ao salvar veículo (ver console).");
    }
  });
})();

// ==================== REGISTROS (edição + exclusão) ====================
let idRegistroEditando = null;

async function carregarVeiculosRegistro() {
  const select = document.getElementById("veiculo_id");
  if (!select) return;
  select.innerHTML = "<option>Carregando veículos...</option>";
  try {
    const veiculos = await fetchJson("/veiculos");
    if (!veiculos || veiculos.length === 0) {
      select.innerHTML = '<option value="">Nenhum veículo cadastrado</option>';
      return;
    }
    select.innerHTML = '<option value="">Selecione um veículo</option>' + veiculos.map(v => `<option value="${v.id_veiculo}">${v.placa} - ${v.modelo||''}</option>`).join("");
  } catch (err) {
    select.innerHTML = '<option value="">Erro ao carregar veículos</option>';
  }
}

async function carregarRegistros() {
  const tabela = document.getElementById("tabelaRegistros");
  if (!tabela) return;
  try {
    const registros = await fetchJson("/registros");
    if (!registros.length) {
      tabela.innerHTML = '<tr><td colspan="5" class="text-center p-2 text-gray-500">Nenhum registro encontrado.</td></tr>';
      return;
    }
    tabela.innerHTML = registros.map(r => `
      <tr>
        <td class="border p-2">${r.placa}</td>
        <td class="border p-2">${r.cliente}</td>
        <td class="border p-2">${r.status}</td>
        <td class="border p-2">${new Date(r.data_hora).toLocaleString()}</td>
        <td class="border p-2 text-center">
          <button onclick="editarRegistro(${r.id_registro}, ${r.id_veiculo}, '${r.status}')"
            class="bg-yellow-500 text-white px-2 py-1 rounded">Editar</button>
          <button onclick="removerRegistro(${r.id_registro})"
            class="bg-red-500 text-white px-2 py-1 rounded">Excluir</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tabela.innerHTML = '<tr><td colspan="5" class="text-red-500 p-2">Erro ao carregar registros</td></tr>';
  }
}

function editarRegistro(id, id_veiculo, status) {
  const sel = document.getElementById("veiculo_id");
  if (sel) sel.value = id_veiculo;
  const st = document.getElementById("status");
  if (st) st.value = status;
  idRegistroEditando = id;
  const btn = document.querySelector("#formRegistro button");
  if (btn) { btn.textContent = "Atualizar"; btn.classList.replace("bg-blue-600","bg-yellow-600"); }
}

async function removerRegistro(id) {
  if (!confirm("Deseja realmente excluir este registro?")) return;
  try {
    const res = await fetch(`/registros/${id}`, { method: "DELETE" });
    if (!res.ok) { const t = await res.text(); throw new Error(t); }
    alert("✅ Registro excluído!");
    carregarRegistros();
  } catch (err) {
    console.error("Erro ao remover registro:", err);
  }
}

(function hookupFormRegistro(){
  const formRegistro = document.getElementById("formRegistro");
  if (!formRegistro) return;
  formRegistro.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id_veiculo = document.getElementById("veiculo_id").value;
    const status = document.getElementById("status").value;
    if (!id_veiculo || !status) { alert("Selecione veículo e status"); return; }
    try {
      if (idRegistroEditando) {
        await fetchJson(`/registros/${idRegistroEditando}`, {
          method: "PUT",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ id_veiculo, status })
        });
        alert("✅ Registro atualizado!");
        idRegistroEditando = null;
      } else {
        await fetchJson("/registros", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ id_veiculo, status })
        });
        alert("✅ Registro salvo!");
      }
      formRegistro.reset();
      const btn = document.querySelector("#formRegistro button");
      if (btn) { btn.textContent = "Salvar"; btn.classList.replace("bg-yellow-600","bg-blue-600"); }
      carregarRegistros();
    } catch (err) {
      console.error("Erro ao salvar registro:", err);
      alert("Erro ao salvar registro (ver console).");
    }
  });
})();

// ==================== OCR Reconhecimento (reconhecimento.html) ====================
if (window.location.pathname.includes("reconhecimento")) {
  // delay hookup until DOM ready
  window.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const resultado = document.getElementById("resultado");
    const btn = document.getElementById("capturar");
    if (!video || !canvas || !resultado || !btn) return;

    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => { video.srcObject = stream; })
      .catch(err => { resultado.textContent = "Erro ao acessar câmera: " + err.message; });

    btn.addEventListener("click", async () => {
      resultado.textContent = "Processando...";
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video,0,0,canvas.width,canvas.height);
      const imagemBase64 = canvas.toDataURL("image/png");
      try {
        const dados = await fetchJson("/reconhecer-placa", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ imagem: imagemBase64 })
        });
        if (dados.placa) resultado.textContent = `Placa detectada: ${dados.placa}`;
        else resultado.textContent = "Placa não reconhecida";
      } catch (err) {
        resultado.textContent = "Erro ao processar OCR (ver console)";
      }
    });
  });
}

// ==================== PAGAMENTOS ====================
let idPagamentoEditando = null;

async function carregarPagamentos() {
  const tabela = document.getElementById("listaPagamentos");
  if (!tabela) return;
  try {
    const data = await fetchJson("/pagamentos");
    if (!data || data.length === 0) {
      tabela.innerHTML = `<tr><td colspan="5" class="text-center text-gray-400 py-3">Nenhum pagamento registrado.</td></tr>`;
      return;
    }
    tabela.innerHTML = data.map(p => `
      <tr class="text-center border-t border-gray-700">
        <td class="p-3">${p.cliente}</td>
        <td class="p-3 text-green-400 font-semibold">R$ ${Number(p.valor).toFixed(2)}</td>
        <td class="p-3">${p.metodo}</td>
        <td class="p-3">${new Date(p.data_hora).toLocaleString("pt-BR")}</td>
        <td class="p-3">
          <button onclick="editarPagamento(${p.id_pagamento}, ${p.id_cliente}, ${Number(p.valor)}, '${escapeJS(p.metodo)}')"
            class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm">Editar</button>
          <button onclick="removerPagamento(${p.id_pagamento})"
            class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">Excluir</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tabela.innerHTML = `<tr><td colspan="5" class="text-red-500 p-2">Erro ao carregar pagamentos</td></tr>`;
  }
}

function editarPagamento(id, id_cliente, valor, metodo) {
  const sel = document.getElementById("cliente_id");
  if (sel) sel.value = id_cliente;
  const val = document.getElementById("valor");
  if (val) val.value = valor;
  const met = document.getElementById("metodo");
  if (met) met.value = metodo;
  idPagamentoEditando = id;
  const btn = document.querySelector("#formPagamento button");
  if (btn) { btn.textContent = "Atualizar Pagamento"; btn.classList.replace("bg-indigo-600","bg-yellow-600"); }
}

async function removerPagamento(id) {
  if (!confirm("Deseja realmente excluir este pagamento?")) return;
  try {
    const res = await fetch(`/pagamentos/${id}`, { method: "DELETE" });
    if (!res.ok) { const t = await res.text(); throw new Error(t); }
    alert("Pagamento excluído!");
    carregarPagamentos();
  } catch (err) {
    console.error("Erro ao excluir pagamento:", err);
  }
}

(function hookupFormPagamento(){
  const formPagamento = document.getElementById("formPagamento");
  if (!formPagamento) return;
  formPagamento.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id_cliente = document.getElementById("cliente_id").value;
    const valor = document.getElementById("valor").value;
    const metodo = document.getElementById("metodo").value;
    if (!id_cliente || !valor || !metodo) { alert("Preencha todos os campos"); return; }

    try {
      let res;
      if (idPagamentoEditando) {
        res = await fetch(`/pagamentos/${idPagamentoEditando}`, {
          method: "PUT",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ id_cliente, valor, metodo })
        });
        idPagamentoEditando = null;
        alert("Pagamento atualizado!");
      } else {
        res = await fetch("/pagamentos", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ id_cliente, valor, metodo })
        });
        alert("Pagamento registrado!");
      }
      if (!res.ok) throw new Error("Erro no servidor");
      formPagamento.reset();
      const btn = document.querySelector("#formPagamento button");
      if (btn) { btn.textContent = "💾 Registrar Pagamento"; btn.classList.replace("bg-yellow-600","bg-indigo-600"); }
      carregarPagamentos();
    } catch (err) {
      console.error("Erro ao salvar pagamento:", err);
      alert("Erro ao salvar pagamento (ver console).");
    }
  });
})();



// ==================== CAPTURA DE PLACA (AJUSTADO) ====================
if (window.location.pathname.includes("reconhecimento")) {
  document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const capturarBtn = document.getElementById("capturar");
    const resultado = document.getElementById("resultado");
    if (!video || !canvas || !capturarBtn || !resultado) return;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => (video.srcObject = stream))
        .catch(() => alert("Erro ao acessar a câmera."));
    }

    capturarBtn.addEventListener("click", async () => {
      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      resultado.textContent = "⏳ Processando imagem...";

      try {
        const { data: { text } } = await Tesseract.recognize(canvas, "eng");
        const placa = text.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 7);

        if (!placa) {
          resultado.textContent = "❌ Não foi possível reconhecer a placa.";
          return;
        }

        resultado.textContent = `🔍 Placa reconhecida: ${placa}`;

        const resposta = await fetch("http://localhost:3000/reconhecimento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placa }),
        });

        const data = await resposta.json();
        if (!resposta.ok) throw new Error(data.error || "Erro no servidor.");

        if (data.status === "entrada") {
          resultado.textContent = `✅ Veículo ${placa} registrado como ENTRADA (${data.veiculo.modelo}).`;
        } else if (data.status === "saida") {
          resultado.textContent = `🚗 Veículo ${placa} registrado como SAÍDA.`;
        } else {
          resultado.textContent = `⚠️ Veículo ${placa} não encontrado no sistema.`;
        }
      } catch (err) {
        console.error(err);
        resultado.textContent = "❌ Erro ao processar a imagem.";
      }
    });
  });
}

function exportarPDF(tipo) {
  const empresaNome = localStorage.getItem("empresaNome") || "SmartVaga";
  window.open(`http://localhost:3000/exportar/${tipo}?empresa=${encodeURIComponent(empresaNome)}`, "_blank");
}



// ==================== INICIALIZAÇÃO ====================
window.addEventListener("DOMContentLoaded", () => {
  // chama todas as que fazem sentido na página atual
  carregarClientes().catch(()=>{});
  carregarClientesSelect().catch(()=>{});
  carregarVeiculos().catch(()=>{});
  carregarVeiculosRegistro().catch(()=>{});
  carregarRegistros().catch(()=>{});
  carregarPagamentos().catch(()=>{});
});

