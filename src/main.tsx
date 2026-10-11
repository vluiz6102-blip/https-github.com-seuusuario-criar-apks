import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[startup] A interface encontrou um erro e foi protegida pelo fallback.", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main style={{ minHeight: "100vh", padding: "32px 22px", display: "grid", placeContent: "center", gap: "14px", background: "#071115", color: "#eef3e9", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ color: "#a6ef68", fontSize: "11px", fontWeight: 900, letterSpacing: ".18em" }}>MAIA SOCCER MANAGER</div>
          <h1 style={{ maxWidth: "420px", margin: 0, fontSize: "26px" }}>A tela encontrou um problema.</h1>
          <p style={{ maxWidth: "420px", color: "#9aada3", lineHeight: 1.6, fontSize: "14px" }}>A carreira não será encerrada por esse erro. Recarregue a interface para tentar abrir o jogo novamente.</p>
          <button onClick={() => window.location.reload()} style={{ minHeight: "44px", padding: "0 16px", border: 0, borderRadius: "9px", color: "#0b1710", background: "#a6ef68", fontWeight: 800 }}>Recarregar jogo</button>
        </main>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento principal do jogo não encontrado.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
