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
/** @module message*/

/**
 * @function loadLogMessages
 * @async
 * @description - This is a function responsible for loading log messages (records of the current state of the system) from the chatbot. It reads a JSON file, interprets its contents and returns the data in object format. If an error occurs while reading or interpreting the file, the function captures the error and returns an empty object.
 * @return - returns the JSON file as an object. If any problems occur during this process, the function will log the error in the console and return an empty object.
 */
function loadLogMessages() {
  try {
    const logMessagesData = fs.readFileSync('./src/interactions/log_messages.json', 'utf8');
    return JSON.parse(logMessagesData);
  } catch (error) {
    console.error('Error loading log messages:', error);
    return {};
  }
}

/**
 * @global
 * @constant {Object} logMessages - Loads log messages from a JSON file (log_messages.json). It is a global variable because it is used in several functions. It is mainly used to retrieve a type of systematic message for the user according to the language chosen at the beginning.
 */
const logMessages = loadLogMessages();

/**
 * @function initializeUserState
 * @description - This is a function responsible for initializing a user's state, assigning default values to the variables associated with a specific phone number. If the user state does not yet exist, the function creates a new entry for the phone number in the userState object, setting the initial parameters. The parameters include the state of waiting for language choice, feedback collection and other relevant information.
 * @param {string} phoneNumber - The user's telephone number.
 * @param {Object.<string, Object>} userState - An object that stores user states, where each key is a phone number.
 */
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

/**
 * @function updateUserState
 * @description - This function is responsible for updating a user's state with new values. If the user's state does not exist, it will be initialized with default values. Then, the properties provided in the updates object will be merged with the user's current state.
 * @param {string} phoneNumber - The user's telephone number.
 * @param {Object.<string, Object>} userState - An object that stores user states, where each key is a phone number.
 * @param {Object} updates - An object containing the new values to update the user's state.
 */
const updateUserState = (phoneNumber, userState, updates) => {
  if (!userState[phoneNumber]) {
    initializeUserState(phoneNumber, userState);
  }
  Object.assign(userState[phoneNumber], updates);
};

/**
 * @function handleMessage
 * @description - This function handles messages received by a client, connecting to the database and processing the messages according to the user's state. It includes initializing the user state and managing the interaction flow.
 * @param {Object} client - The messaging client that listens to and processes incoming messages.
 */
const handleMessage = async (client) => {
  try {
    await connectToDatabase();
  } catch (error) {
    console.error("Error connecting to the database:", error);
    return;
  }

  client.on("message", async (message) => {

    /**
    * @constant {string} phoneNumber - The phone number of the user sending the message to the bot.
    */
    const phoneNumber = message.from;

    /**
     * @constant {Object} contact - The contact object of the sender of the message.
     */
    const contact = await message.getContact();

    /**
     * @constant {string} userName - The user name taken from the whatsapp contact. (As the user himself put it on whatsapp)
     */
    const userName = contact.pushname;

    /**
    * @constant {string} formattedNumber - The user's phone number formatted ex: +12 34 5678-9101.
    */
    const formattedNumber = await contact.getFormattedNumber();

    saveOrUpdateUser(formattedNumber, userName);

    initializeUserState(phoneNumber, userState);

    await handleUserFlow(client, phoneNumber, message, userState, userName);
  });
};


/**
 * @function loadMenu
 * @description - Loads the menu from a JSON file, based on the specified language.
 * @param {string} language - The language in which to load the menu ('en', 'es', 'en'.).
 * @returns {Array} - Returns an array with the menu items corresponding to the specified language.Returns an empty array if there is an error loading the menu or if the menu for the language is not available.
 */
const loadMenu = (language) => {
  try {
    const menuPath = `./src/menu/menu.json`;
    const menuData = fs.readFileSync(menuPath, 'utf8');
    const menu = JSON.parse(menuData);
    return menu[language] || [];
  } catch (error) {
    console.error('Error loading menu:', error);
    return [];
  }
};

/**
 * @function handleUserFlow
 * @async
 * @description - Manages the flow of user interaction with the system, based on the user's current state.
 * @param {Client} client - Describes client as an object of type Client, which represents the client instance for interaction.
 * @param {string} phoneNumber - User's telephone number.
 * @param {Message} message - Message received from the user.
 * @param {Object.<string, Object>} userState- The user's current status, containing status and context information.
 * @param {string} userName - User name for personalizing interactions.
 * @returns {Promise<void>} - Empty promise that indicates the completion of the user flow handling after the execution of all asynchronous operations within the function.
 */
const handleUserFlow = async (client, phoneNumber, message, userState, userName) => {

  /**
   * @constant {string} currentState - It stores the current state of the user's interaction with the system. This determines which flow of actions should be carried out based on the user's current state.
   */
  const currentState = userState[phoneNumber].state;

  /**
   * @constant {number} messageTimestamp - Timestamp of the message received from the user. It is used to determine whether a new interaction is taking place based on the last recorded timestamp.
   */
  const messageTimestamp = message.timestamp;

  /**
  * @description - Checks if the user is currently providing feedback.
  * If so, it loads the appropriate log messages and processes the message accordingly.
  */
  if (userState[phoneNumber].isCollectingFeedback) {
    const messages = loadLogMessages();
    await messageListener(client, phoneNumber, userState, userName, messages)(message);
    return;
  }

  /**
  * @description - Checks if the current state is "LISTENING_ONLY" and if the message timestamp is more recent than the last recorded timestamp.
  * If true, it updates the user's state to "AWAITING_SELECT_LANGUAGE" and sends the language selection menu.
  */
  if (currentState === "LISTENING_ONLY" && messageTimestamp > (userState[phoneNumber].lastMessageTimestamp || 0)) {
    userState[phoneNumber].state = "AWAITING_SELECT_LANGUAGE";
    await sendLanguageMenu(userState, phoneNumber, client);
    userState[phoneNumber].lastMessageTimestamp = messageTimestamp;
    return;
  }

  /**
  * @description - Manages the flow of actions based on the user's current state.
  * Each case represents a different state in the user interaction flow, triggering different functions accordingly.
  */
  switch (currentState) {
    case "AWAITING_SELECT_LANGUAGE":
      await sendLanguageMenu(userState, phoneNumber, client);
      break;
    case "AWAITING_LANGUAGE_SELECTION":
      await handleLanguageSelection(message, userState, phoneNumber, client, userName);
      break;
    case "AWAITING_WELCOME":
      await sendWelcomeMessage(client, phoneNumber, userState, userName);
      break;
    case "AWAITING_POST_WELCOME":
      await sendMainMenu(client, phoneNumber, userState);
      break;
    case "AWAITING_CHOICE":
      await handleUserChoice(client, phoneNumber, userState, userName, message);
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
      console.error("Invalid status:", currentState);
      break;
  }
};

/**
 * @function saveOrUpdateUser
 * @async
 * @description - Saves or updates a user's information in the database. If the customer does not exist, creates a new record.
 * @param {string} formattedNumber - The customer's formatted telephone number.
 * @param {string} userName - The client's name.
 * @returns {Promise<void>} - A Promise that resolves when the client is saved or updated.
 * @throws {Error} - Throws an error if the save or update operation fails.
 */
const saveOrUpdateUser = async (formattedNumber, userName) => {
  try {
    /**
    * @property {Object} clientData - Holds the user data retrieved from the database or a new user instance if the user does not exist.
    */
    let clientData = await ClientModel.findOne({ phoneNumber: formattedNumber });
    /**
    * @description - Checks if the user data was not found in the database.
    * If true, it creates a new user with the provided name and phone number and saves it to the database.
    */
    if (!clientData) {
      clientData = new ClientModel({ name: userName, phoneNumber: formattedNumber });
      await clientData.save();
    }
  } catch (error) {
    console.error("Error saving or updating client:", error);
    throw error;
  }
};

/**
 * @function sendLanguageMenu
 * @description - This method prepares and sends a menu with the language options available to the user. Each option is numbered and includes the name of the language. After the menu has been successfully sent, the user's state is updated to await the language selection.
 * @async
 * @param {Object.<string, Object>} userState - The user's current state, containing state and some informations.
 * @param {string} userState[phoneNumber].state - The current state of the user in the interaction flow.
 * @param {string} phoneNumber - Telephone number to send the language menu to.
 * @param {Client} client - Client instance used to send messages.
 * @returns {Promise<void>} - An empty Promise that is resolved after the menu has been successfully sent.
 */
const sendLanguageMenu = async (userState, phoneNumber, client) => {
  /**
   * @constant {Array<Object>} languageOptions
   * @property {number} - The option number.
   * @property {string} - The language code.
   * @property {string} - The name of the language.
   */
  const languageOptions = [
    { number: 1, language: 'pt', name: 'Português' },
    { number: 2, language: 'en', name: 'English' },
    { number: 3, language: 'es', name: 'Español' }
  ];

  /**
   * @constant {string} menu- This will return a formatted string containing the language options, each on a new line. This string is generated from the languageOptions array and maps each object in this array to a string combining the option number and the language name, separated by a hyphen. Next, all these strings are joined into a single string, with each item separated by a new line 
   */
  const menu = languageOptions.map(option => `${option.number} - ${option.name}`).join('\n');

  /**
   * @property {string} - Send the choice of user and the menu to the user.
   */
  await client.sendMessage(phoneNumber, 'Please Choose a Language:\n\n' + menu);

  /**
   * @property {string} state - The user's current state in this case 'AWAITING_LANGUAGE_SELECTION'
   */
  userState[phoneNumber].state = 'AWAITING_LANGUAGE_SELECTION';
};

/**
 * @function sendMainMenu
 * @description - Sends the main menu to the user based on the user's selected language.
 * @param {Object} client - The client instance used to send messages.
 * @param {string} phoneNumber - The phone number to send the main menu to.
 * @param {Object.<string, Object>} userState - The user's current state, containing status and some information.
 * @returns {Promise<void>} - An empty promise that resolves after the menu has been sent.
 */
const sendMainMenu = async (client, phoneNumber, userState) => {
  try {
    /**
    * @constant {string} language - The preferred language of the user, defaults to 'pt' if not specified.
    */
    const language = userState[phoneNumber].language || 'pt';
    /**
   * @constant {Array<Object>} menu - The list of menu options loaded based on the user's language preference.
   */
    const menu = loadMenu(language);
    /**
     * @constant {string} menuText - The introductory text for the menu based on the user's language preference.
     */
    const menuText = logMessages.menuText[language] || logMessages.menuText['pt'];


    /**
     * @description - if the menu is empty.
     */
    if (menu.length === 0) {
      /**
      * @constant {string} errorMenu- Error message in the user's language if the menu is empty.
      */
      const errorMenu = logMessages.menuError[language] || logMessages.menuError['pt'];
      /**
       * @property {string} - Send the choice of user and the menu to the user.
       */
      await client.sendMessage(phoneNumber, errorMenu);
      return;
    }
    /**
        * @property {string} response - The constructed menu response to be sent to the user.
        */
    let response = menuText;
    menu.forEach(option => {
      response += `${option.optionNumber} - ${option.description}\n`;
    });

    /**
    * @property {string} - Send the choice of user and the menu to the user.
    */
    await client.sendMessage(phoneNumber, response);
    /**
    * @property {string} state - Updates the user's state to 'AWAITING_CHOICE' after sending the menu.
    */
    userState[phoneNumber].state = 'AWAITING_CHOICE';
  } catch (error) {
    console.error('Error sending menu:', error);
  }
};

/**
 * @function sendWelcomeMessage
 * @description - This method sends a welcome message to the user in their preferred language and updates the user's state. After sending the welcome message, it triggers the sending of the main menu.
 * @async
 * @param {Client} client - Client instance used to send messages.
 * @param {string} phoneNumber - Telephone number to send the welcome message to.
 * @param {Object.<string, Object>} userState - The user's current state, containing status and some informations.
 * @param {string} userState.language - The user's preferred language for receiving messages.
 * @param {string} userState.state - The current state of the user in the interaction flow.
 * @param {string} userName - The name of the user to personalize the welcome message.
 * @returns {Promise<void>} An empty Promise that is resolved after the welcome message and main menu have been successfully sent.
 */
const sendWelcomeMessage = async (client, phoneNumber, userState, userName) => {
  /**
 * @constant {string} language - The preferred language of the user, defaults to 'pt' if not specified.
 */
  const language = userState[phoneNumber].language || 'pt';

  /**
   * @property {string} welcomeMessage - The personalized welcome message to be sent to the user.
   */
  let welcomeMessage;

  /**
  * @description - Switch statement to determine the welcome message based on the user's language preference.
  */
  switch (language) {
    case 'en':
      welcomeMessage = `Hello, ${userName}! Welcome to our automated service system. I am your tourist guide. I will help you choose hotels, restaurants, or tourist spots in Corumbá-MS.`;
      break;
    case 'es':
      welcomeMessage = `Hola, ${userName}! Bienvenido a nuestro sistema de servicio automatizado. Soy tu guía turístico. Te ayudaré a elegir hoteles, restaurantes o puntos turísticos en Corumbá-MS.`;
      break;
    default:
      welcomeMessage = `Olá, ${userName}! Seja bem-vindo ao nosso sistema de atendimento automatizado. Eu sou o seu guia turístico. Irei te auxiliar a escolher hotéis, restaurantes ou pontos turísticos da cidade de Corumbá-MS.`;
      break;
  }

  /**
  * @property {string} - Send the choice of user and the menu to the user.
  */
  await client.sendMessage(phoneNumber, welcomeMessage);
  /**
  * @property {state} - Updates the user's state to 'AWAITING_POST_WELCOME' after sending the welcome message.
  */
  userState[phoneNumber].state = 'AWAITING_POST_WELCOME';
  /**
   * @description - Sets a timeout to send the main menu after 2000 milliseconds (2 seconds).
   */
  setTimeout(async () => {
    await sendMainMenu(client, phoneNumber, userState);
  }, 2000);
};

/**
 * @function handleUserChoice
 * @async
 * @description - Handles the user's menu choice and executes the corresponding action based on the choice.
 * @param {Client} client - Client instance used to send messages.
 * @param {string} phoneNumber - The user's phone number.
 * @param {Object} userState - The user's current status, containing status and context information.
 * @param {string} userName - User name for personalizing interactions.
 * @param {Message} message - Message received from the user.
 * @returns {Promise<void>} - Empty promise indicating the completion of handling the user choice.
 */
const handleUserChoice = async (client, phoneNumber, userState, userName, message) => {
  /**
  * @constant {string} {language} - The preferred language of the user, defaults to 'pt' if not specified.
  */
  const language = userState[phoneNumber].language || 'pt';
  /**
   * @constant {string} invalidOptionMessage - The message sent to the user when an invalid option is selected.
   */
  const invalidOptionMessage = logMessages.invalidOptionMessage[language] || logMessages.invalidOptionMessage['pt'];

  /**
  * @constant {number} userChoice - The parsed integer value of the user's choice from the message body.
  */
  const userChoice = parseInt(message.body.trim());

  /**
  * @description - Switch statement to handle different user choices and execute the corresponding actions.
  */
  switch (userChoice) {
    /**
     * @description - Options 1, 2 and 3 correspond to hotels, restaurants and tourist attractions, respectively. And the choice will be passed to the sendList function by parameter.
     */
    case 1:
    case 2:
    case 3:
      await sendList(client, phoneNumber, userChoice, userState);
      break;
    case 4:
      /**
       * @description - This corresponds to the output option, with the feedback collection call.
       */
      await collectFeedback(client, phoneNumber, userState, userName);
      break;
    case 5:
      /**
     * @property {boolean} state - Sets the user's state to 'AWAITING_SELECT_LANGUAGE' and sends the language menu to the user.
     */
      userState[phoneNumber].state = "AWAITING_SELECT_LANGUAGE";
      await sendLanguageMenu(userState, phoneNumber, client);
      break;
    case 0:
      /**
     * @property {boolean} state - Resets the user's state to 'LISTENING_ONLY' and disables feedback collection.
     */
      userState[phoneNumber] = { state: "LISTENING_ONLY", isCollectingFeedback: false };
      break;
    default:
      /**
      * @property {string} - Send the choice of user and the menu to the user.
      */
      await client.sendMessage(phoneNumber, invalidOptionMessage);
      break;
  }
};

/**
 * @function handleLanguageSelection
 * @async
 * @description - Handles the user's language selection and sets the user's preferred language accordingly.
 * @param {Message} message - Message received from the user containing the language choice.
 * @param {Object} userState - The user's current status, containing status and context information.
 * @param {string} phoneNumber - The user's phone number.
 * @param {Client} client - Client instance used to send messages.
 * @param {string} userName - User name for personalizing interactions.
 * @returns {Promise<void>} - Empty promise indicating the completion of handling the language selection.
 */
const handleLanguageSelection = async (message, userState, phoneNumber, client, userName) => {
  /**
   * @constant {Array<Object>} languageOptions - The languageOptions variable represents an array containing language options available for selection by the user.
   * @property {number} - The option number.
   * @property {string} - The language code.
   * @property {string} - The name of the language.
   */
  const languageOptions = [
    { number: 1, language: 'pt', name: 'Português' },
    { number: 2, language: 'en', name: 'English' },
    { number: 3, language: 'es', name: 'Español' }
  ];

  /**
  * @constant {number} languageChoice - The parsed integer value of the user's language choice from the message body.
  */
  const languageChoice = parseInt(message.body.trim());
  /**
   * @constant {Object|undefined} selectedOption - The selected language option object if found, otherwise undefined.
   */
  const selectedOption = languageOptions.find(option => option.number === languageChoice);

  /**
   * @description - If a valid language option is selected.
   */
  if (selectedOption) {
    /**
    * @property {string} language - The selected language code to be stored in the user's state.
    */
    userState[phoneNumber].language = selectedOption.language;
    /**
    * @property {string} state - Updates the user's state to 'AWAITING_WELCOME' after selecting a language.
    */
    userState[phoneNumber].state = "AWAITING_WELCOME";
    await sendWelcomeMessage(client, phoneNumber, userState, userName);
  } else {
    /**
    * @constant {string} language - The preferred language of the user, defaults to 'pt' if not specified.
    */
    const language = userState[phoneNumber].language || 'pt';
    /**
    * @constant {string} invalidOptionMessage - The message sent to the user when an invalid language option is selected.
    */
    const invalidOptionMessage = logMessages.invalidOptionMessage[language];
    /**
  * @property {string} - Send the choice of user and the menu to the user.
  */
    await client.sendMessage(phoneNumber, invalidOptionMessage);
    await sendLanguageMenu(userState, phoneNumber, client);
  }
};

/**
 * @function sendList
 * @async
 * @description - Sends a list of items (hotels, restaurants, or attractions) to the user based on their selection.
 * @param {Client} client - The client instance used to send messages.
 * @param {string} phoneNumber - The user's phone number.
 * @param {number} option - The user's selected option (1 for hotels, 2 for restaurants, 3 for attractions).
 * @param {Object} userState - The user's current status, containing status and context information.
 * @param {number} [startIndex=0] - The starting index for the items to be displayed.
 * @param {number} [itemsPerPage=5] - The number of items to be displayed per page.
 * @returns {Promise<void>} - Empty promise indicating the completion of sending the list.
 */
const sendList = async (client, phoneNumber, option, userState, startIndex = 0, itemsPerPage = 5) => {
  /**
   * @constant {Array<Object>} items - The list of items to be displayed (hotels, restaurants, or attractions).
   */
  let items = [];
  /**
   * @property {string} message - The message that will be sent to the user containing the list of items.
   */
  let message = '';
  /**
  * @property {string} presentationMessage - The introductory message for the list based on the user's language preference.
  */
  let presentationMessage = '';
  /**
   * @constant {string} language - The preferred language of the user, defaults to 'pt' if not specified.
   */
  const language = userState[phoneNumber].language || 'pt';

  try {
    /**
     * @description - Switch statement to determine which type of items to load based on the user's option.
     */
    switch (option) {
      case 1:
        /**
       * @description Retrieves hotel items from the database based on pagination settings. Sets presentation message for hotels and updates user state to await hotel selection.
       */
        items = await getItemsFromCollection(HotelModel, startIndex, itemsPerPage);
        presentationMessage = logMessages.presentationMessageHotel[language];
        userState[phoneNumber].state = "AWAITING_HOTEL_SELECTION"
        break;
      case 2:
        /**
        * @description Retrieves restaurant items from the database based on pagination settings. Sets presentation message for restaurants and updates user state to await restaurant selection.
        */
        items = await getItemsFromCollection(RestaurantModel, startIndex, itemsPerPage);
        presentationMessage = logMessages.presentationMessageRestaurant[language];
        userState[phoneNumber].state = "AWAITING_RESTAURANT_SELECTION"
        break;
      case 3:
        /**
         * @description Retrieves attraction items from the database based on pagination settings. Sets presentation message for attractions and updates user state to await attraction selection.
         */
        items = await getItemsFromCollection(AttractionModel, startIndex, itemsPerPage);
        presentationMessage = logMessages.presentationMessageAttraction[language];
        userState[phoneNumber].state = "AWAITING_ATTRACTION_SELECTION"
        break;
      default:
        let invalidOptionMessage = '';
        invalidOptionMessage = logMessages.invalidOptionMessage[language];
        /**
        * @property {string} - Send the choice of user and the menu to the user.
        */
        await client.sendMessage(phoneNumber, invalidOptionMessage);
        return;
    }
    /**
   * @property {string} message - Message presenting the items according to the user's chosen language.
   */
    message += presentationMessage;
    await processItems(client, userState, items, phoneNumber, message, startIndex, itemsPerPage, language, option, presentationMessage);

  } catch (error) {
    console.error('Error loading items:', error);
    const itemLoadErrorMessage = logMessages.itemNotFound[language]
    /**
    * @property {string} - Send the choice of user and the menu to the user.
    */
    await client.sendMessage(phoneNumber, itemLoadErrorMessage);
  }
};

/**
 * @function getItemsFromCollection
 * @async
 * @description - Fetches items from a specified collection, with pagination.
 * @param {Mongoose.Model} collection - The Mongoose model representing the collection from which items are to be fetched.
 * @param {number} startIndex - The index from which to start fetching items.
 * @param {number} itemsPerPage - The number of items to fetch per page.
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of items fetched from the collection.
 */
const getItemsFromCollection = async (collection, startIndex, itemsPerPage) => {
  /**
   * @constant {Array<Object>} items - The list of items fetched from the collection.
   */
  return await collection.find().skip(startIndex).limit(itemsPerPage);
};

/**
 * @function getTotalItemsCount
 * @async
 * @description - Fetches the total count of items from a specified collection based on the option provided.
 * @param {number} option - The option representing the type of collection (1 for hotels, 2 for restaurants, 3 for attractions).
 * @returns {Promise<number>} - A promise that resolves to the total count of items in the specified collection. If the option is invalid, it resolves to 0.
 */
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

/**
 * @function processItems
 * @async
 * @description - Processes and sends a list of items to the user, including pagination options.
 * @param {Client} client - The client instance used to send messages.
 * @param {Object} userState - The user's current status, containing status and context information.
 * @param {Array<Object>} items - The list of items to be processed and sent to the user.
 * @param {string} phoneNumber - The user's phone number.
 * @param {string} message - The initial message to which item details will be appended.
 * @param {number} startIndex - The starting index for the list of items being processed.
 * @param {number} itemsPerPage - The number of items to be displayed per page.
 * @param {string} language - The user's preferred language.
 * @param {number} option - The category of items (1 for hotels, 2 for restaurants, 3 for attractions).
 * @returns {Promise<void>} - An empty promise indicating the completion of the item processing and message sending.
 */
const processItems = async (client, userState, items, phoneNumber, message, startIndex, itemsPerPage, language, option) => {

  /**
   * @description - Initialize the user state.
   */
  initializeUserState(phoneNumber, userState);

  if (items.length === 0) {
    /**
    * @constant {string} messageItemNotFound - Message indicating no items were found.
     */
    const messageItemNotFound = logMessages.itemNotFound[language];
    /**
    * @property {string} - Send the choice of user and the menu to the user.
    */
    await client.sendMessage(phoneNumber, messageItemNotFound);
    return;
  }

  /**
   * Appends each item's details to the message.
   * @param {Object} item - The current item being processed.
   * @param {number} index - The index of the current item in the list.
   */
  items.forEach((item, index) => {
    message += `${index + 1} - ${item.name}\n`;
  });

  /**
  * @constant {number} totalItems - The total number of items in the collection.
  */
  const totalItems = await getTotalItemsCount(option);
  /**
 * @constant {boolean} hasMoreItems - Indicates whether there are more items to display beyond the current page.
 */
  const hasMoreItems = (startIndex + itemsPerPage) < totalItems;

  /**
  * @constant {Object} menuOptions - The menu options messages based on the user's language preference.
  */
  const menuOptions = logMessages.menuOptions[language];


  /**
   * @description Adds the plus option and the back option if the start of the index is greater than 0, (page 2).
   */
  if (startIndex > 0) {
    /**
     * @property {seeMore} - Option to see more items if there are previous pages.
     * @property {goBack} - Option to go back to the previous menu.
     */
    message += menuOptions.seeMore;
    message += menuOptions.goBack;
  } else if (hasMoreItems) {
    /**
    * @property {seeMore} - Option to see more items if there are more items in the collection.
    */
    message += menuOptions.seeMore;
  }

  /**
  * @property {detailsOrExit} - Option to view details of an item or exit.
  */
  message += `\n${menuOptions.detailsOrExit}`;

  /**
  * @description - Updates the user's state with the last category, start index, and list of items.
  */
  updateUserState(phoneNumber, userState, {
    lastCategory: option,
    lastStartIndex: startIndex,
    items: items
  });

  /**
  * @property {string} - Send the choice of user and the menu to the user.
  */
  await client.sendMessage(phoneNumber, message);
}

/**
 * @function handleDetailsOrPagination
 * @description Handles the user's selection for more details or pagination for the selected category items.
 * @param {Object} client - The client instance used to send messages.
 * @param {string} phoneNumber - The phone number to send the information to.
 * @param {Object.<string, Object>} userState - The user's current state, containing status and some information.
 * @param {number} userchoice - The user's choice from the category items.
 * @returns {Promise<void>} An empty promise that resolves after the information has been processed.
 */
const handleDetailsOrPagination = async (client, phoneNumber, userState, userChoice) => {
  if (userChoice === 0) {
    await sendMainMenu(client, phoneNumber, userState);
  } else if (userChoice === 6) {
    await handlePagination(client, phoneNumber, userState);
  } else {
    await sendDetails(client, phoneNumber, userState, userChoice);
  }
};

/**
 * @function handlePagination
 * @description Handles pagination for the user's selected category.
 * @param {Object} client - The client instance used to send messages.
 * @param {string} phoneNumber - The phone number to send the information to.
 * @param {Object.<string, Object>} userState - The user's current state, containing status and some informations.
 * @returns {Promise<void>} An empty promise that resolves after pagination has been handled.
 */
const handlePagination = async (client, phoneNumber, userState) => {
  initializeUserState(phoneNumber, userState);


  /**
   * @constant {string} category - The last selected category by the user.
   */
  const category = userState[phoneNumber].lastCategory;

  /**
   * @constant {number} startIndex - The starting index for the next page of items.
   */
  const startIndex = userState[phoneNumber].lastStartIndex + 5;
  /**
  * @constant {number} itemsPerPage - The number of items to display per page.
  */
  const itemsPerPage = 5;

  if (category) {
    /**
     * @description - If there is a valid category selected, send the list for that category
     */
    await sendList(client, phoneNumber, category, userState, startIndex, itemsPerPage);
  } else {
    const categoryMessageError = logMessages.categoryError[language];
    /**
    * @property {string} - Send the choice of user and the menu to the user.
    */
    await client.sendMessage(phoneNumber, categoryMessageError);
  }
};

/**
 * @function sendDetails
 * @description Sends details about the selected menu item (e.g., hotels, restaurants, attractions) to the user.
 * @param {Object} client - The client instance used to send messages.
 * @param {string} phoneNumber - The phone number to send the details to.
 * @param {Object.<string, Object>} userState - The user's current state, containing status and some informations.
 * @param {number} choice - The user's choice from the main menu.
 * @returns {Promise<void>} An empty promise that resolves after the details have been sent.
 */
const sendDetails = async (client, phoneNumber, userState, userChoice) => {
  /**
  * @constant {Array<Object>} items - The list of items stored in the user's state.
  */
  const items = userState[phoneNumber].items;
  /**
   * @constant {number} category - The last category selected by the user.
   */
  const category = userState[phoneNumber].lastCategory;
  /**
   * @constant {number} startIndex - The starting index for the current list of items.
   */
  const startIndex = userState[phoneNumber].lastStartIndex;
  /**
  * @constant {string} language - The user's preferred language.
  */
  const language = userState[phoneNumber].language

  try {
    /**
     * @description - Checks that the user's choice is valid. The user must choose a number between 1 and the total number of items available.
     */
    if (userChoice > 0 && userChoice <= items.length) {
      /**
     * @constant {Object} selectedItem - The item selected by the user. One is subtracted to correctly access the item that starts with the first position 0. (e.g) if the user chooses userChoice = 1, userChoice - 1 results in 0, which is the index of the first item in the items array.
     */
      const selectedItem = items[userChoice - 1];
      await showItemDetails(client, phoneNumber, selectedItem);
      /**
       * @description - Updates the user's status to 'AWAITING_MORE_ITEMS' indicating that the user can see more items.
       */
      userState[phoneNumber].state = 'AWAITING_MORE_ITEMS';
      /**
       * @description - Sends the list of items back to the user, allowing them to see more options or details of other items.
       */
      await sendList(client, phoneNumber, category, userState, startIndex);
      /**
       * @description - Checks if the user has chosen the paging option (option 6).
       */
    } else if (userChoice === 6) {
      /**
       * @description - Calls the `handlePagination` function to handle the pagination of items, showing more items to the user.
       */
      await handlePagination(client, phoneNumber, userState);
      /**
       * @description - Checks if the user has chosen the back option (option 7) and if there are any previous pages available.
       */
    } else if (userChoice === 7 && startIndex > 0) {
      /**
      * @constant {number} previousStartIndex - Calculates the initial index of the previous page.
           */
      const previousStartIndex = Math.max(0, startIndex - 5);
      /**
       * @description - Sends the list of items from the previous page to the user.
       */
      await sendList(client, phoneNumber, category, userState, previousStartIndex);
    } else {
      /**
      * @constant {string} invalidOptionMessage - Message stating that the option is invalid.
      */
      const invalidOptionMessage = logMessages.invalidOptionMessage[language]
      /**
      * @property {string} - Send the choice of user and the menu to the user.
      */
      await client.sendMessage(phoneNumber, invalidOptionMessage);
      await sendList(client, phoneNumber, category, userState, startIndex);
    }
  } catch (error) {
    console.error('Error sending details:', error);
    const detailsError = logMessages.detailsError[language]
    /**
    * @property {string} - Send the choice of user and the menu to the user.
    */
    await client.sendMessage(phoneNumber, detailsError);
  }
};

/**
 * @function showItemDetails
 * @async
 * @description Sends detailed information about a selected item to the user.
 * @param {Client} client - The client instance for sending messages.
 * @param {string} phoneNumber - The phone number of the user receiving the details.
 * @param {Object} selectedItem - The selected item object containing details to be displayed.
 * @param {string} selectedItem.name - The name of the selected item.
 * @param {string} selectedItem.address - The address of the selected item.
 * @param {number} selectedItem.rating - The rating of the selected item.
 * @param {number} selectedItem.user_ratings_total - The total number of ratings for the selected item.
 * @param {Object} selectedItem.coordinates - The coordinates (latitude and longitude) of the selected item.
 * @param {number} selectedItem.coordinates.lat - The latitude coordinate of the item's location.
 * @param {number} selectedItem.coordinates.lng - The longitude coordinate of the item's location.
 * @param {Array<string>} selectedItem.photos - An array of URLs pointing to photos of the selected item.
 * @returns {Promise<void>} - A promise that resolves once the details and images are sent successfully.
 */
const showItemDetails = async (client, phoneNumber, selectedItem) => {
  /**
 * @constant {string} language - The language code retrieved from the user state based on the phone number.
 */
  const language = userState[phoneNumber].language;
  /**
 * @constant {Object} itemDetailsMessages - object containing item details specific to the retrieved language.
 */
  const itemDetailsMessages = logMessages.itemDetails[language];

  try {
    /**
     * @description - Builds the location URL using the item's coordinates.
     */
    const location = `https://maps.google.com/maps?q=${selectedItem.coordinates.lat},${selectedItem.coordinates.lng}&z=17&hl=br`;
    /**
     * @description - Assembles the item details to be sent to the user.
     */
    const itemDetails = `${itemDetailsMessages.receiveDetails}\n${itemDetailsMessages.name}: ${selectedItem.name}\n${itemDetailsMessages.address}: ${selectedItem.address}\n${itemDetailsMessages.rating}: ${selectedItem.rating}\n${itemDetailsMessages.totalRatings}: ${selectedItem.user_ratings_total}\n${itemDetailsMessages.location}: ${location}`;

    /**
     * @description - Sends the item details to the user.
     */
    await client.sendMessage(phoneNumber, itemDetails);

    /**
     * @description - Sends the item images to the user
     */
    for (let i = 0; i < selectedItem.photos.length; i++) {
      try {
        const media = await MessageMedia.fromUrl(selectedItem.photos[i], { unsafeMime: true });
        /**
        * @property {string} - Send the choice of user and the menu to the user.
        */
        await client.sendMessage(phoneNumber, media, { caption: `${i + 1}` });
      } catch (error) {
        console.error('Error sending image:', error);
      }
    }

  } catch (error) {
    console.error('Error showing item details:', error);
  }
};

/**
 * @function collectFeedback
 * @description - This method sets the user state to indicate that feedback is being collected, retrieves the appropriate feedback prompt message, and sends it to the user's phone number.
 * @async
 * @param {Client} client - Client instance used to send messages.
 * @param {string} phoneNumber - Telephone number to send the feedback prompt to.
 * @param {Object} userState - The user's current state, containing status and some informations.
 * @param {boolean} userState.isCollectingFeedback - Indicates if feedback is currently being collected from the user.
 * @param {string} userState.language - The user's preferred language for receiving messages.
 * @returns {Promise<void>} An empty Promise that is resolved after the feedback prompt has been successfully sent.
 */
const collectFeedback = async (client, phoneNumber, userState) => {
  /**
   * @property {boolean} - Set the user state to indicate that feedback is being collected
   */
  userState[phoneNumber].isCollectingFeedback = true;

  /**
   * @constant {messages} - Load the JSON file containing the log messages
   */
  const messages = loadLogMessages();

  /**
   * @constant {language} - Determine the user's language or default to Portuguese ('pt').
   */
  const language = userState[phoneNumber].language || 'pt';
  /**
   * @constant {feedbackPrompt} - Retrieve the feedback prompt message in the user's language or default to Portuguese if not available.
   */
  const feedbackPrompt = messages.provideFeedbackMessage[language] || messages.provideFeedbackMessage['pt'];

  /**
   * @property {string} - Send feedback mensage.
   */
  await client.sendMessage(phoneNumber, feedbackPrompt);
};

/**
 * @function messageListener
 * @description Listens for messages during feedback collection and processes them accordingly.
 * @param {Object} client - The client instance used to send messages.
 * @param {string} phoneNumber - The phone number to send the information to.
 * @param {Object.<string, Object>} userState - The user's current state, containing status and some informations.
 * @param {string} userName - The user's name.
 * @param {Object} messages - The log messages to be sent to the user.
 */
const messageListener = (client, phoneNumber, userState, userName, messages) => async (message) => {
  /**
  * @constant {string} language - Retrieving the user's preferred language, or default "pt"
  */
  const language = userState[phoneNumber].language || 'pt';
  /**
  * @constant {number} rating - capturing customer feedback and converting to int.
  */
  const rating = parseInt(message.body.trim());

  /**
   * @description - Checks that the rating is a number between 1 and 5.
   */
  if (isNaN(rating) || rating < 1 || rating > 5) {
    /**
    * @constant {string} invalidMessage - invalid message according to the user's language. If not, the default language "pt" is used.
       */
    const invalidMessage = messages.invalidOptionMessage[language] || messages.invalidOptionMessage['pt'];
    /**
  * @property {string} - Send the choice of user and the menu to the user.
  */
    await client.sendMessage(phoneNumber, invalidMessage);
  } else {
    try {
      /**
       * @description -  Save the evaluation in the database.
       */
      await EvaluationModel.findOneAndUpdate(
        { phoneNumber },
        { clientName: userName, phoneNumber: phoneNumber, rating: rating },
        { upsert: true, new: true }
      );

      /**
       * @constant {Object} confirmationMessage - Confirmation message according to the user's language, if there is no Portuguese standard.
       */
      const confirmationMessage = messages.feedbackMessage[language] || messages.feedbackMessage['pt'];
      /**
      * @property {string} - Send the choice of user and the menu to the user.
      */
      await client.sendMessage(phoneNumber, confirmationMessage);

      /**
       * @property {string} state - Update user status.
       */
      userState[phoneNumber].state = "LISTENING_ONLY";
      console.log(`Feedback received. The user ${userName} ended the conversation`);

      /**
       * @property {boolean} isCollectingFeedback - Define that feedback is no longer being collected.
       */
      userState[phoneNumber].isCollectingFeedback = false;

      /**
       * @property {Object} lastMessageTimestamp - Update the timestamp of the last message processed.
       */
      userState[phoneNumber].lastMessageTimestamp = message.timestamp;
    } catch (error) {
      console.error('Error saving feedback:', error);
      /**
     * @constant {string} errorMessage - Error message, default.
     */
      const errorMessage = 'Sorry, there was an error saving your feedback. Please try again later.';
      /**
      * @property {string} - Send the choice of user and the menu to the user.
      */
      await client.sendMessage(phoneNumber, errorMessage);
    }
  }
};


export default handleMessage;