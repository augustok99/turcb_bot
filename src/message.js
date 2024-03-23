import connectToDatabase from "./connect.js";
import ClientModel from "./models/client_model.js";
import MenuModel from "./models/menu_model.js";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import HotelModel from "./models/hotel_model.js";
import RestaurantModel from "./models/restaurant_model.js";
import AttractionModel from "./models/attraction_model.js";

const handleMessage = async (client) => {
  try {
    // Estabelecer conexão com o banco de dados antes de lidar com mensagens
    await connectToDatabase();
  } catch (error) {
    console.error("Erro ao conectar ao banco de dados:", error);
    return; // Encerrar a função se ocorrer um erro na conexão
  }

  const userState = {}; // Objeto para rastrear o estado do usuário

  client.on("message", async (message) => {
    const phoneNumber = message.from;

    const contact = await message.getContact();

    const user = contact.pushname;
    const number = contact.number;

    const convertNumber = parsePhoneNumberFromString(number, "BR");
    const formattedNumber = convertNumber.formatInternational();

    try {
      // Verificar se o usuário já tem um nome registrado
      let clientData = await ClientModel.findOne({
        phoneNumber: formattedNumber,
      });
      if (!clientData) {
        // O usuário é novo, crie um novo documento com nome vazio
        clientData = new ClientModel({
          name: user, // Salva o nome do contato no banco de dados
          phoneNumber: formattedNumber,
        });
        await clientData.save();
      }

      // Verificar se o usuário já recebeu a mensagem de boas-vindas e o menu
      if (!userState[phoneNumber]) {
        // Enviar mensagem de boas-vindas
        await client.sendMessage(
          phoneNumber,
          `Olá, ${user}! Seja bem-vindo ao nosso sistema de chat automatizado. Eu sou o botzap, seu guia turístico. Irei te auxiliar a escolher hotéis, restaurantes ou pontos turísticos da cidade.`
        );

        sendMainMenu(client, phoneNumber, userState);
      }

      // Verifica se o estado do usuário indica que estamos aguardando uma escolha de opção
      if (userState[phoneNumber] && userState[phoneNumber].state === "AWAITING_CHOICE") {
        const userChoice = parseInt(message.body.trim());
        // Executa a lógica com base na escolha do usuário
        await handleUserChoice(client, phoneNumber, userChoice, userState);

      } else if (userState[phoneNumber] && ["AWAITING_HOTEL_SELECTION", "AWAITING_RESTAURANT_SELECTION", "AWAITING_ATTRACTION_SELECTION"].includes(userState[phoneNumber].state)) {
        const userChoice = parseInt(message.body.trim());
        await sendDetails(client, phoneNumber, userState, userChoice);
      }
    } catch (error) {
      console.error("Erro ao processar mensagem:", error);
    }
  });
};

const sendMainMenu = async (client, phoneNumber, userState) => {
  setTimeout(async () => {
    const menuOptions = await MenuModel.find({});
    let menuText = "Por favor, escolha uma opção:\n";
    menuOptions.forEach((option) => {
      menuText += `${option.optionNumber} - ${option.description}\n`;
    });
    await client.sendMessage(phoneNumber, menuText);
    if (!userState[phoneNumber]) {
      userState[phoneNumber] = {};
    }
    userState[phoneNumber].state = "AWAITING_CHOICE";
  }, 2000);
};

const handleUserChoice = async (client, phoneNumber, userChoice, userState) => {
  switch (userChoice) {
    case 1:
      await sendList(client, phoneNumber, 1, userState);
      break;
    case 2:
      await sendList(client, phoneNumber, 2, userState);
      break;
    case 3:
      await sendList(client, phoneNumber, 3, userState);
      break;
    case 4:
      await client.sendMessage(
        phoneNumber,
        "Atendimento encerrado. Obrigado!"
      ); // Encerra o atendimento
      userState[phoneNumber].state = null;
      break;
    default:
      await client.sendMessage(
        phoneNumber,
        "Opção inválida. Por favor, escolha uma opção válida."
      );
  }
};



const sendList = async (client, phoneNumber, userChoice, userState) => {
  let itemType = ""
  try {
    let listGetter;
    switch (userChoice) {
      case 1:
        listGetter = getHotels;
        itemType = "hotel";
        break;
      case 2:
        listGetter = getRestaurants;
        itemType = "restaurant";
        break;
      case 3:
        listGetter = getAttractions;
        itemType = "attraction";
        break;
      default:
        await client.sendMessage(
          phoneNumber,
          "Opção inválida. Por favor, escolha uma opção válida."
        );
        return;
    }

    const items = await listGetter();
    if (items.length > 0) {
      let itemList = `Escolha um ${itemType} disponível para mais detalhes:\n`;
      for (let i = 0; i < Math.min(items.length, 5); i++) {
        itemList += `${i + 1}. ${items[i].name}\n`;
      }
      await client.sendMessage(phoneNumber, itemList);
      userState[phoneNumber].state = `AWAITING_${itemType.toUpperCase()}_SELECTION`;
    } else {
      await client.sendMessage(
        phoneNumber,
        `Não há ${itemType}s disponíveis no momento.`
      );
    }
  } catch (error) {
    console.error(`Erro ao buscar ${itemType}s:`, error);
    await client.sendMessage(
      phoneNumber,
      `Ocorreu um erro ao buscar ${itemType}s. Por favor, tente novamente mais tarde.`
    );
  }
};

const sendDetails = async (client, phoneNumber, userState, userChoice) => {
  let listGetter;
  let itemType;
  try {
    switch (userState[phoneNumber].state) {
      case "AWAITING_HOTEL_SELECTION":
        listGetter = getHotels();
        itemType = "hotel";
        break;
      case "AWAITING_RESTAURANT_SELECTION":
        listGetter = getRestaurants();
        itemType = "restaurant";
        break;
      case "AWAITING_ATTRACTION_SELECTION":
        listGetter = getAttractions();
        itemType = "attraction";
        break;
    }

    const items = await listGetter;
    if (userChoice === 0) {
      sendMainMenu(client, phoneNumber, userState);
    } else if (userChoice >= 1 && userChoice <= items.length) {
      const selectedItem = items[userChoice - 1];
      const itemDetails = `Nome: ${selectedItem.name}\nEndereço: ${selectedItem.address}\nAvaliação: ${selectedItem.rating}\nAvaliações Totais: ${selectedItem.user_ratings_total}\nCoordenadas: ${selectedItem.coordinates}\nFotos: ${selectedItem.photos}\nPara voltar ao menu anterior, digite 0`;
      await client.sendMessage(phoneNumber, itemDetails);
    } else {
      // Caso o número da escolha esteja fora dos limites, enviar uma mensagem de erro
      await client.sendMessage(
        phoneNumber,
        "Opção inválida. Por favor, escolha uma opção válida."
      );
    }
  } catch (error) {
    console.error(`Erro ao buscar ${itemType}s:`, error);
    await client.sendMessage(
      phoneNumber,
      `Ocorreu um erro ao buscar ${itemType}s. Por favor, tente novamente mais tarde.`
    );
  }
};

const getHotels = async () => {
  try {
    // Buscar todos os hotéis na coleção de hotéis
    const hotels = await HotelModel.find({}, { name: 1, address: 1, rating: 1, user_ratings_total: 1, coordinates: 1, photos: 1 }).limit(5);
    return hotels;
  } catch (error) {
    console.error("Erro ao buscar hotéis:", error);
    throw error;
  }
};

// Função para buscar restaurantes no MongoDB
const getRestaurants = async () => {
  try {
    // Buscar todos os restaurantes na coleção de restaurantes
    const restaurants = await RestaurantModel.find({}, { name: 1, address: 1, rating: 1, user_ratings_total: 1, coordinates: 1, photos: 1 }).limit(5);
    return restaurants;
  } catch (error) {
    console.error("Erro ao buscar restaurantes:", error);
    throw error;
  }
};

// Função para buscar atrações no MongoDB
const getAttractions = async () => {
  try {
    // Buscar todas as atrações na coleção de atrações
    const attractions = await AttractionModel.find({}, { name: 1, address: 1, rating: 1, user_ratings_total: 1, coordinates: 1, photos: 1 }).limit(5);
    return attractions;
  } catch (error) {
    console.error("Erro ao buscar atrações:", error);
    throw error;
  }
};

export default handleMessage;
