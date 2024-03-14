const { connectToDatabase } = require("./config/connect");
const ClientModel = require("./models/client_model");
const MenuModel = require("./models/menu_model");

module.exports = async (client) => {
  await connectToDatabase();

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

      await client.sendMessage(
        phoneNumber,
        "Olá! Seja bem-vindo ao nosso sistema de chat automatizado. Eu sou o botzap, seu guia turístico. Irei te auxiliar a escolher hotéis, restaurantes ou pontos turísticos da cidade."
      );

      // Exibir menu de opções
      const menuOptions = await MenuModel.find({});
      let menuText = "Por favor, escolha uma opção:\n";
      menuOptions.forEach((option) => {
        menuText += `${option.optionNumber} - ${option.description}\n`;
      });
      await client.sendMessage(phoneNumber, menuText);
    }
  });
};
