import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

const app = express();
const PORT = 3000;
const BACKEND_PORT = 8001;

app.use(express.json());

// 1. Spawn FastAPI Python backend on port 8001
console.log('[Server] Starting FastAPI backend on port 8001...');
const pythonBackend: ChildProcess = spawn(
  'python3',
  ['-m', 'uvicorn', 'whale_audit.app.main:app', '--port', String(BACKEND_PORT), '--host', '127.0.0.1'],
  { stdio: 'inherit' }
);

pythonBackend.on('error', (err) => {
  console.error('[Server] Failed to start Python backend:', err);
});

pythonBackend.on('exit', (code, signal) => {
  console.log(`[Server] Python backend exited with code ${code}, signal ${signal}`);
});

process.on('SIGTERM', () => {
  pythonBackend.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  pythonBackend.kill('SIGINT');
  process.exit(0);
});

// 2. Proxy /api and /health requests to FastAPI backend using native fetch
const proxyToBackend = async (req: express.Request, res: express.Response) => {
  const targetUrl = `http://127.0.0.1:${BACKEND_PORT}${req.originalUrl}`;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) headers['authorization'] = req.headers.authorization;
    if (req.headers['x-operator-token']) headers['x-operator-token'] = req.headers['x-operator-token'] as string;

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const body = hasBody ? JSON.stringify(req.body) : undefined;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    res.status(response.status);
    response.headers.forEach((val, key) => {
      if (key !== 'content-encoding') res.setHeader(key, val);
    });
    const text = await response.text();
    res.send(text);
  } catch (err: any) {
    res.status(503).json({
      detail: 'FastAPI backend is starting up. Please retry shortly.',
    });
  }
};

app.use('/api', proxyToBackend);
app.use('/health', proxyToBackend);

// 3. Mount Vite middleware for development
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Whale Surveillance Dashboard running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Startup error:', err);
  process.exit(1);
});
