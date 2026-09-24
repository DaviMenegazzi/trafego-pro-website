import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Remove the financial snapshot left by older versions of the app.
try { localStorage.removeItem("tp_db"); } catch { /* storage may be unavailable */ }

createRoot(document.getElementById("root")!).render(<App />);
