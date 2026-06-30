import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";

const emptyReport = {
  diagnosis: "",
  symptoms: "",
  allergies: "",
  currentMedications: "",
  labResults: "",
  notes: "",
};

const initials = (name = "") =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass =
  "w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-[#0F2942] bg-[#FAFBFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-shadow";

const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm, setReportForm] = useState(emptyReport);
  const [file, setFile] = useState(null);
  const [savingReport, setSavingReport] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const fetchData = async () => {
    try {
      const [patientRes, reportsRes] = await Promise.all([
        api.get(`/patients/${id}`),
        api.get(`/reports/patient/${id}`),
      ]);
      setPatient(patientRes.data);
      setReports(reportsRes.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleReportChange = (e) => setReportForm({ ...reportForm, [e.target.name]: e.target.value });

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setSavingReport(true);
    try {
      const formData = new FormData();
      formData.append("patient", id);
      Object.entries(reportForm).forEach(([key, value]) => formData.append(key, value));
      if (file) formData.append("file", file);

      await api.post("/reports", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setReportForm(emptyReport);
      setFile(null);
      setShowReportForm(false);
      fetchData();
    } catch (err) {
      console.log(err);
      alert(err.response?.data?.message || "Failed to save report");
    } finally {
      setSavingReport(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm("Delete this report?")) return;
    try {
      await api.delete(`/reports/${reportId}`);
      fetchData();
    } catch (err) {
      console.log(err);
      alert("Failed to delete report");
    }
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const res = await api.post(`/patients/${id}/summary`);
      setPatient({ ...patient, aiSummary: res.data.summary, aiSummaryGeneratedAt: res.data.generatedAt });
    } catch (err) {
      console.log(err);
      alert(err.response?.data?.message || "Failed to generate summary");
    } finally {
      setGeneratingSummary(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#FAFBFC]">
        <Sidebar />
        <main className="flex-1 px-10 py-8">
          <p className="text-slate-400 text-sm">Loading patient record...</p>
        </main>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen bg-[#FAFBFC]">
        <Sidebar />
        <main className="flex-1 px-10 py-8">
          <p className="text-slate-400 text-sm">Patient not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#FAFBFC]">
      <Sidebar />

   <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 overflow-auto pt-20 md:pt-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-slate-400 hover:text-[#0F2942] mb-5 transition-colors"
        >
          ← All patients
        </button>

        {/* Patient header */}
       <div className="w-full bg-white border border-slate-200 rounded-xl p-6 mb-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-[#0F2942] flex items-center justify-center shrink-0">
            <span className="text-white text-xl font-medium font-serif">{initials(patient.name)}</span>
          </div>
          <div className="flex-1">
            <h1 className="font-serif text-2xl text-[#0F2942]">{patient.name}</h1>
            <p className="font-mono text-xs text-slate-400 mt-0.5">{patient.patientId}</p>
            <div className="flex items-center gap-2 mt-2.5">
              <span className="text-xs text-slate-500 border border-slate-200 rounded-md px-2 py-1">{patient.age} yrs</span>
              <span className="text-xs text-slate-500 border border-slate-200 rounded-md px-2 py-1 capitalize">{patient.gender}</span>
              <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-md px-2 py-1">{patient.bloodGroup}</span>
              {patient.contact && <span className="text-xs text-slate-400 ml-1">{patient.contact}</span>}
            </div>
          </div>
        </div>

        {/* AI Summary — distinct visual treatment */}
       <div className="w-full bg-gradient-to-br from-[#EFF6FF] to-white border border-[#DBEAFE] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#2563EB] flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">AI</span>
              </span>
              <h2 className="font-serif text-lg text-[#0F2942]">Clinical summary</h2>
            </div>
            <button
              onClick={handleGenerateSummary}
              disabled={generatingSummary || reports.length === 0}
              className="bg-[#2563EB] text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-[#1d4fc7] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {generatingSummary ? "Generating…" : patient.aiSummary ? "Regenerate" : "Generate summary"}
            </button>
          </div>

          {reports.length === 0 ? (
            <p className="text-sm text-slate-400">Add at least one report to generate a summary.</p>
          ) : patient.aiSummary ? (
            <>
              <p className="text-sm text-[#1e3a5f] whitespace-pre-line leading-relaxed">{patient.aiSummary}</p>
              {patient.aiSummaryGeneratedAt && (
                <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-[#DBEAFE]">
                  Generated {new Date(patient.aiSummaryGeneratedAt).toLocaleString()} · AI-assisted, review before clinical use
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400">No summary generated yet — click Generate summary above.</p>
          )}
        </div>

        {/* Reports */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-lg text-[#0F2942]">Visit reports</h2>
          <button
            onClick={() => setShowReportForm(!showReportForm)}
            className="text-sm font-medium text-[#2563EB] hover:underline"
          >
            {showReportForm ? "Cancel" : "+ Add report"}
          </button>
        </div>

        {showReportForm && (
          <form onSubmit={handleReportSubmit} className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Diagnosis *">
                  <input name="diagnosis" value={reportForm.diagnosis} onChange={handleReportChange} required className={inputClass} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Symptoms">
                  <input name="symptoms" value={reportForm.symptoms} onChange={handleReportChange} className={inputClass} />
                </Field>
              </div>
              <Field label="Allergies">
                <input name="allergies" value={reportForm.allergies} onChange={handleReportChange} className={inputClass} />
              </Field>
              <Field label="Current medications">
                <input name="currentMedications" value={reportForm.currentMedications} onChange={handleReportChange} className={inputClass} />
              </Field>
              <div className="col-span-2">
                <Field label="Lab results">
                  <input name="labResults" value={reportForm.labResults} onChange={handleReportChange} className={inputClass} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Notes">
                  <textarea name="notes" value={reportForm.notes} onChange={handleReportChange} rows={2} className={inputClass} />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Attach file (PDF, JPG, PNG — optional)">
                  <input
                    type="file" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-600 file:text-xs file:font-medium hover:file:bg-slate-200 file:transition-colors"
                  />
                </Field>
              </div>
            </div>

            <button
              type="submit" disabled={savingReport}
              className="mt-5 bg-[#0F2942] text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-[#16395c] disabled:opacity-60 transition-colors"
            >
              {savingReport ? "Saving…" : "Save report"}
            </button>
          </form>
        )}

        <div className="flex flex-col gap-3">
          {reports.length === 0 && (
            <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl bg-white">
              <p className="text-slate-400 text-sm">No reports recorded yet.</p>
            </div>
          )}

          {reports.map((r) => (
            <div key={r._id} className="relative bg-white border border-slate-200 rounded-xl pl-5 pr-4 py-4">
              <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-slate-200" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[11px] text-slate-400">{new Date(r.visitDate).toLocaleDateString()}</p>
                  <h3 className="font-serif text-base text-[#0F2942] mt-0.5">{r.diagnosis}</h3>
                </div>
                <button onClick={() => handleDeleteReport(r._id)} className="text-slate-300 hover:text-rose-600 text-xs transition-colors">
                  Remove
                </button>
              </div>

              <div className="text-sm text-slate-600 mt-2.5 space-y-1">
                {r.symptoms && <p><span className="text-slate-400">Symptoms —</span> {r.symptoms}</p>}
                {r.allergies && <p><span className="text-slate-400">Allergies —</span> {r.allergies}</p>}
                {r.currentMedications && <p><span className="text-slate-400">Medications —</span> {r.currentMedications}</p>}
                {r.labResults && <p><span className="text-slate-400">Lab results —</span> {r.labResults}</p>}
                {r.notes && <p><span className="text-slate-400">Notes —</span> {r.notes}</p>}
              </div>

              {r.filePath && (
                <a
                  href={r.filePath} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-[#2563EB] hover:underline"
                >
                  📎 {r.fileName}
                </a>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default PatientDetail;