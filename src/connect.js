import dotenv from "dotenv";
import mongoose from "mongoose";

async function connectToDatabase() {

  const path = ".env";

  dotenv.config({ path });

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
