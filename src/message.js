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

const initializeUserState = (phoneNumber, userState) => {
  if (!userState[phoneNumber]) {
    userState[phoneNumber] = {
      state: "AWAITING_SELECT_LANGUAGE",
      isCollectingFeedback: false,
      items: [],
      lastCategory: null,
      lastStartIndex: 0,
      language: ""
    };
  }
};

const updateUserState = (phoneNumber, userState, updates) => {
  if (!userState[phoneNumber]) {
    initializeUserState(phoneNumber, userState);
  }
  Object.assign(userState[phoneNumber], updates);
};



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
    initializeUserState(phoneNumber, userState);

    // Chame a função handleUserFlow para gerenciar o fluxo do usuário
    await handleUserFlow(client, phoneNumber, message, userState, user);
  });
};


// Função para carregar o menu a partir do arquivo JSON
const loadMenu = (language) => {
  try {
    const menuPath = `./src/menu/menu.json`;
    const menuData = fs.readFileSync(menuPath, 'utf8');
    const menu = JSON.parse(menuData);
    return menu[language] || [];
  } catch (error) {
    console.error('Erro ao carregar o menu:', error);
    return [];
  }
};


const handleUserFlow = async (client, phoneNumber, message, userState, user) => {
  const currentState = userState[phoneNumber].state;
  const messageTimestamp = message.timestamp;

  // Verifica se está coletando feedback
  if (userState[phoneNumber].isCollectingFeedback) {
    const messages = loadLogMessages();
    await messageListener(client, phoneNumber, userState, user, messages)(message);
    return;
  }

  // Verifica novas mensagens em "LISTENING_ONLY"
  if (currentState === "LISTENING_ONLY" && messageTimestamp > (userState[phoneNumber].lastMessageTimestamp || 0)) {
    userState[phoneNumber].state = "AWAITING_SELECT_LANGUAGE";
    await sendLanguageMenu(userState, phoneNumber, client);
    userState[phoneNumber].lastMessageTimestamp = messageTimestamp; // Atualiza o timestamp da última mensagem processada
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
    case "AWAITING_RESTAURANT_SELECTION":
    case "AWAITING_ATTRACTION_SELECTION":
    case "AWAITING_HOTEL_SELECTION":
      const userChoice = parseInt(message.body.trim());
      await handleDetailsOrPagination(client, phoneNumber, userState, userChoice);
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

  const menu = languageOptions.map(option => `${option.number} - ${option.name}`).join('\n');

  await client.sendMessage(phoneNumber, 'Please Choose a Language:\n\n' + menu);

  userState[phoneNumber].state = 'AWAITING_LANGUAGE_SELECTION';
};

const sendMainMenu = async (client, phoneNumber, userState) => {
  try {
    const language = userState[phoneNumber].language || 'pt';
    const menu = loadMenu(language);
    const menuText = logMessages.menuText[language] || logMessages.menuText['pt'];


    if (menu.length === 0) {
      const errorMenu = logMessages.menuError[language] || logMessages.menuError['pt'];
      await client.sendMessage(phoneNumber, errorMenu);
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
    case 2:
    case 3:
      await sendList(client, phoneNumber, userChoice, userState); // Opções 1, 2 e 3 correspondem a hotéis, restaurantes e atrações turísticas, respectivamente
      break;
    case 4:
      await collectFeedback(client, phoneNumber, userState, user);
      break;
    case 5:
      userState[phoneNumber].state = "AWAITING_SELECT_LANGUAGE";
      await sendLanguageMenu(userState, phoneNumber, client);
      break;
    case 0:
      userState[phoneNumber] = { state: "LISTENING_ONLY", isCollectingFeedback: false };
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
    const language = userState[phoneNumber].language || 'pt';
    const invalidOptionMessage = logMessages.invalidOptionMessage[language];
    await client.sendMessage(phoneNumber, invalidOptionMessage);
    await sendLanguageMenu(userState, phoneNumber, client);
  }
};


const sendList = async (client, phoneNumber, option, userState, startIndex = 0, itemsPerPage = 5) => {
  let items = [];
  let message = '';
  let presentationMessage = '';
  const language = userState[phoneNumber].language || 'pt';

  try {
    switch (option) {
      case 1:
        items = await getItemsFromCollection(HotelModel, startIndex, itemsPerPage);
        presentationMessage = logMessages.presentationMessageHotel[language];
        userState[phoneNumber].state = "AWAITING_HOTEL_SELECTION"
        break;
      case 2:
        items = await getItemsFromCollection(RestaurantModel, startIndex, itemsPerPage);
        presentationMessage = logMessages.presentationMessageRestaurant[language];
        userState[phoneNumber].state = "AWAITING_RESTAURANT_SELECTION"
        break;
      case 3:
        items = await getItemsFromCollection(AttractionModel, startIndex, itemsPerPage);
        presentationMessage = logMessages.presentationMessageAttraction[language];
        userState[phoneNumber].state = "AWAITING_ATTRACTION_SELECTION"
        break;
      default:
        let invalidOptionMessage = '';
        invalidOptionMessage = logMessages.invalidOptionMessage[language];
        await client.sendMessage(phoneNumber, invalidOptionMessage);
        return;
    }
    message += presentationMessage;
    await processItems(client, userState, items, phoneNumber, message, startIndex, itemsPerPage, language, option, presentationMessage);

  } catch (error) {
    console.error('Erro ao carregar itens:', error);
    const itemLoadErrorMessage = logMessages.itemNotFound[language]
    await client.sendMessage(phoneNumber, itemLoadErrorMessage);
  }
};

// Função para obter os itens da coleção
const getItemsFromCollection = async (collection, startIndex, itemsPerPage) => {
  return await collection.find().skip(startIndex).limit(itemsPerPage);
};

// Função para obter o total de itens na coleção
const getTotalItemsCount = async (option) => {
  switch (option) {
    case 1:
      return await HotelModel.countDocuments();
    case 2:
      return await RestaurantModel.countDocuments();
    case 3:
      return await AttractionModel.countDocuments();
    default:
      return 0;
  }
};


const processItems = async (client, userState, items, phoneNumber, message, startIndex, itemsPerPage, language, option) => {
  // Inicialize o estado do usuário
  initializeUserState(phoneNumber, userState);

  if (items.length === 0) {
    const messageItemNotFound = logMessages.itemNotFound[language];
    await client.sendMessage(phoneNumber, messageItemNotFound);
    return;
  }

  items.forEach((item, index) => {
    message += `${index + 1} - ${item.name}\n`;
  });

  const totalItems = await getTotalItemsCount(option); // Obtém o total de itens na coleção
  const hasMoreItems = (startIndex + itemsPerPage) < totalItems;

  const menuOptions = logMessages.menuOptions[language];

  if (startIndex > 0) {
    message += menuOptions.seeMore;
    message += menuOptions.goBack;
  } else if (hasMoreItems) {
    message += menuOptions.seeMore;
  }

  message += `\n${menuOptions.detailsOrExit}`;

  updateUserState(phoneNumber, userState, {
    lastCategory: option,
    lastStartIndex: startIndex,
    items: items
  });

  await client.sendMessage(phoneNumber, message);
}



const handleDetailsOrPagination = async (client, phoneNumber, userState, userChoice) => {
  if (userChoice === 0) {
    await sendMainMenu(client, phoneNumber, userState);
  } else if (userChoice === 6) {
    await handlePagination(client, phoneNumber, userState);
  } else {
    await sendDetails(client, phoneNumber, userState, userChoice);
  }
};

const handlePagination = async (client, phoneNumber, userState) => {
  // Inicialize o estado do usuário
  initializeUserState(phoneNumber, userState);

  const category = userState[phoneNumber].lastCategory;
  const startIndex = userState[phoneNumber].lastStartIndex + 5; // Próxima página
  const itemsPerPage = 5;

  if (category) {
    await sendList(client, phoneNumber, category, userState, startIndex, itemsPerPage);
  } else {
    const categoryMessageError = logMessages.categoryError[language];
    await client.sendMessage(phoneNumber, categoryMessageError);
  }
};

const sendDetails = async (client, phoneNumber, userState, userChoice) => {

  const items = userState[phoneNumber].items;
  const category = userState[phoneNumber].lastCategory;
  const startIndex = userState[phoneNumber].lastStartIndex;
  const language = userState[phoneNumber].language

  try {
    if (userChoice > 0 && userChoice <= items.length) {
      const selectedItem = items[userChoice - 1];
      await showItemDetails(client, phoneNumber, selectedItem);
      userState[phoneNumber].state = 'AWAITING_MORE_ITEMS'; // Atualiza o estado do usuário
    } else if (userChoice === 6) {
      await handlePagination(client, phoneNumber, userState);
    } else if (userChoice === 7 && startIndex > 0) {
      const previousStartIndex = Math.max(0, startIndex - 5); // Volta para a página anterior
      await sendList(client, phoneNumber, category, userState, previousStartIndex);
    } else {
      const invalidOptionMessage = logMessages.invalidOptionMessage[language]
      await client.sendMessage(phoneNumber, invalidOptionMessage);
      await sendList(client, phoneNumber, category, userState, startIndex); // Reinicie a lista para o usuário
    }
  } catch (error) {
    console.error('Erro ao enviar os detalhes:', error);
    const detailsError = logMessages.detailsError[language]
    await client.sendMessage(phoneNumber, detailsError);
  }
};


const showItemDetails = async (client, phoneNumber, selectedItem) => {
  const language = userState[phoneNumber].language;
  const itemDetailsMessages = logMessages.itemDetails[language];

  try {
    const location = `https://maps.google.com/maps?q=${selectedItem.coordinates.lat},${selectedItem.coordinates.lng}&z=17&hl=br`;
    const itemDetails = `${itemDetailsMessages.receiveDetails}\n
                         ${itemDetailsMessages.name}: ${selectedItem.name}\n
                         ${itemDetailsMessages.address}: ${selectedItem.address}\n
                         ${itemDetailsMessages.rating}: ${selectedItem.rating}\n
                         ${itemDetailsMessages.totalRatings}: ${selectedItem.user_ratings_total}\n
                         ${itemDetailsMessages.location}: ${location}`;

    await client.sendMessage(phoneNumber, itemDetails);

    for (let i = 0; i < selectedItem.photos.length; i++) {
      try {
        const media = await MessageMedia.fromUrl(selectedItem.photos[i], { unsafeMime: true });
        await client.sendMessage(phoneNumber, media, { caption: `Imagem ${i + 1}` });
      } catch (error) {
        console.error('Erro ao enviar imagem:', error);
      }
    }
  } catch (error) {
    console.error('Erro ao mostrar os detalhes do item:', error);
  }
};



const collectFeedback = async (client, phoneNumber, userState) => {
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
      console.log(`Feedback recebido. O usuário ${user} terminou a conversa`);

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