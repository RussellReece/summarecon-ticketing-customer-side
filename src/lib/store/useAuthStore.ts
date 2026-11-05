"use client";

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
