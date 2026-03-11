
import { Server, Socket } from 'socket.io';
import http               from 'http';
import jwt                from 'jsonwebtoken';
import colors             from 'colors';
import { logger, errorLogger } from '../shared/logger';
import config             from '../config';
import { addUser, removeUser } from './onlineUsers';
import { registerHandlers }    from './socketHandlers';


let io: Server;


export const getIO = (): Server => {
  if (!io) {
    throw new Error('[Socket] Not initialized. Call initSocket(httpServer) first.');
  }
  return io;
};

// ─── Initialize Socket.IO 
export const initSocket = (httpServer: http.Server): void => {

  io = new Server(httpServer, {
    cors: {
      origin:      [config.client_url as string, 'http://localhost:3000', 'http://localhost:5173'],
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout:  60000,  
    pingInterval: 25000,  
  });

  // ══════════════════════════════════════════════════════════════════════════
  // JWT Authentication Middleware
  // Runs BEFORE every connection
  // Token can come from:
  //   1. socket.handshake.auth.token         ← Recommended (frontend)
  //   2. socket.handshake.headers.authorization ← "Bearer xxx"
  //   3. socket.handshake.query.token         ← Postman / testing
  io.use((socket: Socket, next) => {
    try {
      const rawToken =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization ||
        (socket.handshake.query?.token as string);

      if (!rawToken) {
        return next(new Error('AUTH_ERROR: No token provided'));
      }

      // Strip "Bearer " prefix if present
      const token = rawToken.startsWith('Bearer ')
        ? rawToken.slice(7)
        : rawToken;

      // Verify JWT — same secret as your REST checkAuth middleware
      const decoded = jwt.verify(token, config.jwt.jwt_secret as string) as {
        id:    string;
        email: string;
        role:  string;
        name?: string;
      };

      // Attach decoded user info to socket for use in handlers
      socket.userId   = decoded.id;
      socket.userName = decoded.name || decoded.email;
      socket.userRole = decoded.role;

      next(); 

    } catch (err: any) {
      errorLogger.error(`[Socket Auth] Failed: ${err.message}`);
      next(new Error('AUTH_ERROR: Invalid or expired token'));
    }
  });


  // Connection Handler
 
  io.on('connection', (socket: Socket) => {
    const { userId, userName, userRole } = socket;

    logger.info(
      colors.green(
        `🔌 [Socket] Connected → ${userName} (${userRole}) | userId: ${userId} | socketId: ${socket.id}`,
      ),
    );

    // ── Add to online map 
    addUser(userId, socket.id);

    // ── Broadcast to ALL other connected clients that this user is online 
    socket.broadcast.emit('user:online', {
      userId,
      userName,
      userRole,
    });

    // ── Register all event handlers for this socket 
    registerHandlers(io, socket);

    // Disconnect Handler
    socket.on('disconnect', (reason: string) => {
      logger.info(
        colors.yellow(
          `🔌 [Socket] Disconnected → ${userName} | reason: ${reason} | socketId: ${socket.id}`,
        ),
      );

      removeUser(userId);

      // Broadcast to all others that this user went offline
      socket.broadcast.emit('user:offline', {
        userId,
        userName,
      });
    });

    // Socket-level Error Handler
  
    socket.on('error', (err: Error) => {
      errorLogger.error(`[Socket Error] ${userName} | ${err.message}`);
    });
  });

  logger.info(colors.cyan('✅ [Socket] Socket.IO initialized and ready'));
};
