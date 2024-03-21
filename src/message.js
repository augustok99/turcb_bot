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


        // Verifica a escolha do usuário e executa a ação correspondente
        switch (userChoice) {
          case 1:
            await sendHotelList(client, message.from, userState);
            break;
          case 2:
            await sendRestaurantList(client, message.from, userState);
            break;
          case 3:
            await sendAttractionList(client, message.from, userState);
            break;
          case 4:
            await client.sendMessage(
              message.from,
              "Atendimento encerrado. Obrigado!"
            ); // Encerra o atendimento
            userState[phoneNumber].state = null;
            break;
          default:
            await client.sendMessage(
              message.from,
              "Opção inválida. Por favor, escolha uma opção válida."
            );
        }

      } else if (userState[phoneNumber] && userState[phoneNumber].state === "AWAITING_HOTEL_SELECTION") {
        // Caso o usuário tenha escolhido um hotel
        const userChoice = parseInt(message.body.trim()); // Escolha do usuário

        try {
          const hotels = await getHotels(); // Obter a lista de hotéis disponíveis

          // Verificar se o número da escolha está dentro dos limites da lista de hotéis
          if (userChoice >= 1 && userChoice <= hotels.length) {
            const selectedHotel = hotels[userChoice - 1]; // Hotel selecionado
            // Enviar os detalhes do hotel para o usuário
            const hotelDetails = `Nome: ${selectedHotel.name}\nEndereço: ${selectedHotel.address}\nAvaliação: ${selectedHotel.rating}\nAvaliações Totais: ${selectedHotel.user_ratings_total}\nCoordenadas: ${selectedHotel.coordinates}\nFotos: ${selectedHotel.photos}`;
            await client.sendMessage(phoneNumber, hotelDetails);
            // const instruction = `Para voltar ao Menu anterior escreva 0`
            // await client.sendMessage(instruction);

            // const userResponse = message.body.trim();
            // console.log(userResponse, typeof (userResponse));

          } else {
            // Caso o número da escolha esteja fora dos limites, enviar uma mensagem de erro
            await client.sendMessage(
              phoneNumber,
              "Opção inválida. Por favor, escolha uma opção válida."
            );
          }
        } catch (error) {
          console.error("Erro ao buscar hotéis:", error);
          await client.sendMessage(
            phoneNumber,
            "Ocorreu um erro ao buscar hotéis. Por favor, tente novamente mais tarde."
          );
        }

        // Coloca o estado do usuário como esperar selecao de hotel após processar a seleção do hotel
        userState[phoneNumber].state = "AWAITING_HOTEL_SELECTION";

      } else if (userState[phoneNumber] && userState[phoneNumber] === "AWAITING_RESTAURANT_SELECTION") {
        // Caso o usuário tenha escolhido um restaurante
        const userChoice = parseInt(message.body.trim());

        try {
          const restaurants = await getRestaurants(); // Obter a lista de restaurantes disponíveis

          // Verificar se o número da escolha está dentro dos limites da lista de hotéis
          if (userChoice >= 1 && userChoice <= restaurants.length) {
            const selectedRestaurant = restaurants[userChoice - 1]; // Hotel selecionado
            // Enviar os detalhes do hotel para o usuário
            const restaurantsDetails = `Nome: ${selectedRestaurant.name}\nEndereço: ${selectedRestaurant.address}\nAvaliação: ${selectedRestaurant.rating}\nAvaliações Totais: ${selectedRestaurant.user_ratings_total}\nCoordenadas: ${selectedRestaurant.coordinates}\nFotos: ${selectedRestaurant.photos}`;
            await client.sendMessage(phoneNumber, restaurantsDetails);
            // const instruction = `Para voltar ao Menu anterior escreva 0`
            // await client.sendMessage(instruction);

            // const userResponse = message.body.trim();
            // console.log(userResponse, typeof (userResponse));

          } else {
            // Caso o número da escolha esteja fora dos limites, enviar uma mensagem de erro
            await client.sendMessage(
              phoneNumber,
              "Opção inválida. Por favor, escolha uma opção válida."
            );
          }
        } catch (error) {
          console.error("Erro ao buscar restaurantes:", error);
          await client.sendMessage(
            phoneNumber,
            "Ocorreu um erro ao buscar restaurantes. Por favor, tente novamente mais tarde."
          );
        }



        // Coloca o estado do usuário em espera de selecao após processar a seleção do restaurante
        userState[phoneNumber].state = "AWAITING_RESTAURANT_SELECTION";

      }
      else if (userState[phoneNumber] && userState[phoneNumber] === "AWAITING_ATTRACTION_SELECTION") {
        // Caso o usuário tenha escolhido uma atração
        const userChoice = parseInt(message.body.trim());
        console.log(userResponse, typeof (userResponse));

        try {
          const atrractions = await getAttractions(); // Obter a lista de atrações turisticas disponíveis

          // Verificar se o número da escolha está dentro dos limites da lista de hotéis
          if (userChoice >= 1 && userChoice <= atrractions.length) {
            const selectedAttraction = atrractions[userChoice - 1]; // Hotel selecionado
            // Enviar os detalhes do hotel para o usuário
            const atrractionsDetails = `Nome: ${selectedAttraction.name}\nEndereço: ${selectedAttraction.address}\nAvaliação: ${selectedAttraction.rating}\nAvaliações Totais: ${selectedAttraction.user_ratings_total}\nCoordenadas: ${selectedAttraction.coordinates}\nFotos: ${selectedAttraction.photos}`;
            await client.sendMessage(phoneNumber, atrractionsDetails);
            // const instruction = `Para voltar ao Menu anterior escreva 0`
            // await client.sendMessage(instruction);

            // const userResponse = message.body.trim();
            // console.log(userResponse, typeof (userResponse));
          } else {
            // Caso o número da escolha esteja fora dos limites, enviar uma mensagem de erro
            await client.sendMessage(
              phoneNumber,
              "Opção inválida. Por favor, escolha uma opção válida."
            );
          }
        } catch (error) {
          console.error("Erro ao buscar restaurantes:", error);
          await client.sendMessage(
            phoneNumber,
            "Ocorreu um erro ao buscar restaurantes. Por favor, tente novamente mais tarde."
          );
        }
        // Coloca o estado do usuário em espera de selecao após processar a seleção do restaurante
        userState[phoneNumber].state = "AWAITING_RESTAURANT_SELECTION";
      }
    } catch (error) {
      console.error("Erro ao processar mensagem:", error);
    }
  });
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


const sendHotelList = async (client, phoneNumber, userState) => {
  try {
    const hotels = await getHotels();
    if (hotels.length > 0) {
      let hotelList = "Escolha um hotel disponível para mais detalhes:\n";
      for (let i = 0; i < Math.min(hotels.length, 5); i++) {
        hotelList += `${i + 1}. ${hotels[i].name}\n`;
      }
      await client.sendMessage(phoneNumber, hotelList);

      // Definir o estado do usuário para indicar que está aguardando uma escolha
      if (!userState[phoneNumber]) {
        userState[phoneNumber] = {};
      }
      userState[phoneNumber] = { state: "AWAITING_HOTEL_SELECTION" };
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
      let restaurantList = "Escolha um restaurante disponível para mais detalhes:\n";
      for (let i = 0; i < Math.min(restaurants.length, 5); i++) {
        restaurantList += `${i + 1}. ${restaurants[i].name}\n`;
      }
      await client.sendMessage(phoneNumber, restaurantList);
      userState[phoneNumber] = { state: "AWAITING_RESTAURANT_SELECTION" };
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
      let attractionList = "Escolha uma atração turística disponível para mais detalhes:\n";
      for (let i = 0; i < Math.min(attractions.length, 5); i++) {
        attractionList += `${i + 1}. ${attractions[i].name}\n`;
      }
      await client.sendMessage(phoneNumber, attractionList);
      userState[phoneNumber] = { state: "AWAITING_ATTRACTION_SELECTION" };
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