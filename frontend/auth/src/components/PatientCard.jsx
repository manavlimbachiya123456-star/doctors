const bloodGroupColor = {
  "A+": "bg-rose-50 text-rose-700 border-rose-100",
  "A-": "bg-rose-50 text-rose-700 border-rose-100",
  "B+": "bg-amber-50 text-amber-700 border-amber-100",
  "B-": "bg-amber-50 text-amber-700 border-amber-100",
  "AB+": "bg-purple-50 text-purple-700 border-purple-100",
  "AB-": "bg-purple-50 text-purple-700 border-purple-100",
  "O+": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "O-": "bg-emerald-50 text-emerald-700 border-emerald-100",
  Unknown: "bg-slate-50 text-slate-500 border-slate-200",
};

const initials = (name = "") =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

const PatientCard = ({ patient, onClick, onDelete }) => {
  return (
    <div
      onClick={onClick}
      className="group bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-[#2563EB]/40 hover:shadow-[0_2px_12px_rgba(15,41,66,0.06)] transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-[#0F2942] flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-medium font-serif">{initials(patient.name)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-base text-[#0F2942] truncate">{patient.name}</h3>
          <p className="font-mono text-[11px] text-slate-400 mt-0.5">{patient.patientId}</p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(patient._id);
          }}
          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-600 transition-all text-xs px-2 py-1 shrink-0"
          aria-label={`Remove ${patient.name}`}
        >
          Remove
        </button>
      </div>

      <div className="flex items-center gap-2 mt-3.5 ml-15">
        <span className="text-xs text-slate-500 border border-slate-200 rounded-md px-2 py-1">
          {patient.age} yrs
        </span>
        <span className="text-xs text-slate-500 border border-slate-200 rounded-md px-2 py-1 capitalize">
          {patient.gender}
        </span>
        <span className={`text-xs font-semibold border rounded-md px-2 py-1 ${bloodGroupColor[patient.bloodGroup] || bloodGroupColor.Unknown}`}>
          {patient.bloodGroup}
        </span>
        {patient.contact && (
          <span className="text-xs text-slate-400 ml-auto">{patient.contact}</span>
        )}
      </div>
    </div>
  );
};

export default PatientCard;