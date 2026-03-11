import { Server, Socket }      from 'socket.io';
import colors                  from 'colors';
import { logger, errorLogger } from '../shared/logger';
import { getSocketId }         from './onlineUsers';
import { MessageService }      from '../app/modules/message/message.service';
import sendNotification        from '../shared/sendNotification';
import { NOTIFICATION_TYPE }   from '../enums/notification';

export const registerHandlers = (io: Server, socket: Socket): void => {
  const userId   = socket.userId;
  const userName = socket.userName;

  // ══════════════════════════════════════════════════════════════════════════
  // join:conversation
  // ══════════════════════════════════════════════════════════════════════════
  socket.on('join:conversation', (conversationId: string) => {
    if (!conversationId) {
      socket.emit('socket:error', { message: 'conversationId is required' });
      return;
    }
    socket.join(conversationId);
    logger.info(colors.cyan(`🚪 [Room] ${userName} joined → ${conversationId}`));
    socket.emit('room:joined', { conversationId });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // leave:conversation
  // ══════════════════════════════════════════════════════════════════════════
  socket.on('leave:conversation', (conversationId: string) => {
    if (!conversationId) return;
    socket.leave(conversationId);
    logger.info(colors.yellow(`🚪 [Room] ${userName} left → ${conversationId}`));
  });

  // ══════════════════════════════════════════════════════════════════════════
  // message:send — Real-time message via Socket
  //
  // Flow:
  //   1. Validate input
  //   2. DB save via MessageService.sendMessage()
  //   3. socket.to(room) → receiver sees message:new
  //   4. Delivery tick to sender:
  //      online  → message:delivered (✓✓ gray)
  //      offline → message:saved     (✓  gray)
  //   5. Notification if receiver NOT in this room
  // ══════════════════════════════════════════════════════════════════════════
  socket.on(
    'message:send',
    async (data: {
      conversationId: string;
      receiverId:     string;
      content:        string;
      messageType?:   'text' | 'file' | 'system';
      tempId?:        string;
    }) => {
      const { conversationId, receiverId, content, messageType = 'text', tempId } = data;

      try {
        // ── Input validation ───────────────────────────────────────────────
        if (!conversationId || !receiverId) {
          socket.emit('message:error', {
            tempId,
            message: 'conversationId and receiverId are required',
          });
          return;
        }

        if (!content?.trim()) {
          socket.emit('message:error', {
            tempId,
            message: 'Message content cannot be empty',
          });
          return;
        }

        // ── 1. DB Save ──────────────────────────────────────────────────────
        const savedMessage = await MessageService.sendMessage(
          conversationId,
          userId,
          content,
          messageType,
        );

        const messagePayload = { ...savedMessage.toObject(), tempId };

        // ── 2. Push to room → receiver sees message:new ─────────────────────
        // socket.to() = everyone in room EXCEPT sender
        // (sender already has optimistic bubble on frontend)
        socket.to(conversationId).emit('message:new', messagePayload);

        logger.info(colors.blue(
          `💬 [Message] ${userName} → conv: ${conversationId}`,
        ));

        // ── 3. Delivery tick → only sender gets this ────────────────────────
        const receiverSocketId = getSocketId(receiverId);

        if (receiverSocketId) {
          // Receiver online → ✓✓ gray
          socket.emit('message:delivered', {
            tempId,
            messageId:      savedMessage._id,
            conversationId,
          });
          logger.info(colors.green(`✅ [Delivered] → ${receiverId}`));
        } else {
          // Receiver offline → ✓ gray
          socket.emit('message:saved', {
            tempId,
            messageId:      savedMessage._id,
            conversationId,
          });
          logger.info(colors.yellow(`📵 [Saved] Receiver ${receiverId} offline`));
        }

        // ── 4. Notification — skip if receiver is in this room ──────────────
        // Case A: offline  → DB save only
        // Case B: online, different page → DB save + socket push
        // Case C: online AND in this room → skip (already sees message)
        let receiverInRoom = false;
        if (receiverSocketId) {
          const socketsInRoom = await io.in(conversationId).fetchSockets();
          receiverInRoom = socketsInRoom.some(s => s.id === receiverSocketId);
        }

        if (!receiverInRoom) {
          await sendNotification({
            recipientId:    receiverId,
            type:           NOTIFICATION_TYPE.NEW_MESSAGE,
            title:          `New message from ${userName}`,
            body:           content.length > 60
                              ? content.substring(0, 60) + '...'
                              : content,
            referenceId:    conversationId,
            referenceModel: null,
          });
          logger.info(colors.magenta(
            `🔔 [Notification] → ${receiverId} | from: ${userName}`,
          ));
        } else {
          logger.info(colors.gray(
            `🔕 [Notification] Skipped — receiver in room`,
          ));
        }

      } catch (error: any) {
        errorLogger.error(`[message:send] ${userName}: ${error.message}`);
        socket.emit('message:error', {
          tempId,
          message: error.message || 'Failed to send message',
        });
      }
    },
  );

  // ══════════════════════════════════════════════════════════════════════════
  // message:read — Mark messages read + send blue tick receipt to sender
  // ══════════════════════════════════════════════════════════════════════════
  socket.on(
    'message:read',
    async (data: { conversationId: string; senderId: string }) => {
      try {
        const { conversationId, senderId } = data;
        if (!conversationId || !senderId) return;

        // ── DB: mark unread messages as read ───────────────────────────────
        const modifiedCount = await MessageService.markAllAsRead(
          conversationId,
          userId,
        );

        // Nothing changed → no need to notify sender
        if (modifiedCount === 0) return;

        // ── Notify sender → blue ticks ✓✓ ─────────────────────────────────
        const senderSocketId = getSocketId(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message:read-receipt', {
            conversationId,
            readBy:     userId,
            readByName: userName,
            readAt:     new Date(),
          });
          logger.info(colors.green(
            `✅ [Read] ${userName} read conv: ${conversationId}`,
          ));
        }
      } catch (error: any) {
        errorLogger.error(`[message:read] ${userName}: ${error.message}`);
      }
    },
  );

  // ══════════════════════════════════════════════════════════════════════════
  // typing:start → broadcast indicator to room (not to self)
  // ══════════════════════════════════════════════════════════════════════════
  socket.on('typing:start', (conversationId: string) => {
    if (!conversationId) return;
    socket.to(conversationId).emit('typing:indicator', {
      userId,
      userName,
      conversationId,
      isTyping: true,
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // typing:stop
  // ══════════════════════════════════════════════════════════════════════════
  socket.on('typing:stop', (conversationId: string) => {
    if (!conversationId) return;
    socket.to(conversationId).emit('typing:indicator', {
      userId,
      userName,
      conversationId,
      isTyping: false,
    });
  });
};
