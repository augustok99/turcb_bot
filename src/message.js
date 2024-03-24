import connectToDatabase from "./connect.js";
import ClientModel from "./models/client_model.js";
import MenuModel from "./models/menu_model.js";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import HotelModel from "./models/hotel_model.js";
import RestaurantModel from "./models/restaurant_model.js";
import AttractionModel from "./models/attraction_model.js";
import pkg from 'whatsapp-web.js';
import EvaluationModel from './models/evaluation_model.js';
const { MessageMedia } = pkg;



const handleMessage = async (client) => {


  try {
    await connectToDatabase();
  } catch (error) {
    console.error("Erro ao conectar ao banco de dados:", error);
    return;
  }

  const userState = {};

  client.on("message", async (message) => {
    const phoneNumber = message.from;

    const contact = await message.getContact();

    const user = contact.pushname;
    const number = contact.number;

    const convertNumber = parsePhoneNumberFromString(number, "BR");
    const formattedNumber = convertNumber.formatInternational();

    try {
      let clientData = await ClientModel.findOne({
        phoneNumber: formattedNumber,
      });
      if (!clientData) {
        clientData = new ClientModel({
          name: user,
          phoneNumber: formattedNumber,
        });
        await clientData.save();
      }

      if (!userState[phoneNumber]) {
        await client.sendMessage(
          phoneNumber,
          `Olá, ${user}! Seja bem-vindo ao nosso sistema de chat automatizado. Eu sou o botzap, seu guia turístico. Irei te auxiliar a escolher hotéis, restaurantes ou pontos turísticos da cidade.`
        );

        userState[phoneNumber] = {};

        sendMainMenu(client, phoneNumber, userState);
      }

      if (userState[phoneNumber] && userState[phoneNumber].state === "AWAITING_CHOICE") {
        const userChoice = parseInt(message.body.trim());
        await handleUserChoice(client, phoneNumber, userChoice, userState, user, message);

      } else if (userState[phoneNumber] && ["AWAITING_HOTEL_SELECTION", "AWAITING_RESTAURANT_SELECTION", "AWAITING_ATTRACTION_SELECTION", "AWAITING_MORE_ITEMS"].includes(userState[phoneNumber].state)) {
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
    let menuText = "Por favor, escolha uma opção:\n\n";
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

const handleUserChoice = async (client, phoneNumber, userChoice, userState, user) => {
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
      // Definir o estado como "COLLECTING_FEEDBACK"
      userState[phoneNumber].state = "COLLECTING_FEEDBACK";
      // Chamar diretamente a função collectFeedback
      collectFeedback(client, phoneNumber, userState, user);
      break;
    default:
      await client.sendMessage(
        phoneNumber,
        "Opção inválida. Por favor, escolha uma opção válida."
      );
  }
};


const sendList = async (client, phoneNumber, lastUserChoice, userState, startIndex = 0) => {
  let itemType = "";
  let awaitingState;
  try {
    let listGetter;
    switch (lastUserChoice) {
      case 1:
        listGetter = getHotels;
        itemType = "hotel";
        awaitingState = `AWAITING_${itemType.toUpperCase()}_SELECTION`;
        break;
      case 2:
        listGetter = getRestaurants;
        itemType = "restaurant";
        awaitingState = `AWAITING_${itemType.toUpperCase()}_SELECTION`;
        break;
      case 3:
        listGetter = getAttractions;
        itemType = "attraction";
        awaitingState = `AWAITING_${itemType.toUpperCase()}_SELECTION`;
        break;
      default:
        await client.sendMessage(
          phoneNumber,
          "Opção inválida. Por favor, escolha uma opção válida."
        );
        return;
    }

    const items = await listGetter(startIndex, 5);
    if (items.length > 0) {
      let itemList = `Escolha um ${translateItemType(itemType)} disponível para mais detalhes:\n\n`;
      for (let i = 0; i < items.length; i++) {
        itemList += `${i + 1}. ${items[i].name}\n`;
      }

      itemList += "6. Ver mais itens\n"; // Adiciona uma opção para ver mais itens
      itemList += "0. Voltar ao menu anterior\n";
      await client.sendMessage(phoneNumber, itemList);
      // Atualiza o estado do usuário para aguardar mais itens
      userState[phoneNumber].state = awaitingState;
      userState[phoneNumber].lastUserChoice = lastUserChoice;
      userState[phoneNumber].startIndex = startIndex;
    } else {
      await client.sendMessage(
        phoneNumber,
        `Não há ${translateItemType(itemType)} disponíveis no momento.`
      );
    }
  } catch (error) {
    console.error(`Erro ao buscar ${translateItemType(itemType)}:`, error);
    await client.sendMessage(
      phoneNumber,
      `Ocorreu um erro ao buscar ${translateItemType(itemType)}. Por favor, tente novamente mais tarde.`
    );
  }
};




const sendDetails = async (client, phoneNumber, userState, userChoice) => {
  let itemsPerPage = 5;
  let itemType;
  try {
    if (!userState[phoneNumber]) {
      userState[phoneNumber] = {};
    }

    let listGetter;

    switch (userState[phoneNumber].state) {
      case "AWAITING_HOTEL_SELECTION":
        listGetter = getHotels;
        itemType = "hotel";
        break;
      case "AWAITING_RESTAURANT_SELECTION":
        listGetter = getRestaurants;
        itemType = "restaurant";
        break;
      case "AWAITING_ATTRACTION_SELECTION":
        listGetter = getAttractions;
        itemType = "attraction";
        break;
      default:
        console.error(`Estado desconhecido: ${userState[phoneNumber].state}`);
        return;
    }

    if (userChoice === 0) {
      sendMainMenu(client, phoneNumber, userState);
    } else if (userChoice >= 1 && userChoice <= itemsPerPage) {
      const items = await listGetter(userState[phoneNumber].startIndex, itemsPerPage);
      const selectedItem = items[userChoice - 1];
      const location = `https://maps.google.com/maps?q=${selectedItem.coordinates.lat},${selectedItem.coordinates.lng}&z=17&hl=br`;
      const itemDetails = `Nome: ${selectedItem.name}\nEndereço: ${selectedItem.address}\nAvaliação: ${selectedItem.rating}\nAvaliações Totais: ${selectedItem.user_ratings_total}`;

      await client.sendMessage(phoneNumber, itemDetails);
      await client.sendMessage(phoneNumber, `Localização: ${location}`);

      for (let i = 0; i < selectedItem.photos.length; i++) {
        try {
          const media = await MessageMedia.fromUrl(selectedItem.photos[i], { unsafeMime: true });
          await client.sendMessage(phoneNumber, media, { caption: `Imagem ${i + 1}` });
        } catch (error) {
          console.error('Erro ao enviar imagem:', error);
        }
      }

      await client.sendMessage(phoneNumber, "Para voltar ao menu anterior digite 0");

    } else if (userChoice === 6) {
      const startIndex = userState[phoneNumber].startIndex + itemsPerPage;
      const lastUserChoice = userState[phoneNumber].lastUserChoice || 1;
      await sendList(client, phoneNumber, lastUserChoice, userState, startIndex);
    } else {
      await client.sendMessage(
        phoneNumber,
        "Opção inválida. Por favor, escolha uma opção válida."
      );
    }
  } catch (error) {
    console.error(`Erro ao buscar ${translateItemType(itemType)}:`, error);
    await client.sendMessage(
      phoneNumber,
      `Ocorreu um erro ao buscar ${translateItemType(itemType)}. Por favor, tente novamente mais tarde.`
    );
  }
};



const getHotels = async (startIndex = 0, itemsPerPage = 5) => {
  try {
    const hotels = await HotelModel.find({}, { name: 1, address: 1, rating: 1, user_ratings_total: 1, coordinates: 1, photos: 1 }).skip(startIndex).limit(itemsPerPage);
    return hotels;
  } catch (error) {
    console.error("Erro ao buscar hotéis:", error);
    throw error;
  }
};

const getRestaurants = async (startIndex = 0, itemsPerPage = 5) => {
  try {
    const restaurants = await RestaurantModel.find({}, { name: 1, address: 1, rating: 1, user_ratings_total: 1, coordinates: 1, photos: 1 }).skip(startIndex).limit(itemsPerPage);
    return restaurants;
  } catch (error) {
    console.error("Erro ao buscar restaurantes:", error);
    throw error;
  }
};

const getAttractions = async (startIndex = 0, itemsPerPage = 5) => {
  try {
    const attractions = await AttractionModel.find({}, { name: 1, address: 1, rating: 1, user_ratings_total: 1, coordinates: 1, photos: 1 }).skip(startIndex).limit(itemsPerPage);
    return attractions;
  } catch (error) {
    console.error("Erro ao buscar atrações:", error);
    throw error;
  }
};

const collectFeedback = (client, phoneNumber, userState, user) => {
  // Variável de controle para determinar se o listener deve processar a mensagem
  let isCollectingFeedback = true;

  // Enviar mensagem inicial informando ao usuário para fornecer sua avaliação
  client.sendMessage(
    phoneNumber,
    `Por favor, forneça sua avaliação de 1 a 5 estrelas para o nosso chatbot corumbaense.`
  );

  const messageListener = async (message) => {
    if (!isCollectingFeedback) {
      return;
    }

    const rating = parseInt(message.body.trim());
    if (isNaN(rating) || rating < 1 || rating > 5) {
      await client.sendMessage(
        phoneNumber,
        `Por favor, forneça uma avaliação válida de 1 a 5 estrelas.`
      );
    } else {
      // Salvar a avaliação no banco de dados
      const evaluation = new EvaluationModel({
        clientName: user,
        phoneNumber: phoneNumber,
        rating: rating,
      });
      await evaluation.save();

      // Confirmar ao cliente que a avaliação foi recebida
      await client.sendMessage(
        phoneNumber,
        `Agradecemos pela sua avaliação! Atendimento encerrado. Obrigado!`
      );

      // Atualizar o estado do usuário para indicar que o atendimento foi encerrado
      userState[phoneNumber].state = null;

      // Parar de processar mensagens para coleta de feedback
      isCollectingFeedback = false;

      // Remover o listener de mensagem após a coleta da avaliação
      client.removeListener('message', messageListener);
    }
  };

  // Adicionar listener de mensagem para coletar feedback
  client.on('message', messageListener);
};


const translateItemType = (itemType) => {
  switch (itemType) {
    case "hotel":
      return "Hotel";
    case "restaurant":
      return "Restaurante";
    case "attraction":
      return "Atração turística";
    default:
      return itemType;
  }
};



export default handleMessage;
