const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  name: String,
  phoneNumber: String,
}, { collection: "Client" });

module.exports = mongoose.models.Client || mongoose.model('Client', ClientSchema);