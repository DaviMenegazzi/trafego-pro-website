import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Remove the financial snapshot left by older versions of the app.
try { localStorage.removeItem("tp_db"); } catch { /* storage may be unavailable */ }
// Sessões legadas guardavam um JWT legível por JavaScript. Descarte-o sem
// encerrar o cookie HttpOnly atual, mantendo apenas o marcador de navegação.
try {
  const legacyToken = localStorage.getItem("tp_token");
  if (legacyToken && legacyToken !== "cookie-session") {
    localStorage.setItem("tp_token", "cookie-session");
  }
} catch { /* storage may be unavailable */ }

createRoot(document.getElementById("root")!).render(<App />);
