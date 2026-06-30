import axios from "axios";

const api = axios.create({
  baseURL: "https://doctors-1y08.onrender.com",
});

// Automatically attach the JWT token (from login) to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
