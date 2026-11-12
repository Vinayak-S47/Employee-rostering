// src/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { generalLimiter } = require('./middleware/rateLimiter');
const { authenticateSocket } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/departments');
const employeeRoutes = require('./routes/employees');
const leaveRoutes = require('./routes/leave');
const rosterRoutes = require('./routes/rosters');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const shiftRoutes = require('./routes/shiftTemplates');

const app = express();
const server = http.createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.use(authenticateSocket);

io.on('connection', (socket) => {
  const userId = socket.user._id.toString();
  socket.join(`user:${userId}`);
  logger.info(`Socket connected: user=${userId}`);

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: user=${userId}`);
  });
});

app.set('io', io);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(generalLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/departments',    departmentRoutes);
app.use('/api/employees',      employeeRoutes);
app.use('/api/leave',          leaveRoutes);
app.use('/api/rosters',        rosterRoutes);
app.use('/api/analytics',      analyticsRoutes);
app.use('/api/notifications',  notificationRoutes);
app.use('/api/shifts',         shiftRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hospital-rostering-api', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 5000;

const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Optimizer URL: ${process.env.OPTIMIZER_URL}`);
  });
};

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = { app, server, io };
