import { config } from "dotenv";

config();

import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
  return mongoose;
}

export { connectToDatabase };
