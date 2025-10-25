// Cadastro de empresa
const formCadastro = document.getElementById("formCadastro");
if (formCadastro) {
  formCadastro.addEventListener("submit", async e => {
    e.preventDefault();

    const dados = {
      nome: nome.value,
      email: email.value,
      senha: senha.value
    };

    const res = await fetch("/empresa/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });

    const resultado = await res.json();
    const msg = document.getElementById("mensagem");

    if (res.ok) {
      msg.classList.remove("text-red-500");
      msg.classList.add("text-green-600");
      msg.textContent = resultado.message;
      setTimeout(() => (window.location.href = "login.html"), 1500);
    } else {
      msg.textContent = resultado.erro || "Erro ao cadastrar.";
    }
  });
}

// Login de empresa
const formLogin = document.getElementById("formLogin");
if (formLogin) {
  formLogin.addEventListener("submit", async e => {
    e.preventDefault();

    const dados = {
      email: email.value,
      senha: senha.value
    };

    const res = await fetch("/empresa/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });

    const resultado = await res.json();
    const msg = document.getElementById("mensagem");

    if (res.ok) {
      localStorage.setItem("empresa", JSON.stringify(resultado.empresa));
      window.location.href = "index.html";
    } else {
      msg.textContent = resultado.erro || "Falha no login.";
    }
  });
}
