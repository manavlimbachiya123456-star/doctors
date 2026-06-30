const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    contact: { type: String, default: "" },

    patientId: { type: String, unique: true, required: true },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"],
      default: "Unknown",
    },

    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // AI-generated summary, stored after the doctor requests it
    aiSummary: { type: String, default: "" },
    aiSummaryGeneratedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Patient", patientSchema);