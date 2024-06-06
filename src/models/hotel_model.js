import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema(
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
  { collection: "Hotels" }
);

const HotelModel = mongoose.model("Hotels", hotelSchema);

export default HotelModel;
