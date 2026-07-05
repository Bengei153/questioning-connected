import path from "path";
import { createServer as createViteServer } from "vite";
import express from "express";

// This server no longer implements a mock API. Both real backends
// (LoginSystem and the Quiz API) are called directly from the browser -
// see src/lib/apiConfig.ts for how their URLs are configured, and
// src/lib/authStore.ts's apiFetch() for how requests are routed to them.
//
// All this does now is serve the built frontend (or run Vite in dev mode).
// Both backend APIs need CORS enabled for whatever origin this app is
// served from, or the browser will block the requests.

const app = express();
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Questioning] Frontend running at http://localhost:${PORT}`);
    console.log(`[Questioning] Configure your backend URLs from the Settings screen on first load.`);
  });
}

startServer();
