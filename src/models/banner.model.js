const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    desktopImageUrl: { type: String, required: true, trim: true },
    mobileImageUrl: { type: String, required: true, trim: true },
    altText: { type: String, required: true, trim: true },
    targetUrl: { type: String, default: "#annadaan", trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startsAt: Date,
    endsAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("Banner", bannerSchema);
