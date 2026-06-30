import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiMenu, FiX, FiUsers, FiLogOut } from "react-icons/fi";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <>
      {/* ================= MOBILE TOP BAR ================= */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0F2942] flex items-center justify-between px-4 shadow-lg z-50">
        <h1 className="text-white font-serif text-2xl">
          Clinic Chart
        </h1>

        <button onClick={() => setOpen(true)}>
          <FiMenu className="text-white text-3xl" />
        </button>
      </header>

      {/* ================= MOBILE OVERLAY ================= */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside
        className={`
          fixed md:sticky
          top-0 left-0
          h-screen
          w-64
          bg-[#0F2942]
          text-white
          flex flex-col
          z-50
          transition-transform duration-300

          ${
            open
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
        `}
      >
        {/* Close Button */}
        <div className="md:hidden flex justify-end p-4">
          <button onClick={() => setOpen(false)}>
            <FiX className="text-3xl" />
          </button>
        </div>

        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <h1 className="font-serif text-4xl">
            Clinic Chart
          </h1>

          <p className="text-white/50 mt-2 text-sm">
            Infectious Disease Unit
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">

          <button
            onClick={() => {
              navigate("/dashboard");
              setOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition
              ${
                location.pathname === "/dashboard"
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/10"
              }`}
          >
            <FiUsers />
            Patient Records
          </button>

        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-5">

          <h3 className="font-semibold">
            Dr. {user.username || "Doctor"}
          </h3>

          <p className="text-white/50 text-sm mb-5">
            Attending Physician
          </p>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-white/70 hover:text-white"
          >
            <FiLogOut />
            Sign Out
          </button>

        </div>
      </aside>
    </>
  );
};

export default Sidebar;