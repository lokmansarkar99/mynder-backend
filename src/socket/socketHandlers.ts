// socketHandlers.ts  — PHASE A SKELETON
//
// Currently has:
//   ✅ join:conversation
//   ✅ leave:conversation
//
// Phase D will add:
//   ⬜ message:send
//   ⬜ message:read
//   ⬜ typing:start
//   ⬜ typing:stop
// ─────────────────────────────────────────────────────────────────────────────

import { Server, Socket }      from 'socket.io';
import colors                  from 'colors';
import { logger }              from '../shared/logger';

export const registerHandlers = (io: Server, socket: Socket): void => {
  const userId   = socket.userId;
  const userName = socket.userName;

  // ══════════════════════════════════════════════════════════════════════════
  // join:conversation
  // Client must emit this after getting conversationId from REST API
  // This puts the socket into a Socket.IO "room" named by conversationId
  //
  // Usage:  socket.emit("join:conversation", "64abc...")
  // Server: socket.join(conversationId)
  // Ack:    socket.emit("room:joined", { conversationId })
  // ══════════════════════════════════════════════════════════════════════════
  socket.on('join:conversation', (conversationId: string) => {
    if (!conversationId) {
      socket.emit('socket:error', { message: 'conversationId is required' });
      return;
    }

    socket.join(conversationId);

    logger.info(
      colors.cyan(`🚪 [Room] ${userName} joined room → ${conversationId}`),
    );

    // Acknowledge to the client that they successfully joined
    socket.emit('room:joined', {
      conversationId,
      message: `Joined conversation ${conversationId}`,
    });
  });

  // 
  // leave:conversation
  // Client emits this when navigating away from a chat window
  // Prevents receiving room events after leaving
  //
  // Usage: socket.emit("leave:conversation", "64abc...")
  // ══════════════════════════════════════════════════════════════════════════
  socket.on('leave:conversation', (conversationId: string) => {
    if (!conversationId) return;

    socket.leave(conversationId);

    logger.info(
      colors.yellow(`🚪 [Room] ${userName} left room → ${conversationId}`),
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ⬜ Phase D slots — will be filled in Phase D
  // ══════════════════════════════════════════════════════════════════════════
  // socket.on('message:send',  ...)  ← Phase D
  // socket.on('message:read',  ...)  ← Phase D
  // socket.on('typing:start',  ...)  ← Phase D
  // socket.on('typing:stop',   ...)  ← Phase D
};
