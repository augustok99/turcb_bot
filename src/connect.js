import dotenv from "dotenv";
import mongoose from "mongoose";
/** @module connect*/

/**
 * @function connectToDatabase
 * @async
 * @description - Connects to the MongoDB database using the URI specified in the .env file.
 * @returns {Promise<void>} - An empty Promise that returns no explicit value.
 * @throws {Error} - If there is an error when connecting to MongoDB.
 */
async function connectToDatabase() {

  const path = "../.env";

  /**
   * @description - Load the environment variables from the .env file
   */
  dotenv.config({ path });

  /**
   * @description - Gets the MongoDB connection URI from the .env file.
   */
  const uri = process.env.MONGODB_URI;

  try {
    if ([0, 3].includes(mongoose.connection.readyState)) {
      await mongoose.connect(uri, { dbName: "bot_system" });
      console.log("Conexão com o MongoDB estabelecida com sucesso.");
    } else {
      console.log("O mongoose já está conectado ao MongoDB!");
    }
  } catch (error) {
    console.error("Erro ao conectar ao MongoDB:", error);
  }
}

export default connectToDatabase;

