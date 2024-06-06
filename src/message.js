import connectToDatabase from "./connect.js";
import ClientModel from "./models/client_model.js";
import HotelModel from "./models/hotel_model.js";
import RestaurantModel from "./models/restaurant_model.js";
import AttractionModel from "./models/attraction_model.js";
import EvaluationModel from './models/evaluation_model.js';
import fs from 'fs';
import pkg from 'whatsapp-web.js';

const { MessageMedia } = pkg;
const userState = {};

// Carregar mensagens de log do arquivo JSON
const loadLogMessages = () => {
  try {
    const logMessagesData = fs.readFileSync('./src/interactions/log_messages.json', 'utf8');
    return JSON.parse(logMessagesData);
  } catch (error) {
    console.error('Erro ao carregar mensagens de log:', error);
    return {};
  }
};

const logMessages = loadLogMessages();

const handleMessage = async (client) => {
  try {
    await connectToDatabase();
  } catch (error) {
    console.error("Erro ao conectar ao banco de dados:", error);
    return;
  }

  client.on("message", async (message) => {
    const phoneNumber = message.from;
    const contact = await message.getContact();
    const user = contact.pushname; // Nome do usuário no contato do WhatsApp
    const formattedNumber = await contact.getFormattedNumber(); // Número de telefone do usuário formatado

    saveOrUpdateClient(formattedNumber, user);

    // Inicialize o estado do usuário se não estiver definido
    if (!userState[phoneNumber]) {
      userState[phoneNumber] = { state: "AWAITING_SELECT_LANGUAGE", isCollectingFeedback: false }; // Estado inicial para seleção de idioma
    }

    // Chame a função handleUserFlow para gerenciar o fluxo do usuário
    await handleUserFlow(client, phoneNumber, message, userState, user);
  });
};



// Função para carregar o menu a partir do arquivo JSON
const loadMenu = (language) => {
  try {
    const menuPath = `./src/menu/menu_${language}.json`;
    const menuData = fs.readFileSync(menuPath, 'utf8');
    const menu = JSON.parse(menuData);
    return menu;
  } catch (error) {
    console.error('Erro ao carregar o menu:', error);
    return [];
  }
};

const handleUserFlow = async (client, phoneNumber, message, userState, user) => {
  const currentState = userState[phoneNumber].state;

  if (userState[phoneNumber].isCollectingFeedback) {
    const messages = loadLogMessages();
    await messageListener(client, phoneNumber, userState, user, messages)(message);
    return;
  }

  // Adiciona uma verificação para mensagens novas em "LISTENING_ONLY"
  if (currentState === "LISTENING_ONLY" && message.timestamp > (userState[phoneNumber].lastMessageTimestamp || 0)) {
    userState[phoneNumber].state = "AWAITING_SELECT_LANGUAGE";
    await sendLanguageMenu(userState, phoneNumber, client);
    userState[phoneNumber].lastMessageTimestamp = message.timestamp; // Atualiza o timestamp da última mensagem processada
    return;
  }

  switch (currentState) {
    case "AWAITING_SELECT_LANGUAGE":
      await sendLanguageMenu(userState, phoneNumber, client);
      break;
    case "AWAITING_LANGUAGE_SELECTION":
      await handleLanguageSelection(message, userState, phoneNumber, client, user);
      break;
    case "AWAITING_WELCOME":
      await sendWelcomeMessage(client, phoneNumber, userState, user);
      break;
    case "AWAITING_POST_WELCOME":
      await sendMainMenu(client, phoneNumber, userState);
      break;
    case "AWAITING_CHOICE":
      await handleUserChoice(client, phoneNumber, userState, user, message);
      break;
    case "AWAITING_MORE_ITEMS":
      const choice = parseInt(message.body.trim());
      await sendDetails(client, phoneNumber, userState, choice);
      break;
    default:
      console.error("Estado inválido:", currentState);
      break;
  }
};



const saveOrUpdateClient = async (formattedNumber, user) => {
  try {
    let clientData = await ClientModel.findOne({ phoneNumber: formattedNumber });
    if (!clientData) {
      clientData = new ClientModel({ name: user, phoneNumber: formattedNumber });
      await clientData.save();
    }
  } catch (error) {
    console.error("Erro ao salvar ou atualizar cliente:", error);
    throw error;
  }
};


const sendLanguageMenu = async (userState, phoneNumber, client) => {
  const languageOptions = [
    { number: 1, language: 'pt', name: 'Português' },
    { number: 2, language: 'en', name: 'English' },
    { number: 3, language: 'es', name: 'Español' }
  ];

  let menuText = 'Please Choose a Language:\n\n';
  languageOptions.forEach(option => {
    menuText += `${option.number} - ${option.name}\n`;
  });

  await client.sendMessage(phoneNumber, menuText);

  userState[phoneNumber].state = 'AWAITING_LANGUAGE_SELECTION';
};

const sendMainMenu = async (client, phoneNumber, userState) => {
  try {
    const language = userState[phoneNumber].language || 'pt';
    const menu = loadMenu(language);
    const menuText = logMessages.menuText[language] || logMessages.menuText['pt'];

    if (menu.length === 0) {
      await client.sendMessage(phoneNumber, 'Desculpe, ocorreu um erro ao carregar o menu. Por favor, tente novamente mais tarde.');
      return;
    }

    let response = menuText;
    menu.forEach(option => {
      response += `${option.optionNumber} - ${option.description}\n`;
    });

    await client.sendMessage(phoneNumber, response);
    userState[phoneNumber].state = 'AWAITING_CHOICE';
  } catch (error) {
    console.error('Erro ao enviar o menu:', error);
  }
};

const sendWelcomeMessage = async (client, phoneNumber, userState, user) => {
  const language = userState[phoneNumber].language || 'pt';
  let welcomeMessage;

  switch (language) {
    case 'en':
      welcomeMessage = `Hello, ${user}! Welcome to our automated service system. I am your tourist guide. I will help you choose hotels, restaurants, or tourist spots in Corumbá-MS.`;
      break;
    case 'es':
      welcomeMessage = `Hola, ${user}! Bienvenido a nuestro sistema de servicio automatizado. Soy tu guía turístico. Te ayudaré a elegir hoteles, restaurantes o puntos turísticos en Corumbá-MS.`;
      break;
    default:
      welcomeMessage = `Olá, ${user}! Seja bem-vindo ao nosso sistema de atendimento automatizado. Eu sou o seu guia turístico. Irei te auxiliar a escolher hotéis, restaurantes ou pontos turísticos da cidade de Corumbá-MS.`;
      break;
  }

  await client.sendMessage(phoneNumber, welcomeMessage);
  userState[phoneNumber].state = 'AWAITING_POST_WELCOME';

  setTimeout(async () => {
    await sendMainMenu(client, phoneNumber, userState);
  }, 2000);
};


const handleUserChoice = async (client, phoneNumber, userState, user, message) => {
  const language = userState[phoneNumber].language || 'pt';
  const invalidOptionMessage = logMessages.invalidOptionMessage[language] || logMessages.invalidOptionMessage['pt'];

  const userChoice = parseInt(message.body.trim());

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
      await collectFeedback(client, phoneNumber, userState, user);
      break;
    case 5:
      userState[phoneNumber].state = "AWAITING_SELECT_LANGUAGE";
      await sendLanguageMenu(userState, phoneNumber, client);
      break;
    default:
      await client.sendMessage(phoneNumber, invalidOptionMessage);
      break;
  }
};


const handleLanguageSelection = async (message, userState, phoneNumber, client, user) => {
  const languageOptions = [
    { number: 1, language: 'pt', name: 'Português' },
    { number: 2, language: 'en', name: 'English' },
    { number: 3, language: 'es', name: 'Español' }
  ];

  const languageChoice = parseInt(message.body.trim());
  const selectedOption = languageOptions.find(option => option.number === languageChoice);

  if (selectedOption) {
    userState[phoneNumber].language = selectedOption.language;
    userState[phoneNumber].state = "AWAITING_WELCOME";
    await sendWelcomeMessage(client, phoneNumber, userState, user);
  } else {
    const invalidOptionMessage = logMessages.invalidOptionMessage['pt'];
    await client.sendMessage(phoneNumber, invalidOptionMessage);
    await sendLanguageMenu(userState, phoneNumber, client);
  }
};


const sendList = async (client, phoneNumber, type, userState, startIndex = 0) => {
  const itemsPerPage = 5;
  userState[phoneNumber].lastType = type;
  userState[phoneNumber].state = `AWAITING_${type === 1 ? "HOTEL" : type === 2 ? "RESTAURANT" : "ATTRACTION"}_SELECTION`;

  try {
    const items = await getItems(type, startIndex, itemsPerPage);
    const language = userState[phoneNumber].language || 'pt';
    let response = logMessages.menuText[language] || logMessages.menuText['pt'];

    if (items.length === 0) {
      await client.sendMessage(phoneNumber, 'Nenhum item encontrado.');
      userState[phoneNumber].state = "AWAITING_CHOICE";
      return;
    }

    items.forEach((item, index) => {
      response += `${startIndex + index + 1} - ${item.name}\n`;
    });

    if (items.length === itemsPerPage) {
      response += `${startIndex + itemsPerPage + 1} - Ver mais\n`;
    }

    await client.sendMessage(phoneNumber, response);
  } catch (error) {
    console.error('Erro ao enviar a lista:', error);
  }
};


// Função genérica para obter itens (hotéis, restaurantes, atrações)
const getItems = async (type, startIndex, itemsPerPage) => {
  switch (type) {
    case 1:
      return await HotelModel.find().skip(startIndex).limit(itemsPerPage);
    case 2:
      return await RestaurantModel.find().skip(startIndex).limit(itemsPerPage);
    case 3:
      return await AttractionModel.find().skip(startIndex).limit(itemsPerPage);
    default:
      return [];
  }
};

const sendDetails = async (client, phoneNumber, userState, userChoice) => {
  const startIndex = userState[phoneNumber].lastStartIndex || 0;
  const index = userChoice - 1 - startIndex;
  const itemsPerPage = 5;
  let items = [];
  let selectedItem;

  try {
    switch (userState[phoneNumber].state) {
      case "AWAITING_HOTEL_SELECTION":
        items = await getItems(1, startIndex, itemsPerPage);
        selectedItem = items[index];
        break;
      case "AWAITING_RESTAURANT_SELECTION":
        items = await getItems(2, startIndex, itemsPerPage);
        selectedItem = items[index];
        break;
      case "AWAITING_ATTRACTION_SELECTION":
        items = await getItems(3, startIndex, itemsPerPage);
        selectedItem = items[index];
        break;
      case "AWAITING_MORE_ITEMS":
        userState[phoneNumber].lastStartIndex += itemsPerPage;
        await sendList(client, phoneNumber, userState.lastType, userState, userState[phoneNumber].lastStartIndex);
        return;
      default:
        await client.sendMessage(phoneNumber, "Tipo inválido.");
        return;
    }

    if (selectedItem) {
      const details = `Detalhes:\n\n${selectedItem.description}`;
      await client.sendMessage(phoneNumber, details);
    } else if (userChoice === startIndex + itemsPerPage + 1) {
      userState[phoneNumber].lastStartIndex = startIndex + itemsPerPage;
      await sendList(client, phoneNumber, userState.lastType, userState, userState[phoneNumber].lastStartIndex);
    } else {
      const invalidOptionMessage = logMessages.invalidOptionMessage[userState[phoneNumber].language] || logMessages.invalidOptionMessage['pt'];
      await client.sendMessage(phoneNumber, invalidOptionMessage);
    }
  } catch (error) {
    console.error('Erro ao enviar os detalhes:', error);
  }
};

const collectFeedback = async (client, phoneNumber, userState, user) => {
  // Definir que o feedback está sendo coletado
  userState[phoneNumber].isCollectingFeedback = true;

  // Ler o arquivo JSON com as mensagens
  const messages = loadLogMessages();

  // Verificar se as mensagens existem no idioma do usuário
  const language = userState[phoneNumber].language || 'pt';
  const feedbackPrompt = messages.provideFeedbackMessage[language] || messages.provideFeedbackMessage['pt'];

  // Enviar a mensagem inicial
  await client.sendMessage(phoneNumber, feedbackPrompt);
};



const messageListener = (client, phoneNumber, userState, user, messages) => async (message) => {
  const language = userState[phoneNumber].language || 'pt';
  const rating = parseInt(message.body.trim());

  if (isNaN(rating) || rating < 1 || rating > 5) {
    const invalidMessage = messages.invalidOptionMessage[language] || messages.invalidOptionMessage['pt'];
    await client.sendMessage(phoneNumber, invalidMessage);
  } else {
    try {
      // Salvar a avaliação no banco de dados
      await EvaluationModel.findOneAndUpdate(
        { phoneNumber },
        { clientName: user, phoneNumber: phoneNumber, rating: rating },
        { upsert: true, new: true }
      );

      // Mensagem de confirmação
      const confirmationMessage = messages.feedbackMessage[language] || messages.feedbackMessage['pt'];
      await client.sendMessage(phoneNumber, confirmationMessage);

      // Atualizar o estado do usuário
      userState[phoneNumber].state = "LISTENING_ONLY";
      console.log("Feedback recebido. Estado definido para:", userState[phoneNumber].state);

      // Definir que o feedback não está mais sendo coletado
      userState[phoneNumber].isCollectingFeedback = false;

      // Atualizar o timestamp da última mensagem processada
      userState[phoneNumber].lastMessageTimestamp = message.timestamp;
    } catch (error) {
      console.error('Erro ao salvar o feedback:', error);
      const errorMessage = 'Desculpe, ocorreu um erro ao salvar seu feedback. Por favor, tente novamente mais tarde.';
      await client.sendMessage(phoneNumber, errorMessage);
    }
  }
};





export default handleMessage;
