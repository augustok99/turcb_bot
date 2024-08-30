import mongoose from "mongoose";
/** @module hotel_model*/
/**
 * Hotel schema for data modeling using Mongoose.
 * @typedef {Object} HotelSchema
 * @property {string} name - Name of the hotel.
 * @property {string} address - Address of the hotel.
 * @property {string} phoneNumber - Phone number of the hotel.
 * @property {number} rating - Rating of the hotel.
 * @property {number} user_ratings_total - Total user ratings for the hotel.
 * @property {Object} coordinates - Geographical coordinates of the hotel.
 * @property {number} coordinates.lat - Latitude of the hotel.
 * @property {number} coordinates.lng - Longitude of the hotel.
 * @property {Array<string>} photos - Photos of the hotel.
 */

/**
 * Hotel model for interacting with the MongoDB database.
 * @typedef {mongoose.Model} HotelModel
 */

/**
 * Defines the hotel schema and model using Mongoose.
 * @type {HotelModel}
 */
const hotelSchema = new mongoose.Schema(
 {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone_number: { type: String, required: true },
    rating: { type: Number, required: false },
    user_ratings_total: { type: Number, required: false },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    photos: [],
  },
  { collection: "Hotels" }
);

/**
 * @description - Modelo do hotel para interação com o banco de dados MongoDB.
 * @type {HotelModel}
 */
const HotelModel = mongoose.model("Hotels", hotelSchema);

export default HotelModel;

