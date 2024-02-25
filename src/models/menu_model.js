const mongoose = require('mongoose');

const MenuSchema = new mongoose.Schema({
  optionNumber: Number,
  description: String,
  action: String,
}, { collection: "Menu" });

module.exports = mongoose.models.Menu || mongoose.model('Menu', MenuSchema);