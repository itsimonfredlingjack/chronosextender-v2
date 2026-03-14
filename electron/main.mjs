import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { explainSessionWithMode } from "./assistant-service.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const aiMode = process.env.CHRONOS_AI_MODE === "ollama" ? "ollama" : "mock";
const rendererHost = process.env.CHRONOS_RENDERER_HOST ?? "127.0.0.1";
const rendererPort = process.env.CHRONOS_RENDERER_PORT ?? "5183";
const devServerURL = `http://${rendererHost}:${rendererPort}`;

let mainWindow = null;

const registerIpc = () => {
  ipcMain.handle("chronos:getRuntimeInfo", async () => ({
    platform: process.platform,
    appVersion: app.getVersion(),
    aiMode,
  }));

  ipcMain.handle("assistant:explainSession", async (_event, input) => {
    return explainSessionWithMode({ mode: aiMode, input });
  });
};

const createMainWindow = async () => {
  const window = new BrowserWindow({
    width: 1540,
    height: 980,
    minWidth: 1260,
    minHeight: 760,
    title: "Chronos Extender",
    backgroundColor: "#E9E6DE",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: isDev,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    const currentURL = window.webContents.getURL();

    if (url !== currentURL) {
      event.preventDefault();
    }
  });

  if (isDev) {
    await window.loadURL(devServerURL);
  } else {
    await window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  return window;
};

app.whenReady().then(async () => {
  registerIpc();
  mainWindow = await createMainWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = await createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
