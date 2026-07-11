import axios from "axios";

const timeout = 1000 * 50 * 5;
const baseURL = import.meta.env.VITE_API_URL;

export const axiosInstance = axios.create({
  baseURL,
  timeout,
});
