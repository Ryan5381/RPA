import axios from "axios";

const timeout = 1000 * 50 * 5;
const baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export const axiosInstance = axios.create({
  baseURL,
  timeout,
});
