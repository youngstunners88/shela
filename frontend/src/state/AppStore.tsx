import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Snapshot, User, UserRole, Vehicle, QueueCapacity } from '../types';
import { BhubeziService } from '../lib/backend';

interface AppStoreValue {
  snapshot: Snapshot | null;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  refresh: () => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  register: (name: string, phone: string, password: string, role: UserRole, vehicle?: Vehicle, selfieFile?: File) => Promise<void>;
  logout: () => void;
  registerUser: (name: string, role: UserRole, vehicle?: Vehicle) => Promise<User>;
  createPing: (originRankId: string, destinationRankId: string, price: number, message: string) => Promise<void>;
  acceptPing: (pingId: string) => Promise<void>;
  confirmPickup: (pingId: string) => Promise<void>;
  updateDriverStatus: (routeId: string, occupancy: number) => Promise<void>;
  updateRankStatus: (rankId: string, capacity: QueueCapacity, loadEstimate: number) => Promise<void>;
  createPost: (content: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  replyToPost: (postId: string, content: string) => Promise<void>;
  submitSuggestion: (content: string, kind: 'IMPROVE' | 'REMOVE') => Promise<void>;
  askQuestion: (question: string, routeId?: string) => Promise<void>;
  answerQuestion: (faqId: string, answer: string) => Promise<void>;
  verifyAnswer: (faqId: string) => Promise<void>;
}

const AppStore = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const refresh = async () => {
    const next = await BhubeziService.getSnapshot();
    setSnapshot(next);
    if (currentUser) {
      const updated = next.users.find(user => user.id === currentUser.id) || currentUser;
      setCurrentUser(updated);
    }
  };

  // Check for existing session on mount
  useEffect(() => { 
    BhubeziService.getCurrentUser().then(user => {
      if (user) setCurrentUser(user);
    });
    refresh(); 
  }, []);

  const value = useMemo<AppStoreValue>(() => ({
    snapshot,
    currentUser,
    setCurrentUser,
    refresh,
    login: async (phone, password) => {
      const { user } = await BhubeziService.login(phone, password);
      setCurrentUser(user);
      await refresh();
    },
    register: async (name, phone, password, role, vehicle, selfieFile) => {
      const { user } = await BhubeziService.register(name, phone, password, role, vehicle);
      // If selfie provided, upload it
      if (selfieFile && role === 'DRIVER') {
        await BhubeziService.uploadSelfie(selfieFile);
      }
      setCurrentUser(user);
      await refresh();
    },
    logout: () => {
      BhubeziService.logout();
      setCurrentUser(null);
    },
    registerUser: async (name, role, vehicle) => {
      const phone = `07${Math.floor(Math.random() * 100000000)}`;
      const password = 'temp123';
      const { user } = await BhubeziService.register(name || 'New User', phone, password, role, vehicle);
      setCurrentUser(user);
      await refresh();
      return user;
    },
    createPing: async (originRankId, destinationRankId, price, message) => {
      if (!currentUser) return;
      await BhubeziService.createPing(currentUser.id, currentUser.name, originRankId, destinationRankId, price, message);
      await refresh();
    },
    acceptPing: async pingId => {
      if (!currentUser) return;
      await BhubeziService.acceptPing(pingId, currentUser.id, currentUser.name);
      await refresh();
    },
    confirmPickup: async pingId => {
      await BhubeziService.confirmPickup(pingId);
      await refresh();
    },
    updateDriverStatus: async (routeId, occupancy) => {
      if (!currentUser) return;
      await BhubeziService.updateDriverStatus(currentUser.id, routeId, occupancy);
      await refresh();
    },
    updateRankStatus: async (rankId, capacity, loadEstimate) => {
      if (!currentUser) return;
      await BhubeziService.updateRankStatus(rankId, capacity, loadEstimate, currentUser.name);
      await refresh();
    },
    createPost: async content => {
      if (!currentUser) return;
      await BhubeziService.createPost(currentUser.id, currentUser.name, content);
      await refresh();
    },
    likePost: async postId => {
      if (!currentUser) return;
      await BhubeziService.likePost(postId, currentUser.id);
      await refresh();
    },
    replyToPost: async (postId, content) => {
      if (!currentUser) return;
      await BhubeziService.replyToPost(postId, currentUser.id, currentUser.name, content);
      await refresh();
    },
    submitSuggestion: async (content, kind) => {
      if (!currentUser) return;
      await BhubeziService.submitSuggestion(currentUser.id, currentUser.name, content, kind);
      await refresh();
    },
    askQuestion: async (question, routeId) => {
      await BhubeziService.askQuestion(question, routeId);
      await refresh();
    },
    answerQuestion: async (faqId, answer) => {
      if (!currentUser) return;
      await BhubeziService.answerQuestion(faqId, answer, currentUser.name);
      await refresh();
    },
    verifyAnswer: async faqId => {
      if (!currentUser) return;
      await BhubeziService.verifyAnswer(faqId, currentUser.id);
      await refresh();
    },
  }), [snapshot, currentUser]);

  return <AppStore.Provider value={value}>{children}</AppStore.Provider>;
}

export function useAppStore() {
  const store = useContext(AppStore);
  if (!store) throw new Error('useAppStore must be used inside AppStoreProvider');
  return store;
}
