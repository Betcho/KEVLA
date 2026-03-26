import { StrictMode, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import SplashScreen from "./components/SplashScreen";
import WindowChrome from "./components/WindowChrome";

function Root() {
  const [loaded, setLoaded] = useState(false);

  const handleSplashComplete = useCallback(() => {
    setLoaded(true);
  }, []);

  if (!loaded) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <WindowChrome title="KevlaEditor.exe" subtitle="KEVLA Engine v1.0.0 — Keystone Engine for Virtual Landscapes & Adventures">
      <App />
    </WindowChrome>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
