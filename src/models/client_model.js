import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: String,
    phoneNumber: String,
  },
  { collection: "Clients" }
);

const ClientModel = mongoose.model("Clients", clientSchema);

export default ClientModel;
