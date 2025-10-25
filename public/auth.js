// auth.js — protege as páginas e gerencia login/logout

// Verifica se empresa está logada
function verificarLogin() {
  const empresa = localStorage.getItem("empresaLogada");
  if (!empresa) {
    // redireciona se não estiver logada
    window.location.href = "login.html";
  }
}

// Exibe o nome da empresa no topo
function mostrarEmpresa() {
  const empresa = JSON.parse(localStorage.getItem("empresaLogada") || "{}");
  if (empresa.nome) {
    const nomeEl = document.getElementById("empresaNome");
    if (nomeEl) nomeEl.textContent = empresa.nome;
  }
}

// Logout
function sair() {
  localStorage.removeItem("empresaLogada");
  window.location.href = "login.html";
}
