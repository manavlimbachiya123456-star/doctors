import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import PatientCard from "../components/PatientCard";
import PatientForm from "../components/PatientForm";

const Dashboard = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const fetchPatients = async () => {
    try {
      const res = await api.get("/patients");
      setPatients(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleAdd = async (form) => {
    try {
      await api.post("/patients", form);
      setShowForm(false);
      fetchPatients();
      return true;
    } catch (err) {
      console.log(err);
      alert(err.response?.data?.message || "Failed to add patient");
      return false;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this patient record? This cannot be undone.")) return;
    try {
      await api.delete(`/patients/${id}`);
      fetchPatients();
    } catch (err) {
      console.log(err);
      alert("Failed to delete patient");
    }
  };

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.patientId.toLowerCase().includes(search.toLowerCase())
  );

  return (
  <div className="md:flex min-h-screen bg-[#FAFBFC]">
    <Sidebar />

    <main className="flex-1 w-full p-6 lg:p-8 overflow-auto md:pt-8 pt-24">
      <div className="w-full">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-7">
          <div>
            <h1 className="font-serif text-3xl text-[#0F2942]">
              Patient Records
            </h1>

            <p className="text-slate-500 mt-1">
              {patients.length}{" "}
              {patients.length === 1 ? "patient" : "patients"} under your care
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="bg-[#2563EB] hover:bg-[#1d4fc7] text-white px-6 py-3 rounded-xl shadow transition w-full sm:w-auto"
          >
            + New Patient
          </button>
        </div>

        {/* Search */}
        {patients.length > 0 && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or patient ID..."
            className="w-full border border-slate-200 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}

        {/* Add Patient Form */}
        {showForm && (
          <PatientForm
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Content */}
        {loading ? (
          <p className="text-slate-500">Loading patient records...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-24 text-center">
            <h2 className="text-3xl font-semibold text-slate-600">
              No patient records yet
            </h2>

            <p className="text-slate-400 mt-3 text-lg">
              Add a patient to begin tracking their history.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {filtered.map((p) => (
              <PatientCard
                key={p._id}
                patient={p}
                onClick={() => navigate(`/patients/${p._id}`)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

      </div>
    </main>
  </div>
);
};

export default Dashboard;