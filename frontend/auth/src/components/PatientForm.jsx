import { useState } from "react";

const initialForm = { name: "", age: "", gender: "male", contact: "", patientId: "", bloodGroup: "Unknown" };

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputClass =
  "w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-[#0F2942] bg-[#FAFBFC] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-shadow";

const PatientForm = ({ onSubmit, onCancel }) => {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok) setForm(initialForm);
  };

  return (
    <div className="fixed inset-0 bg-[#0F2942]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl"
      >
        <h2 className="font-serif text-xl text-[#0F2942] mb-1">New patient record</h2>
        <p className="text-xs text-slate-400 mb-5">Enter the patient's identifying and demographic details.</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Full name">
              <input name="name" value={form.name} onChange={handleChange} required placeholder="Patient's full name" className={inputClass} />
            </Field>
          </div>

          <Field label="Age">
            <input name="age" type="number" min="0" value={form.age} onChange={handleChange} required className={inputClass} />
          </Field>

          <Field label="Gender">
            <select name="gender" value={form.gender} onChange={handleChange} className={inputClass}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>

          <Field label="Patient ID">
            <input name="patientId" value={form.patientId} onChange={handleChange} required placeholder="PT-2026-001" className={`${inputClass} font-mono`} />
          </Field>

          <Field label="Blood group">
            <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange} className={inputClass}>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </Field>

          <div className="col-span-2">
            <Field label="Contact">
              <input name="contact" value={form.contact} onChange={handleChange} placeholder="Phone number" className={inputClass} />
            </Field>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            type="submit" disabled={saving}
            className="flex-1 bg-[#0F2942] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#16395c] disabled:opacity-60 transition-colors"
          >
            {saving ? "Saving..." : "Save patient"}
          </button>
          <button
            type="button" onClick={onCancel}
            className="px-5 text-sm font-medium text-slate-500 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default PatientForm;