import mongoose from "mongoose";
/** @module atrraction_model*/
/**
 * Attraction schema for data modeling using Mongoose.
 * @typedef {Object} AttractionSchema
 * @property {string} name - Name of the attraction.
 * @property {string} address - Address of the attraction.
 * @property {string} phoneNumber - Phone number of the attraction.
 * @property {number} rating - Rating of the attraction.
 * @property {number} user_ratings_total - Total number of user ratings.
 * @property {Object} coordinates - Coordinates of the attraction.
 * @property {number} coordinates.lat - Latitude of the attraction.
 * @property {number} coordinates.lng - Longitude of the attraction.
 * @property {Array<string>} photos - List of URLs of photos of the attraction.
 */

/**
 * Attraction model for interacting with the MongoDB database.
 * @typedef {mongoose.Model} AttractionModel
 */

/**
 * Defines the attraction schema and model using Mongoose.
 * @type {AttractionModel}
 */
const attractionSchema = new mongoose.Schema(
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
  { collection: "Attractions" }
);

/**
 * Attraction model for interacting with the MongoDB database.
 * @type {AttractionModel}
 */
const AttractionModel = mongoose.model("Attractions", attractionSchema);

export default AttractionModel;
