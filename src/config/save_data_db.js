import mongoose from 'mongoose';
import AttractionModel from "../models/attraction_model.js";
import HotelModel from "../models/hotel_model.js";
import RestaurantModel from "../models/restaurant_model.js";
import fs from "fs";
import dotenv from 'dotenv';
/** @module save_data_db*/
/**
 * @function connectToDatabase
 * @async
 * @description Connects to the MongoDB database using Mongoose.
 * @returns {Promise<void>} A Promise that resolves once the connection is established.
 */
async function connectToDatabase() {

  dotenv.config({ path: "../../.env" });

  const uri = process.env.MONGODB_URI;

  try {
    if ([0, 3].includes(mongoose.connection.readyState)) {
      await mongoose.connect(uri, { dbName: "bot_system" });
      console.log("MongoDB connection successfully established.");
    } else {
      console.log("Mongoose is already connected to MongoDB!");
    }
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

/**
 * @function saveOrUpdateData
 * @async
 * @description Reads JSON data from a file and saves or updates documents in the MongoDB collection specified by the Model.
 * @param {string} filePath - The path to the JSON file containing data to be saved or updated.
 * @param {mongoose.Model} Model - The Mongoose model representing the MongoDB collection.
 * @returns {Promise<void>} A Promise that resolves once all data is processed and saved or updated.
 */
const saveOrUpdateData = async (filePath, Model) => {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    for (const item of data) {
      const existingItem = await Model.findOne({ name: item.name });

      if (existingItem) {
        await Model.findOneAndUpdate({ name: item.name }, item);
        console.log(`"${item.name}" updated.`);
      } else {
        await Model.create(item);
        console.log(`"${item.name}" created.`);
      }
    }

    console.log(`Process completed for ${Model.modelName}.`);
  } catch (err) {
    console.error(`Processing error ${Model.modelName}: ${err.message}`);
  }
};
/**
 * @function main
 * @async
 * @description Main function to orchestrate the process of connecting to MongoDB, processing data files, and closing the connection.
 * @returns {Promise<void>} A Promise that resolves once all files are processed and the database connection is closed.
 */
const main = async () => {
  try {
    await connectToDatabase();

    /**
    * @constant {Array<{ filePath: string, Model: mongoose.Model<any> }>} files - An array of objects specifying JSON file paths and corresponding Mongoose models for data processing.
    */

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

    for (const file of files) {
      await saveOrUpdateData(file.filePath, file.Model);
    }

    await mongoose.connection.close();

    process.exit(0);
  } catch (err) {
    console.error(`Error in the main proceedings: ${err.message}`);
  }
};

main();