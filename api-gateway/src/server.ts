import http from 'http';
import { createApp } from './app';
import { WsManager } from './lib/ws-manager';

const PORT = parseInt(process.env.GYWD_API_PORT || '3945', 10);

const app = createApp();
const server = http.createServer(app);
const wsManager = new WsManager();

wsManager.attach(server);

server.listen(PORT, () => {
  console.log(`GYWD API Gateway running on http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
  console.log(`API docs at http://localhost:${PORT}/api/v1/docs`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  wsManager.close();
  server.close();
});

export { server, wsManager };
