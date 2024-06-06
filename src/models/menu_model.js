import mongoose from "mongoose";

const menuSchema = new mongoose.Schema(
  {
    optionNumber: Number,
    description: String,
    action: String,
  },
  { collection: "Menu" }
);

const MenuModel = mongoose.model("Menu", menuSchema);

export default MenuModel;
