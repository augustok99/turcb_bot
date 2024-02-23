require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;

async function connectToDatabase() {
    if (mongoose.connection.readyState ===  0) {
        await mongoose.connect(uri);
    }
    return mongoose;
}

module.exports = { connectToDatabase };