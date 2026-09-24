const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "https://voxshield-api-1te6.onrender.com"
).replace(/\/$/, "");

const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

export { API_BASE_URL, WS_BASE_URL };