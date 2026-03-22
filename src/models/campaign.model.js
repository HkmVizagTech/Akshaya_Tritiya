const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  utm: {
    source: { type: String, required: true },
    medium: { type: String },
    campaign: { type: String, required: true },
    content: { type: String },
    term: { type: String }
  },
  generatedUrl: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
