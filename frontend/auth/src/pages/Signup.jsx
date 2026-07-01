import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/auth.css'
import api from "../api/axios";

const Signup = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
   await api.post("/signup", form);
    alert("Signup Successful");
    navigate("/login");
  } catch (error) {
  console.log(error);

  alert(
    error.response?.data?.message ||
    JSON.stringify(error.response?.data) ||
    error.message
  );
}
};

  return (
  <div className="auth-container">
    <div className="auth-card">

      <h2>🩺 Doctor Registration</h2>

      <p className="subtitle">
        Create your account to manage patient records securely.
      </p>

      <form onSubmit={handleSubmit}>

        <div className="form-group">
          <label>Doctor Name</label>
          <input
            name="username"
            placeholder="Dr. John Smith"
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Email Address</label>
          <input
            name="email"
            type="email"
            placeholder="doctor@hospital.com"
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            name="password"
            type="password"
            placeholder="Create a strong password"
            onChange={handleChange}
          />
        </div>

        <button className="auth-btn" type="submit">
          Create Account
        </button>

      </form>

      <p className="auth-footer">
        Already have an account?
        <span onClick={() => navigate("/login")}> Login</span>
      </p>

    </div>
  </div>
);
}

export default Signup
