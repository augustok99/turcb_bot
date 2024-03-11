const botoes = document.getElementsByClassName('btn');

for (const botao of botoes) {
  botao.addEventListener('click', () => {
    botao.classList.remove('focus:bg-blue-bold');
  });
}