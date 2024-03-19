import mongoose from "mongoose";

const attractionSchema = new mongoose.Schema(
  {
    name: String,
    address: String,
    phoneNumber: String,
    rating: Number,
    user_ratings_total: Number,
    coordinates: {
      lat: Number,
      lng: Number,
    },
    photos: [],
  },
  { collection: "Attractions" }
);

const AttractionModel = mongoose.model("Attractions", attractionSchema);

export default AttractionModel;
