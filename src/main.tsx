import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize i18n
import "./lib/i18n";

createRoot(document.getElementById("root")!).render(<App />);
