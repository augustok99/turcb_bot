import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
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
  { collection: "Restaurants" }
);

const RestaurantModel = mongoose.model("Restaurants", restaurantSchema);

export default RestaurantModel;
