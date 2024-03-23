import mongoose from 'mongoose';

const evaluationSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  rating: { type: Number, required: true },
});

const EvaluationModel = mongoose.model('Evaluation', evaluationSchema);

export default EvaluationModel;