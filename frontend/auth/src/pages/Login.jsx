import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from "axios";
import '../styles/auth.css'

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' })
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })


const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const res = await axios.post("http://localhost:3000/login", form);

    localStorage.setItem('token', res.data.token)       // save token
    localStorage.setItem('user', JSON.stringify(res.data.user)) // save user

    navigate("/dashboard");
  } catch (err) {
    console.log(err);
    alert("Login Failed");
  }
};

  return (
  <div className="auth-container">
    <div className="auth-card">

      <h2>👨‍⚕️ Doctor Login</h2>

      <p className="subtitle">
        Securely access your patient records and dashboard.
      </p>

      <form onSubmit={handleSubmit}>
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
            placeholder="Enter your password"
            onChange={handleChange}
          />
        </div>

        <button className="auth-btn" type="submit">
          Login to Dashboard
        </button>
      </form>

      <p className="auth-footer">
        New Doctor?
        <span onClick={() => navigate("/")}> Register Here</span>
      </p>

    </div>
  </div>
);
}

export default Login