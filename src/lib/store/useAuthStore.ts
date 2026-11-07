"use client";

// src/lib/store/useAuthStore.ts
//
// Zustand store for authentication state.
// `user` holds the public profile data received from the API after login.
// The session token itself lives in the HttpOnly `summa_customer_session` cookie
// managed entirely by the browser — we never store it here.

import { create } from "zustand";
import type { UserSession } from "@/types/event";

interface AuthState {
  user: UserSession | null;
  setUser: (user: UserSession) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  signOut: () => set({ user: null }),
}));
