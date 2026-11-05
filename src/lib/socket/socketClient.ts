"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectSocket() {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!socketUrl) return null;

  if (!socket) {
    socket = io(socketUrl, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }

  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
}
