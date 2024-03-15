import { connectToDatabase } from "./config/connect.js";
import ClientModel from "./models/client_model.js";
import MenuModel from "./models/menu_model.js";

const handleMessage = async (client) => {
  await connectToDatabase();

  client.on("message", async (message) => {
    const phoneNumber = message.from;

    let user;

    const contact = await message.getContact();
    user = contact.pushname;

    console.log(user);

    // Verificar se o usuário já tem um nome registrado
    let clientData = await ClientModel.findOne({ phoneNumber });
    if (!clientData) {
      // O usuário é novo, crie um novo documento com nome vazio
      clientData = new ClientModel({
        name: user, // Salva o nome do contato no banco de dados
        phoneNumber,
      });
      await clientData.save();

      await client.sendMessage(
        phoneNumber,
        `Olá, ${user}! Seja bem-vindo ao nosso sistema de chat automatizado. Eu sou o botzap, seu guia turístico. Irei te auxiliar a escolher hotéis, restaurantes ou pontos turísticos da cidade.`
      );
    }

    // Exibir menu de opções
    const menuOptions = await MenuModel.find({});
    let menuText = "Por favor, escolha uma opção:\n";
    menuOptions.forEach((option) => {
      menuText += `${option.optionNumber} - ${option.description}\n`;
    });
    await client.sendMessage(phoneNumber, menuText);
  });
};

export default handleMessage;
