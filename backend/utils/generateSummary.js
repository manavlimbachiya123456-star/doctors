const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generatePatientSummary(patient, reports) {
  // Combine all reports into one readable block of text
  const reportsText = reports
    .map((r, index) => {
      return `Report ${index + 1} (Visit date: ${r.visitDate.toDateString()}):
Diagnosis: ${r.diagnosis}
Symptoms: ${r.symptoms || "None noted"}
Allergies: ${r.allergies || "None noted"}
Current Medications: ${r.currentMedications || "None noted"}
Lab Results: ${r.labResults || "None noted"}
Notes: ${r.notes || "None"}`;
    })
    .join("\n\n");

  const prompt = `You are assisting an infectious disease specialist. Below is the medical history of a patient across multiple visits.

Patient: ${patient.name}, Age: ${patient.age}, Gender: ${patient.gender}, Blood Group: ${patient.bloodGroup}

Medical Reports:
${reportsText}

Write a concise clinical summary covering:
1. Overall health trend across these visits
2. Key risk flags or concerning patterns (e.g. recurring symptoms, abnormal lab trends, allergy/medication conflicts)
3. Any recommended follow-up actions

Keep it professional and concise, formatted in clear sections.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text;
}

module.exports = generatePatientSummary;