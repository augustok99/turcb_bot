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
      await handleDetailsOrPagination(client, phoneNumber, message, userState, userChoice);
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
      await client.sendMessage(phoneNumber, 'Você saiu do sistema. Para retornar, envie qualquer mensagem.');
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
    const invalidOptionMessage = logMessages.invalidOptionMessage['pt'];
    await client.sendMessage(phoneNumber, invalidOptionMessage);
    await sendLanguageMenu(userState, phoneNumber, client);
  }
};


const sendList = async (client, phoneNumber, option, userState, startIndex = 0, itemsPerPage = 5) => {
  let items = [];
  let message = '';

  try {
    switch (option) {
      case 1:
        items = await HotelModel.find().skip(startIndex).limit(itemsPerPage);
        message = 'Aqui estão algumas opções de hotéis:\n';
        userState[phoneNumber].state = 'AWAITING_HOTEL_SELECTION';
        break;
      case 2:
        items = await RestaurantModel.find().skip(startIndex).limit(itemsPerPage);
        message = 'Aqui estão algumas opções de restaurantes:\n';
        userState[phoneNumber].state = 'AWAITING_RESTAURANT_SELECTION';
        break;
      case 3:
        items = await AttractionModel.find().skip(startIndex).limit(itemsPerPage);
        message = 'Aqui estão algumas opções de pontos turísticos:\n';
        userState[phoneNumber].state = 'AWAITING_ATTRACTION_SELECTION';
        break;
      default:
        await client.sendMessage(phoneNumber, 'Opção inválida. Por favor, selecione um número válido.');
        return;
    }

    if (items.length === 0) {
      await client.sendMessage(phoneNumber, 'Nenhum item encontrado.');
      return;
    }

    items.forEach((item, index) => {
      message += `${index + 1} - ${item.name}\n`;
    });

    const totalItems = await HotelModel.countDocuments(); // Adapte conforme a coleção
    const hasMoreItems = (startIndex + itemsPerPage) < totalItems;

    if (startIndex > 0) {
      message += '6 - Ver mais opções\n';
      message += '7 - Voltar à lista anterior\n';
    } else if (hasMoreItems) {
      message += '6 - Ver mais opções\n';
    }

    message += '\nDigite o número do item para ver mais detalhes ou "0" para sair.';

    userState[phoneNumber].lastCategory = option;
    userState[phoneNumber].lastStartIndex = startIndex;
    userState[phoneNumber].items = items; // Armazene os itens no estado do usuário

    await client.sendMessage(phoneNumber, message);
  } catch (error) {
    console.error('Erro ao carregar itens:', error);
    await client.sendMessage(phoneNumber, 'Desculpe, ocorreu um erro ao carregar os itens. Por favor, tente novamente mais tarde.');
  }
};






const handleDetailsOrPagination = async (client, phoneNumber, message, userState, userChoice) => {
  if (userChoice === 0) {
    await sendMainMenu(client, phoneNumber, userState);
  } else if (userChoice === 6) {
    await handlePagination(client, phoneNumber, userState);
  } else {
    await sendDetails(client, phoneNumber, userState, userChoice);
  }
};


const handlePagination = async (client, phoneNumber, userState) => {
  const category = userState[phoneNumber].lastCategory;
  const startIndex = userState[phoneNumber].lastStartIndex + 5 || 0; // Próxima página
  const itemsPerPage = 5;

  if (category) {
    await sendList(client, phoneNumber, category, userState, startIndex, itemsPerPage);
  } else {
    await client.sendMessage(phoneNumber, 'Opção inválida. Por favor, selecione uma categoria válida.');
  }
};




const sendDetails = async (client, phoneNumber, userState, userChoice) => {
  const items = userState[phoneNumber].items;
  const category = userState[phoneNumber].lastCategory;
  const startIndex = userState[phoneNumber].lastStartIndex;

  try {
    if (userChoice > 0 && userChoice <= items.length) {
      const selectedItem = items[userChoice - 1];
      await showItemDetails(client, phoneNumber, selectedItem);
      userState[phoneNumber].state = 'AWAITING_MORE_ITEMS';
      await sendList(client, phoneNumber, category, userState, startIndex);
    } else if (userChoice === 6) {
      await handlePagination(client, phoneNumber, userState);
    } else if (userChoice === 7 && startIndex > 0) {
      const previousStartIndex = Math.max(0, startIndex - 5); // Volta para a página anterior
      await sendList(client, phoneNumber, category, userState, previousStartIndex);
    } else {
      const invalidOptionMessage = logMessages.invalidOptionMessage[userState[phoneNumber].language] || logMessages.invalidOptionMessage['pt'];
      await client.sendMessage(phoneNumber, invalidOptionMessage);
      await sendList(client, phoneNumber, category, userState, startIndex); // Reinicie a lista para o usuário
    }
  } catch (error) {
    console.error('Erro ao enviar os detalhes:', error);
  }
};



const showItemDetails = async (client, phoneNumber, selectedItem) => {
  try {
    const location = `https://maps.google.com/maps?q=${selectedItem.coordinates.lat},${selectedItem.coordinates.lng}&z=17&hl=br`;
    const itemDetails = `Receba 🙅‍♂️ os  detalhes:\nNome: ${selectedItem.name}\nEndereço: ${selectedItem.address}\nAvaliação: ${selectedItem.rating}\nAvaliações Totais: ${selectedItem.user_ratings_total}`;

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
