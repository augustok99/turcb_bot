import mongoose from "mongoose";
/** @module client_model*/
/**
 * Client schema for data modeling using Mongoose.
 * @typedef {Object} ClientSchema
 * @property {string} name - Name of the client.
 * @property {string} phoneNumber - Phone number of the client.
 */

/**
 * Client model for interacting with the MongoDB database.
 * @typedef {mongoose.Model} ClientModel
 */

/**
 * Defines the client schema and model using Mongoose.
 * @type {ClientModel}
 */
const clientSchema = new mongoose.Schema(
  {
    name: String,
    phoneNumber: String,
  },
  { collection: "Clients" }
);

/**
 * @description - Client model for interacting with the MongoDB database.
 * @type {ClientModel}
 */
const ClientModel = mongoose.model("Clients", clientSchema);

export default ClientModel;