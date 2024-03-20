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

        // Exibir menu de opções após um atraso de 2 segundos
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
      }

      // Verifica se o estado do usuário indica que estamos aguardando uma escolha de opção
      if (userState[phoneNumber] && userState[phoneNumber].state === "AWAITING_CHOICE") {
        const userChoice = parseInt(message.body.trim());
        // Executa a lógica com base na escolha do usuário
        console.log(userChoice);


        // Verifica a escolha do usuário e executa a ação correspondente
        if (userChoice === 1) {
          await sendHotelList(client, message.from, userState);
        } else if (userChoice === 2) {
          await sendRestaurantList(client, message.from, userState);
        } else if (userChoice === 3) {
          await sendAttractionList(client, message.from, userState);
        } else if (userChoice === 4) {
          await client.sendMessage(
            message.from,
            "Atendimento encerrado. Obrigado!"
          ); // Encerra o atendimento

          userState[phoneNumber].state = null;
        }
        else {
          await client.sendMessage(
            message.from,
            "Opção inválida. Por favor, escolha uma opção válida."
          );
        }

      } else if (userState[phoneNumber] === "AWAITING_HOTEL_SELECTION") {
        // Caso o usuário tenha escolhido um hotel
        try {
          const hotels = await getHotelDetails();
          const userChoice = parseInt(message.body.trim());
          if (userChoice >= 1 && userChoice <= hotels.length) {
            const selectedHotel = hotels[userChoice - 1];
            const hotelDetails = `Nome: ${selectedHotel.name}\nEndereço: ${selectedHotel.address}\nAvaliação: ${selectedHotel.rating}\nAvaliações Totais: ${selectedHotel.user_ratings_total}\nCoordenadas: ${selectedHotel.coordinates}\nFotos: ${selectedHotel.photos}`;
            await client.sendMessage(message.from, hotelDetails);
            userState[phoneNumber] = {};
          } else {
            await client.sendMessage(
              message.from,
              "Opção inválida. Por favor, escolha uma opção válida."
            );
          }
        } catch (error) {
          console.error("Erro ao buscar hotéis:", error);
          await client.sendMessage(
            message.from,
            "Ocorreu um erro ao buscar hotéis. Por favor, tente novamente mais tarde."
          );
        }
        // Remove o estado do usuário após processar a escolha da opção
        delete userState[phoneNumber];
      } else if (userState[phoneNumber] === "AWAITING_RESTAURANT_SELECTION") {
        // Caso o usuário tenha escolhido um restaurante
        try {
          const restaurants = await getRestaurantDetails();
          const userChoice = parseInt(message.body.trim());
          if (userChoice >= 1 && userChoice <= restaurants.length) {
            const selectedRestaurant = restaurants[userChoice - 1];
            const restaurantDetails = `Nome: ${selectedRestaurant.name}\nEndereço: ${selectedRestaurant.address}\nAvaliação: ${selectedRestaurant.rating}\nAvaliações Totais: ${selectedRestaurant.user_ratings_total}\nCoordenadas: ${selectedRestaurant.coordinates}\nFotos: ${selectedRestaurant.photos}`;
            await client.sendMessage(message.from, restaurantDetails);
            userState[phoneNumber] = {};
          } else {
            await client.sendMessage(
              message.from,
              "Opção inválida. Por favor, escolha uma opção válida."
            );
          }
        } catch (error) {
          console.error("Erro ao buscar restaurantes:", error);
          await client.sendMessage(
            message.from,
            "Ocorreu um erro ao buscar restaurantes. Por favor, tente novamente mais tarde."
          );
        }
        // Remove o estado do usuário após processar a escolha da opção
        delete userState[phoneNumber];
      } else if (userState[phoneNumber] === "AWAITING_ATTRACTION_SELECTION") {
        // Caso o usuário tenha escolhido uma atração
        try {
          const attractions = await getAttractionDetails();
          const userChoice = parseInt(message.body.trim());
          if (userChoice >= 1 && userChoice <= attractions.length) {
            const selectedAttraction = attractions[userChoice - 1];
            const attractionDetails = `Nome: ${selectedAttraction.name}\nEndereço: ${selectedAttraction.address}\nAvaliação: ${selectedAttraction.rating}\nAvaliações Totais: ${selectedAttraction.user_ratings_total}\nCoordenadas: ${selectedAttraction.coordinates}\nFotos: ${selectedAttraction.photos}`;
            await client.sendMessage(message.from, attractionDetails);
            userState[phoneNumber] = {};
          } else {
            await client.sendMessage(
              message.from,
              "Opção inválida. Por favor, escolha uma opção válida."
            );
          }
        } catch (error) {
          console.error("Erro ao buscar atrações:", error);
          await client.sendMessage(
            message.from,
            "Ocorreu um erro ao buscar atrações. Por favor, tente novamente mais tarde."
          );
        }
        // Remove o estado do usuário após processar a escolha da opção
        delete userState[phoneNumber];
      }
    } catch (error) {
      console.error("Erro ao processar mensagem:", error);
    }
  });
};


const getHotels = async () => {
  try {
    // Buscar todos os hotéis na coleção de hotéis
    const hotels = await HotelModel.find({}, { name: 1, address: 1 }).limit(5);
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
    const restaurants = await RestaurantModel.find({}, { name: 1, address: 1 }).limit(5);
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
    const attractions = await AttractionModel.find({}, { name: 1, address: 1 }).limit(5);
    return attractions;
  } catch (error) {
    console.error("Erro ao buscar atrações:", error);
    throw error;
  }
};

// Função para obter detalhes de um hotel específico
const getHotelDetails = async (hotelId) => {
  try {
    // Buscar o hotel pelo ID na coleção de hotéis
    const hotel = await HotelModel.findById(hotelId);
    return hotel;
  } catch (error) {
    console.error("Erro ao buscar detalhes do hotel:", error);
    throw error;
  }
};

// Função para obter detalhes de um restaurante específico
const getRestaurantDetails = async (restaurantId) => {
  try {
    // Buscar o restaurante pelo ID na coleção de restaurantes
    const restaurant = await RestaurantModel.findById(restaurantId);
    return restaurant;
  } catch (error) {
    console.error("Erro ao buscar detalhes do restaurante:", error);
    throw error;
  }
};

// Função para obter detalhes de uma atração específica
const getAttractionDetails = async (attractionId) => {
  try {
    // Buscar a atração pelo ID na coleção de atrações
    const attraction = await AttractionModel.findById(attractionId);
    return attraction;
  } catch (error) {
    console.error("Erro ao buscar detalhes da atração:", error);
    throw error;
  }
};


const sendHotelList = async (client, phoneNumber, userState) => {
  try {
    const hotels = await getHotels();
    if (hotels.length > 0) {
      let hotelList = "Hotéis disponíveis:\n";
      for (let i = 0; i < Math.min(hotels.length, 5); i++) {
        hotelList += `${i + 1}. ${hotels[i].name}\n`;
      }
      await client.sendMessage(phoneNumber, hotelList);

      // Definir o estado do usuário para indicar que está aguardando uma escolha
      if (!userState[phoneNumber]) {
        userState[phoneNumber] = {};
      }
      userState[phoneNumber].state = "AWAITING_HOTEL_SELECTION";
    } else {
      await client.sendMessage(
        phoneNumber,
        "Não há hotéis disponíveis no momento."
      );
    }
  } catch (error) {
    console.error("Erro ao buscar hotéis:", error);
    await client.sendMessage(
      phoneNumber,
      "Ocorreu um erro ao buscar hotéis. Por favor, tente novamente mais tarde."
    );
  }
};

const sendRestaurantList = async (client, phoneNumber, userState) => {
  try {
    const restaurants = await getRestaurants();
    if (restaurants.length > 0) {
      let restaurantList = "Restaurantes disponíveis:\n";
      for (let i = 0; i < Math.min(restaurants.length, 5); i++) {
        restaurantList += `${i + 1}. ${restaurants[i].name}\n`;
      }
      await client.sendMessage(phoneNumber, restaurantList);
      userState[phoneNumber] = "AWAITING_RESTAURANT_SELECTION";
    } else {
      await client.sendMessage(
        phoneNumber,
        "Não há restaurantes disponíveis no momento."
      );
    }
  } catch (error) {
    console.error("Erro ao buscar restaurantes:", error);
    await client.sendMessage(
      phoneNumber,
      "Ocorreu um erro ao buscar restaurantes. Por favor, tente novamente mais tarde."
    );
  }
};

const sendAttractionList = async (client, phoneNumber, userState) => {
  try {
    const attractions = await getAttractions();
    if (attractions.length > 0) {
      let attractionList = "Atrações disponíveis:\n";
      for (let i = 0; i < Math.min(attractions.length, 5); i++) {
        attractionList += `${i + 1}. ${attractions[i].name}\n`;
      }
      await client.sendMessage(phoneNumber, attractionList);
      userState[phoneNumber] = "AWAITING_ATTRACTION_SELECTION";
    } else {
      await client.sendMessage(
        phoneNumber,
        "Não há atrações disponíveis no momento."
      );
    }
  } catch (error) {
    console.error("Erro ao buscar atrações:", error);
    await client.sendMessage(
      phoneNumber,
      "Ocorreu um erro ao buscar atrações. Por favor, tente novamente mais tarde."
    );
  }
};

export default handleMessage;

