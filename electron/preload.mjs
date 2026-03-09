import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("chronosDesktop", {
  platform: process.platform,
});
