import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("chronos", {
  getRuntimeInfo: () => ipcRenderer.invoke("chronos:getRuntimeInfo"),
  explainSession: (input) => ipcRenderer.invoke("assistant:explainSession", input),
});
