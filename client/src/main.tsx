import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setupFirebaseInitialization } from "./lib/init-firebase";

// Initialize Firebase security
setupFirebaseInitialization();

createRoot(document.getElementById("root")!).render(<App />);
