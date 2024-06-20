import mongoose from 'mongoose';
/** @module evaluation_model*/
/**
 * Evaluation schema for data modeling using Mongoose.
 * @typedef {Object} EvaluationSchema
 * @property {string} clientName - Name of the client.
 * @property {string} phoneNumber - Phone number of the client.
 * @property {number} rating - Rating given by the client.
 */

/**
 * Evaluation model for interacting with the MongoDB database.
 * @typedef {mongoose.Model} EvaluationModel
 */

/**
 * Defines the evaluation schema and model using Mongoose.
 * @type {EvaluationModel}
 */
const evaluationSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  rating: { type: Number, required: true },
},
  { collection: "Evaluations" }
);

/**
 * Evaluation model for interacting with the MongoDB database.
 * @type {EvaluationModel}
 */
const EvaluationModel = mongoose.model('Evaluations', evaluationSchema);

export default EvaluationModel;
