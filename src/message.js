const { connectToDatabase } = require("./config/connect");
const ClientModel = require("./models/client_model");
const MenuModel = require("./models/menu_model");

module.exports = async (client) => {
  await connectToDatabase();

  // Adicione uma variável para armazenar o estado de espera pelo nome
  let waitingForName = false;

  client.on("message", async (message) => {
    const phoneNumber = message.from;

    // Verificar se o usuário já tem um nome registrado
    let clientData = await ClientModel.findOne({ phoneNumber });
    if (!clientData) {
      // O usuário é novo, crie um novo documento com nome vazio
      clientData = new ClientModel({
        name: "",
        phoneNumber,
      });
      await clientData.save();
    }

    // Se o bot está aguardando o nome do usuário, salve o nome no banco de dados
    if (waitingForName) {
      clientData.name = message.body;
      await clientData.save(); // Salva o nome no banco de dados
      await client.sendMessage(
        phoneNumber,
        `Olá, ${clientData.name}! Como posso ajudá-lo hoje?`
      );
      // Exibir menu de opções
      const menuOptions = await MenuModel.find({});
      let menuText = "Por favor, escolha uma opção:\n";
      menuOptions.forEach((option) => {
        menuText += `${option.optionNumber} - ${option.description}\n`;
      });
      await client.sendMessage(phoneNumber, menuText);
      waitingForName = false; // Redefine o estado para não aguardar mais o nome
    } else {
      // Se não está aguardando o nome, solicite o nome
      await client.sendMessage(
        phoneNumber,
        "Olá! Seja bem-vindo ao nosso sistema de chat automatizado, para prosseguirmos por favor, me informe o seu nome.😊"
      );
      waitingForName = true; // Define o estado para aguardar o nome
    }
  });
};
