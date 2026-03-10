const onlineUsers = new Map<string, string>();

// ─── Add user when they connect ───────────────────────────────────────────────
export const addUser = (userId: string, socketId: string): void => {
  onlineUsers.set(userId, socketId);
  console.log(
    `✅ [onlineUsers] Added   → userId: ${userId} | socketId: ${socketId} | Total online: ${onlineUsers.size}`,
  );
};

// ─── Remove user when they disconnect ────────────────────────────────────────
export const removeUser = (userId: string): void => {
  onlineUsers.delete(userId);
  console.log(
    `❌ [onlineUsers] Removed → userId: ${userId} | Total online: ${onlineUsers.size}`,
  );
};

// ─── Get socketId by userId (used for direct emits) ──────────────────────────
export const getSocketId = (userId: string): string | undefined => {
  return onlineUsers.get(userId);
};

// ─── Check if a user is currently online ─────────────────────────────────────
export const isOnline = (userId: string): boolean => {
  return onlineUsers.has(userId);
};

// ─── Get all online user IDs ──────────────────────────────────────────────────
export const getAllOnlineUserIds = (): string[] => {
  return Array.from(onlineUsers.keys());
};

// ─── Get total online count ───────────────────────────────────────────────────
export const getOnlineCount = (): number => {
  return onlineUsers.size;
};
