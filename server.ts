import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { handleActionRoute } from './server/routes/actionRoute';
import { handleOfflineRoute } from './server/routes/offlineRoute';
import { handleTaskProgressRoute } from './server/routes/taskProgressRoute';
import { handleIntrospectionRoute } from './server/routes/introspectionRoute';
import { handleImageRoute } from './server/routes/imageRoute';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '15mb' }));

// API Routes
app.post('/api/action', handleActionRoute);
app.post('/api/offline', handleOfflineRoute);
app.post('/api/task-progress', handleTaskProgressRoute);
app.post('/api/introspection', handleIntrospectionRoute);
app.post('/api/generate-image', handleImageRoute);

async function startServer() {
  // Serve static files from public directory (PWA icons, manifest, service worker)
  app.use(express.static(path.join(process.cwd(), 'public')));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SimDeVie Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
