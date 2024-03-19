import { connectToDatabase } from "./connect.js";
import { mongoose } from "mongoose";
import AttractionModel from "../models/attraction_model.js";
import HotelModel from "../models/hotel_model.js";
import RestaurantModel from "../models/restaurant_model.js";
import fs from "fs";

const saveOrUpdateData = async (filePath, Model) => {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    for (const item of data) {
      const existingItem = await Model.findOne({ name: item.name });

      if (existingItem) {
        await Model.findOneAndUpdate({ name: item.name }, item);
        console.log(`"${item.name}" atualizado.`);
      } else {
        await Model.create(item);
        console.log(`"${item.name}" criado.`);
      }
    }

    console.log(`Processo concluído para ${Model.modelName}.`);
  } catch (err) {
    console.error(`Erro ao processar ${Model.modelName}: ${err.message}`);
  }
};

const main = async () => {
  try {
    // Inicia a conexão com o banco de dados MongoDB
    await connectToDatabase();

    // Define os arquivos e modelos para processamento
    const files = [
      {
        filePath: "../data/attractions_data.json",
        Model: AttractionModel,
      },
      { filePath: "../data/hotels_data.json", Model: HotelModel },
      {
        filePath: "../data/restaurants_data.json",
        Model: RestaurantModel,
      },
    ];

    // Processa cada arquivo e modelo
    for (const file of files) {
      await saveOrUpdateData(file.filePath, file.Model);
    }

    // Fecha a conexão com o banco de dados
    await mongoose.connection.close();

    process.exit(0);
  } catch (err) {
    console.error(`Erro no processo principal: ${err.message}`);
  }
};

main();
