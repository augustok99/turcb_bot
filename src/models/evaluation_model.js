import mongoose from 'mongoose';

const evaluationSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  rating: { type: Number, required: true },
},
  { collection: "Evaluations" }
);

const EvaluationModel = mongoose.model('Evaluations', evaluationSchema);

export default EvaluationModel;