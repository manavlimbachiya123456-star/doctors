const dns = require('dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])
dns.setDefaultResultOrder('ipv4first')

//all requires

const express = require("express");

const mongoose = require("mongoose");
const cors = require("cors");
const User = require("./models/User");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const verifyToken = require('./middleware/verifyToken');

const Patient = require("./models/Patient");
const Report = require("./models/Report");
const upload = require("./middleware/upload");
const generatePatientSummary = require("./utils/generateSummary");

const PORT = process.env.PORT || 3000;

//exppress
const app = express();

//mongo connection

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));


  //middlewaare

app.use(cors());
app.use(express.json());



//routes

app.get("/", (req, res) => {
  res.send("Server is running");
});


//signup

app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    await user.save();

    res.status(201).json({ message: "User added successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});


//login route

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Wrong password" });

    // ✅ token created here
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    res.status(200).json({ token, user: { id: user._id, username: user.username } })
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});


app.get("/profile", verifyToken, (req, res) => {
  res.json({ user: req.user })
})


//patients



app.post("/patients", verifyToken, async (req, res) => {
  try {
    const { name, age, gender, contact, patientId, bloodGroup } = req.body;

    if (!name || !age || !gender || !patientId) {
      return res.status(400).json({ message: "Name, age, gender, and patientId are required" });
    }

    const patient = new Patient({
      name,
      age,
      gender,
      contact,
      patientId,
      bloodGroup,
      doctor: req.user.id,
    });

    await patient.save();
    res.status(201).json(patient);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

app.get("/patients", verifyToken, async (req, res) => {
  try {
    const patients = await Patient.find({ doctor: req.user.id });
    res.status(200).json(patients);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

app.get("/patients/:id", verifyToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    if (patient.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.status(200).json(patient);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

app.put("/patients/:id", verifyToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    if (patient.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { name, age, gender, contact, patientId, bloodGroup } = req.body;
    if (name !== undefined) patient.name = name;
    if (age !== undefined) patient.age = age;
    if (gender !== undefined) patient.gender = gender;
    if (contact !== undefined) patient.contact = contact;
    if (patientId !== undefined) patient.patientId = patientId;
    if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup;

    await patient.save();
    res.status(200).json(patient);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

app.delete("/patients/:id", verifyToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    if (patient.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await patient.deleteOne();
    res.status(200).json({ message: "Patient deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});


//report




app.post("/reports", verifyToken, upload.single("file"), async (req, res) => {
  try {
    const { patient, diagnosis, symptoms, allergies, currentMedications, labResults, notes } = req.body;

    if (!patient || !diagnosis) {
      return res.status(400).json({ message: "patient and diagnosis are required" });
    }

    const existingPatient = await Patient.findById(patient);
    if (!existingPatient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    if (existingPatient.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to add report for this patient" });
    }

    const report = new Report({
      patient,
      doctor: req.user.id,
      diagnosis,
      symptoms,
      allergies,
      currentMedications,
      labResults,
      notes,
      filePath: req.file ? req.file.path : "",
      fileName: req.file ? req.file.originalname : "",
    });

    await report.save();
    res.status(201).json(report);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});


//reports crud

app.get("/reports/patient/:patientId", verifyToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    if (patient.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const reports = await Report.find({ patient: req.params.patientId }).sort({ visitDate: -1 });
    res.status(200).json(reports);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

app.get("/reports/:id", verifyToken, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });

    if (report.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.status(200).json(report);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

app.put("/reports/:id", verifyToken, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });

    if (report.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { diagnosis, symptoms, allergies, currentMedications, labResults, notes } = req.body;
    if (diagnosis !== undefined) report.diagnosis = diagnosis;
    if (symptoms !== undefined) report.symptoms = symptoms;
    if (allergies !== undefined) report.allergies = allergies;
    if (currentMedications !== undefined) report.currentMedications = currentMedications;
    if (labResults !== undefined) report.labResults = labResults;
    if (notes !== undefined) report.notes = notes;

    await report.save();
    res.status(200).json(report);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

app.delete("/reports/:id", verifyToken, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });

    if (report.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await report.deleteOne();
    res.status(200).json({ message: "Report deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});



//ai summary route



app.post("/patients/:id/summary", verifyToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    if (patient.doctor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const reports = await Report.find({ patient: req.params.id }).sort({ visitDate: 1 });

    if (reports.length === 0) {
      return res.status(400).json({ message: "No reports found for this patient yet" });
    }

    const summary = await generatePatientSummary(patient, reports);

    patient.aiSummary = summary;
    patient.aiSummaryGeneratedAt = new Date();
    await patient.save();

    res.status(200).json({
      summary,
      generatedAt: patient.aiSummaryGeneratedAt,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});



app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
