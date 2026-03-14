import net from "node:net";
import { spawn } from "node:child_process";
import process from "node:process";

const host = process.env.CHRONOS_RENDERER_HOST ?? "127.0.0.1";
const preferredPort = Number(process.env.CHRONOS_RENDERER_PORT ?? "5183");
const maxPortChecks = 20;

const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";

const probePort = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });

const pickRendererPort = async (startPort) => {
  for (let offset = 0; offset < maxPortChecks; offset += 1) {
    const candidate = startPort + offset;
    const isFree = await probePort(candidate);

    if (isFree) {
      return candidate;
    }
  }

  throw new Error(
    `Could not find a free renderer port in the range ${startPort}-${startPort + maxPortChecks - 1}.`,
  );
};

const waitForPort = (port, timeoutMs = 15000) =>
  new Promise((resolve, reject) => {
    const start = Date.now();

    const attempt = () => {
      const socket = net.createConnection({ host, port });

      socket.once("connect", () => {
        socket.end();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();

        if (Date.now() - start >= timeoutMs) {
          reject(new Error(`Timed out waiting for renderer on ${host}:${port}.`));
          return;
        }

        setTimeout(attempt, 150);
      });
    };

    attempt();
  });

const terminateChild = (child, signal = "SIGTERM") => {
  if (child && !child.killed) {
    child.kill(signal);
  }
};

const main = async () => {
  const rendererPort = await pickRendererPort(preferredPort);
  const env = {
    ...process.env,
    CHRONOS_RENDERER_HOST: host,
    CHRONOS_RENDERER_PORT: String(rendererPort),
  };

  console.log(`[chronosextender] Using renderer port ${rendererPort}`);

  const renderer = spawn(
    npxBin,
    ["--no-install", "vite", "--host", host, "--port", String(rendererPort), "--strictPort"],
    {
      env,
      stdio: "inherit",
    },
  );

  let electron = null;
  let shuttingDown = false;

  const shutdown = (code = 0) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    terminateChild(electron);
    terminateChild(renderer);
    process.exitCode = code;
  };

  process.on("SIGINT", () => shutdown(130));
  process.on("SIGTERM", () => shutdown(143));

  renderer.once("exit", (code) => {
    if (!shuttingDown) {
      shutdown(code ?? 1);
    }
  });

  try {
    await waitForPort(rendererPort);
  } catch (error) {
    console.error(`[chronosextender] ${error.message}`);
    shutdown(1);
    return;
  }

  electron = spawn(npxBin, ["--no-install", "electron", "."], {
    env,
    stdio: "inherit",
  });

  electron.once("exit", (code) => {
    shutdown(code ?? 0);
  });
};

main().catch((error) => {
  console.error(`[chronosextender] Failed to start dev workflow: ${error.message}`);
  process.exit(1);
});
