// utils/generateSummary.js
const fs = require("fs");
const os = require("os");
const path = require("path");
const { GoogleGenAI, createUserContent, createPartFromUri } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function guessMimeType(ext) {
  const map = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
}

async function downloadToTemp(url, fileName) {
  const res = await fetch(url);
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Failed to download file (${res.status}): ${bodyText.slice(0, 300)}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());

  const ext = path.extname(fileName || url) || ".pdf";
  const tempPath = path.join(
    os.tmpdir(),
    `report-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  );
  fs.writeFileSync(tempPath, buffer);

  const contentType = res.headers.get("content-type") || guessMimeType(ext);
  return { tempPath, contentType };
}

async function uploadReportFile(report) {
  if (!report.filePath) return null;
  let tempPath;
  try {
    const downloaded = await downloadToTemp(report.filePath, report.fileName);
    tempPath = downloaded.tempPath;

    const uploaded = await ai.files.upload({
      file: tempPath,
      config: { mimeType: downloaded.contentType },
    });

    return uploaded;
  } catch (err) {
    console.error(`⚠️ Could not process file for report ${report._id}:`, err.message);
    return null;
  } finally {
    if (tempPath) fs.unlink(tempPath, () => {});
  }
}

// JSON schema Gemini must follow — this is what makes tables/charts possible on the frontend
const responseSchema = {
  type: "object",
  properties: {
    quickSummary: { type: "string" },
    labTimeline: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          tests: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                value: { type: "string" },
                unit: { type: "string" },
                normalRange: { type: "string" },
                flag: { type: "string", enum: ["HIGH", "LOW", "NORMAL", "UNKNOWN"] },
                numericValue: { type: "number", nullable: true },
              },
              required: ["name", "value", "flag"],
            },
          },
        },
        required: ["date", "tests"],
      },
    },
    otherVisits: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          diagnosis: { type: "string" },
          symptoms: { type: "string" },
          medications: { type: "string" },
          notes: { type: "string" },
        },
        required: ["date"],
      },
    },
    riskFlags: { type: "array", items: { type: "string" } },
    followUp: { type: "array", items: { type: "string" } },
  },
  required: ["quickSummary", "labTimeline", "otherVisits", "riskFlags", "followUp"],
};

async function generatePatientSummary(patient, reports) {
  const sortedReports = [...reports].sort(
    (a, b) => new Date(a.visitDate) - new Date(b.visitDate)
  );

  const uploadedFiles = await Promise.all(sortedReports.map(uploadReportFile));

  const reportsText = sortedReports
    .map((r, i) => {
      const dateStr = new Date(r.visitDate).toDateString();
      const fileNote = uploadedFiles[i]
        ? `(Original file attached below: "${r.fileName}" — read it for full details)`
        : r.filePath
        ? `(File "${r.fileName}" was attached but could not be read — rely on fields below)`
        : "(No file attached)";

      return `--- Report ${i + 1} | Visit date: ${dateStr} ${fileNote} ---
Diagnosis: ${r.diagnosis}
Symptoms: ${r.symptoms || "None noted"}
Allergies: ${r.allergies || "None noted"}
Current Medications: ${r.currentMedications || "None noted"}
Lab Results (as manually entered by doctor): ${r.labResults || "None noted"}
Notes: ${r.notes || "None"}`;
    })
    .join("\n\n");

  const promptText = `You are a clinical assistant helping a doctor review a patient's entire history WITHOUT reading every attached PDF page by page.

Patient: ${patient.name}, Age: ${patient.age}, Gender: ${patient.gender}, Blood Group: ${patient.bloodGroup}

Below is the structured visit log. Attached (if present) are the ORIGINAL report files (PDFs/images) for each visit — read them for actual lab values, dates, and details not captured in the typed fields.

${reportsText}

Extract every distinct blood/lab test you can find (from attachments and typed fields) into labTimeline, grouped by date. For every numeric test result, also fill numericValue with just the number (no units) so it can be charted — if a value isn't numeric (e.g. an ECG description), omit numericValue.

Put every non-lab visit (consultations, procedures, imaging, allergy episodes, etc.) into otherVisits.

Rules:
- Use actual values/dates from the attached files whenever available — don't just repeat the typed fields.
- If something isn't available, use "Not available" as the string value — never invent data.
- Be specific, not generic, in quickSummary, riskFlags, and followUp.
- Return ONLY valid JSON matching the required schema — no markdown, no code fences, no commentary.`;

  const parts = [promptText];
  uploadedFiles.forEach((file) => {
    if (file?.uri && file?.mimeType) {
      parts.push(createPartFromUri(file.uri, file.mimeType));
    }
  });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: createUserContent(parts),
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  // response.text should already be clean JSON because of responseSchema, but strip fences defensively
  const cleaned = response.text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return JSON.stringify(parsed); // store as JSON string in patient.aiSummary
  } catch (err) {
    console.error("⚠️ Gemini did not return valid JSON, falling back to raw text:", err.message);
    // Fallback so a bad response doesn't crash the request — frontend handles this shape too
    return JSON.stringify({
      quickSummary: response.text,
      labTimeline: [],
      otherVisits: [],
      riskFlags: [],
      followUp: [],
    });
  }
}

module.exports = generatePatientSummary;