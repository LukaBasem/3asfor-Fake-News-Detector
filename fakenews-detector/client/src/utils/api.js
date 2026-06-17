import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 180000, // 3 min — LLaMA can be slow locally
});

export const analyzeArticle = (payload) => api.post("/analyze", payload);
export const getHistory = (page = 1) => api.get(`/history?page=${page}&limit=10`);
export const getAnalysisById = (id) => api.get(`/history/${id}`);
export const deleteAnalysis = (id) => api.delete(`/history/${id}`);
export const healthCheck = () => api.get("/health");

export default api;
