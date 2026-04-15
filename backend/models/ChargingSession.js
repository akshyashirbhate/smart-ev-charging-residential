const mongoose = require("mongoose");

const ChargingSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: { type: String, required: false },
  startTime: { type: Date },
  endTime: { type: Date },
  energyConsumed: { type: Number, default: 0 }, // in kWh
  cost: { type: Number, default: 0 }, // in currency units
  status: { type: String, enum: ["active", "completed"], default: "active" }
});

module.exports = mongoose.model("ChargingSession", ChargingSessionSchema);
