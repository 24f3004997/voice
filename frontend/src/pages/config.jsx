export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

// http -> ws, https -> wss automatically
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");