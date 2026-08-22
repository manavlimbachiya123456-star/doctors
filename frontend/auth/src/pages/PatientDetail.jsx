import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
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

const flagColor = (flag) => {
  if (flag === "HIGH") return "text-rose-700 bg-rose-50 border-rose-100";
  if (flag === "LOW") return "text-amber-700 bg-amber-50 border-amber-100";
  return "text-emerald-700 bg-emerald-50 border-emerald-100";
};

const parseSummary = (raw) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "quickSummary" in parsed) return parsed;
    return null;
  } catch {
    return {
      quickSummary: raw,
      labTimeline: [],
      otherVisits: [],
      riskFlags: [],
      followUp: [],
      legacyText: true,
    };
  }
};

const buildTrendSeries = (labTimeline = []) => {
  const series = {};
  labTimeline.forEach((entry) => {
    (entry.tests || []).forEach((t) => {
      if (typeof t.numericValue === "number") {
        if (!series[t.name]) series[t.name] = [];
        series[t.name].push({ date: entry.date, value: t.numericValue });
      }
    });
  });
  return Object.entries(series).filter(([, points]) => points.length >= 2);
};

const PatientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm, setReportForm] = useState(emptyReport);
  const [file, setFile] = useState(null);
  const [savingReport, setSavingReport] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState(null);

  // RAG chat state
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

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

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

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

  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const question = chatInput.trim();
    setChatInput("");
    setChatLoading(true);

    setChatHistory((prev) => [...prev, { question, answer: "..." }]);

    try {
      const res = await api.post(`/patients/${id}/chat`, {
        question,
        chatHistory: chatHistory.map((h) => ({ question: h.question, answer: h.answer })),
      });
      setChatHistory((prev) =>
        prev.map((h, i) => (i === prev.length - 1 ? { ...h, answer: res.data.answer } : h))
      );
    } catch (err) {
      setChatHistory((prev) =>
        prev.map((h, i) =>
          i === prev.length - 1 ? { ...h, answer: "Error: could not get answer. Is the RAG service running?" } : h
        )
      );
    } finally {
      setChatLoading(false);
    }
  };

  const summary = useMemo(() => parseSummary(patient?.aiSummary), [patient?.aiSummary]);
  const trendSeries = useMemo(() => buildTrendSeries(summary?.labTimeline), [summary]);
  const activeTrendName = selectedTrend || (trendSeries[0] ? trendSeries[0][0] : null);
  const activeTrendData = trendSeries.find(([name]) => name === activeTrendName)?.[1] || [];

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

        {/* AI Summary */}
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
          ) : !summary ? (
            <p className="text-sm text-slate-400">No summary generated yet — click Generate summary above.</p>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-[#1e3a5f] leading-relaxed whitespace-pre-line">{summary.quickSummary}</p>

              {!summary.legacyText && (
                <>
                  {trendSeries.length > 0 && (
                    <div className="bg-white border border-[#DBEAFE] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lab trends</h3>
                        <select
                          value={activeTrendName || ""}
                          onChange={(e) => setSelectedTrend(e.target.value)}
                          className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-[#FAFBFC]"
                        >
                          {trendSeries.map(([name]) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={activeTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {summary.labTimeline?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Blood / lab timeline</h3>
                      <div className="space-y-3">
                        {summary.labTimeline.map((entry, i) => (
                          <div key={i} className="bg-white border border-[#DBEAFE] rounded-lg overflow-hidden">
                            <div className="bg-[#F5F9FF] px-3 py-1.5 font-mono text-xs text-slate-500">{entry.date}</div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-slate-400 border-b border-slate-100">
                                  <th className="text-left font-medium px-3 py-1.5">Test</th>
                                  <th className="text-left font-medium px-3 py-1.5">Value</th>
                                  <th className="text-left font-medium px-3 py-1.5">Range</th>
                                  <th className="text-left font-medium px-3 py-1.5">Flag</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(entry.tests || []).map((t, j) => (
                                  <tr key={j} className="border-b border-slate-50 last:border-0">
                                    <td className="px-3 py-1.5 text-[#0F2942]">{t.name}</td>
                                    <td className="px-3 py-1.5 text-[#0F2942] font-medium">{t.value} {t.unit || ""}</td>
                                    <td className="px-3 py-1.5 text-slate-400">{t.normalRange || "—"}</td>
                                    <td className="px-3 py-1.5">
                                      <span className={`text-[10px] font-semibold border rounded-md px-1.5 py-0.5 ${flagColor(t.flag)}`}>
                                        {t.flag}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {summary.otherVisits?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Other visits</h3>
                      <div className="bg-white border border-[#DBEAFE] rounded-lg overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-100 bg-[#F5F9FF]">
                              <th className="text-left font-medium px-3 py-1.5">Date</th>
                              <th className="text-left font-medium px-3 py-1.5">Diagnosis</th>
                              <th className="text-left font-medium px-3 py-1.5">Symptoms</th>
                              <th className="text-left font-medium px-3 py-1.5">Medications</th>
                              <th className="text-left font-medium px-3 py-1.5">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.otherVisits.map((v, i) => (
                              <tr key={i} className="border-b border-slate-50 last:border-0 align-top">
                                <td className="px-3 py-1.5 font-mono text-slate-500 whitespace-nowrap">{v.date}</td>
                                <td className="px-3 py-1.5 text-[#0F2942]">{v.diagnosis || "—"}</td>
                                <td className="px-3 py-1.5 text-slate-600">{v.symptoms || "—"}</td>
                                <td className="px-3 py-1.5 text-slate-600">{v.medications || "—"}</td>
                                <td className="px-3 py-1.5 text-slate-600">{v.notes || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {summary.riskFlags?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Risk flags</h3>
                      <ul className="space-y-1.5">
                        {summary.riskFlags.map((f, i) => (
                          <li key={i} className="text-sm text-rose-700 flex gap-2">
                            <span>⚠</span><span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summary.followUp?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Recommended follow-up</h3>
                      <ul className="space-y-1.5">
                        {summary.followUp.map((f, i) => (
                          <li key={i} className="text-sm text-[#1e3a5f] flex gap-2">
                            <span>→</span><span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {patient.aiSummaryGeneratedAt && (
                <p className="text-xs text-slate-400 pt-3 border-t border-[#DBEAFE]">
                  Generated {new Date(patient.aiSummaryGeneratedAt).toLocaleString()} · AI-assisted, review before clinical use
                </p>
              )}
            </div>
          )}
        </div>

        {/* Visit reports */}
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

        <div className="flex flex-col gap-3 mb-6">
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
                <a href={r.filePath} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-[#2563EB] hover:underline">
                  📎 {r.fileName}
                </a>
              )}
            </div>
          ))}
        </div>

        {/* RAG Chat */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-6 rounded-md bg-[#0F2942] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">Q</span>
            </span>
            <h2 className="font-serif text-lg text-[#0F2942]">Ask about this patient</h2>
            {chatHistory.length > 0 && (
              <button
                onClick={() => setChatHistory([])}
                className="ml-auto text-xs text-slate-400 hover:text-slate-600"
              >
                Clear chat
              </button>
            )}
          </div>

          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-1">
            {chatHistory.length === 0 && (
              <p className="text-sm text-slate-400">
                Ask anything about this patient — blood trends, medication history, diagnosis timeline, anything in their reports or uploaded PDF.
              </p>
            )}
            {chatHistory.map((turn, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-end">
                  <span className="bg-[#0F2942] text-white text-sm px-3 py-2 rounded-xl rounded-br-sm max-w-sm">
                    {turn.question}
                  </span>
                </div>
                <div className="flex justify-start">
                  <span className={`text-sm px-3 py-2 rounded-xl rounded-bl-sm max-w-prose border leading-relaxed ${
                    turn.answer === "..."
                      ? "text-slate-400 border-slate-100 bg-slate-50 italic"
                      : turn.answer.startsWith("Error:")
                      ? "text-rose-700 border-rose-100 bg-rose-50"
                      : "text-[#1e3a5f] border-[#DBEAFE] bg-[#EFF6FF]"
                  }`}>
                    {turn.answer === "..." ? "Thinking…" : turn.answer}
                  </span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleChat} className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
              placeholder="e.g. What was the platelet trend across visits?"
              className="flex-1 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] disabled:opacity-50 transition-shadow"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="bg-[#2563EB] text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-[#1d4fc7] disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {chatLoading ? "…" : "Ask"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default PatientDetail;