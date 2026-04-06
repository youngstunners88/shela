import type { Snapshot, User, UserRole, Vehicle, QueueCapacity } from '../types';
import { initialSnapshot } from './mockData';

const storageKey = 'bhubezi-caffeine-snapshot';

function loadSnapshot(): Snapshot {
  const raw = localStorage.getItem(storageKey);
  return raw ? JSON.parse(raw) as Snapshot : initialSnapshot;
}

function saveSnapshot(snapshot: Snapshot) {
  localStorage.setItem(storageKey, JSON.stringify(snapshot));
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const BhubeziService = {
  async getSnapshot(): Promise<Snapshot> {
    return loadSnapshot();
  },
  async registerUser(name: string, role: UserRole, vehicle?: Vehicle): Promise<User> {
    const snapshot = loadSnapshot();
    const user: User = { id: id('user'), name, role, points: 100, verified: role !== 'DRIVER', vehicle };
    saveSnapshot({ ...snapshot, users: [...snapshot.users, user] });
    return user;
  },
  async createPing(passengerId: string, passengerName: string, originRankId: string, destinationRankId: string, price: number, message: string) {
    const snapshot = loadSnapshot();
    const ping = { id: id('ping'), passengerId, passengerName, originRankId, destinationRankId, price, message, acceptedDriverIds: [], acceptedDriverNames: [], createdAt: Date.now(), pickedUp: false };
    saveSnapshot({ ...snapshot, pings: [ping, ...snapshot.pings], users: snapshot.users.map(u => u.id === passengerId ? { ...u, points: u.points + 5 } : u) });
    return ping;
  },
  async acceptPing(pingId: string, driverId: string, driverName: string) {
    const snapshot = loadSnapshot();
    saveSnapshot({
      ...snapshot,
      pings: snapshot.pings.map(p => p.id === pingId ? { ...p, acceptedDriverIds: [...p.acceptedDriverIds, driverId], acceptedDriverNames: [...p.acceptedDriverNames, driverName] } : p),
      users: snapshot.users.map(u => u.id === driverId ? { ...u, points: u.points + 15 } : u),
    });
  },
  async confirmPickup(pingId: string) {
    const snapshot = loadSnapshot();
    saveSnapshot({ ...snapshot, pings: snapshot.pings.map(p => p.id === pingId ? { ...p, pickedUp: true } : p) });
  },
  async updateDriverStatus(userId: string, routeId: string, occupancy: number) {
    const snapshot = loadSnapshot();
    saveSnapshot({ ...snapshot, users: snapshot.users.map(u => u.id === userId ? { ...u, currentRouteId: routeId, occupancy, points: u.points + 10 } : u) });
  },
  async updateRankStatus(rankId: string, capacity: QueueCapacity, loadEstimate: number, marshalName: string) {
    const snapshot = loadSnapshot();
    const next = { rankId, capacity, loadEstimate, marshalName, lastUpdated: Date.now() };
    const exists = snapshot.rankStatuses.some(s => s.rankId === rankId);
    saveSnapshot({ ...snapshot, rankStatuses: exists ? snapshot.rankStatuses.map(s => s.rankId === rankId ? next : s) : [...snapshot.rankStatuses, next] });
  },
  async createPost(authorId: string, authorName: string, content: string) {
    const snapshot = loadSnapshot();
    const post = { id: id('post'), authorId, authorName, content, likes: 0, likedBy: [], replies: [], createdAt: Date.now() };
    saveSnapshot({ ...snapshot, posts: [post, ...snapshot.posts] });
  },
  async likePost(postId: string, userId: string) {
    const snapshot = loadSnapshot();
    saveSnapshot({ ...snapshot, posts: snapshot.posts.map(post => post.id === postId && !post.likedBy.includes(userId) ? { ...post, likes: post.likes + 1, likedBy: [...post.likedBy, userId] } : post) });
  },
  async replyToPost(postId: string, authorId: string, authorName: string, content: string) {
    const snapshot = loadSnapshot();
    saveSnapshot({ ...snapshot, posts: snapshot.posts.map(post => post.id === postId ? { ...post, replies: [...post.replies, { id: id('reply'), authorId, authorName, content, createdAt: Date.now() }] } : post) });
  },
  async submitSuggestion(userId: string, userName: string, content: string, kind: 'IMPROVE' | 'REMOVE') {
    const snapshot = loadSnapshot();
    saveSnapshot({ ...snapshot, suggestions: [{ id: id('suggestion'), userId, userName, content, kind, createdAt: Date.now() }, ...snapshot.suggestions], users: snapshot.users.map(u => u.id === userId ? { ...u, points: u.points + 25 } : u) });
  },
  async askQuestion(question: string, routeId?: string) {
    const snapshot = loadSnapshot();
    saveSnapshot({ ...snapshot, faqs: [{ id: id('faq'), question, routeId, verifiedBy: [], createdAt: Date.now() }, ...snapshot.faqs] });
  },
  async answerQuestion(faqId: string, answer: string, answeredBy: string) {
    const snapshot = loadSnapshot();
    saveSnapshot({ ...snapshot, faqs: snapshot.faqs.map(f => f.id === faqId ? { ...f, answer, answeredBy } : f) });
  },
  async verifyAnswer(faqId: string, verifierUserId: string) {
    const snapshot = loadSnapshot();
    saveSnapshot({ ...snapshot, faqs: snapshot.faqs.map(f => f.id === faqId && !f.verifiedBy.includes(verifierUserId) ? { ...f, verifiedBy: [...f.verifiedBy, verifierUserId] } : f), users: snapshot.users.map(u => u.id === verifierUserId ? { ...u, points: u.points + 10 } : u) });
  },
};
