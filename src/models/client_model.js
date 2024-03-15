import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: String,
    phoneNumber: String,
  },
  { collection: "Client" }
);

const ClientModel = mongoose.model("Client", clientSchema);

export default ClientModel;
