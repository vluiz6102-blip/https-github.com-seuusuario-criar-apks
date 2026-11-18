import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.vicassistencia.cliente",
  appName: "VIC Assistência",
  webDir: "dist",
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false
  }
};

export default config;
