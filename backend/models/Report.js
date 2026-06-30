const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    visitDate: { type: Date, default: Date.now },
    diagnosis: { type: String, required: true },
    symptoms: { type: String, default: "" },
    allergies: { type: String, default: "" },
    currentMedications: { type: String, default: "" },
    labResults: { type: String, default: "" },
    notes: { type: String, default: "" },

    filePath: { type: String, default: "" },
    fileName: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);