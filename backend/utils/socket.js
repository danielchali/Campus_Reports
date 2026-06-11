import { Server } from 'socket.io';

let io = null;

const DASHBOARD_ROOM = 'dashboard';
const ADMIN_ROOM = 'admin';

export function initSocket(server, corsOrigins = []) {
  io = new Server(server, {
    cors: {
      origin: corsOrigins.length ? corsOrigins : true,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    socket.on('joinDashboard', () => {
      socket.join(DASHBOARD_ROOM);
    });

    socket.on('joinAdmin', () => {
      socket.join(ADMIN_ROOM);
    });
  });

  return io;
}

export function getIO() {
  return io;
}

export function emitDashboardRefresh(resource = 'all') {
  if (!io) return;
  io.to(DASHBOARD_ROOM).emit('dashboard:refresh', {
    resource,
    at: new Date().toISOString(),
  });
}

export function emitAuditLog(log) {
  if (!io) return;
  io.to(ADMIN_ROOM).emit('audit:new', log);
}
