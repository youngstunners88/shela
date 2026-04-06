import type { Snapshot } from '../types';

export const initialSnapshot: Snapshot = {
  users: [
    { id: 'driver-baba-joe', name: 'Baba Joe', role: 'DRIVER', points: 1550, verified: true, currentRouteId: 'bree-bara', occupancy: 9, vehicle: { brand: 'Toyota Quantum', color: 'White', plate: 'JZ 456 GP' } },
    { id: 'marshal-sis-thuli', name: 'Sis Thuli', role: 'MARSHAL', points: 1790, verified: true },
    { id: 'passenger-demo', name: 'Demo Passenger', role: 'PASSENGER', points: 240, verified: true },
  ],
  ranks: [
    { id: 'bree', name: 'Bree Street', location: 'Joburg CBD', category: 'CBD' },
    { id: 'noord', name: 'Noord Street', location: 'Joburg CBD', category: 'CBD' },
    { id: 'park', name: 'Park Station', location: 'Joburg CBD', category: 'CBD' },
    { id: 'bara', name: 'Bara Rank', location: 'Soweto', category: 'Soweto' },
    { id: 'dobsonville', name: 'Dobsonville', location: 'Soweto', category: 'Soweto' },
    { id: 'alex', name: 'Alexandra', location: 'Alexandra', category: 'Alexandra' },
  ],
  routes: [
    { id: 'bree-bara', originId: 'bree', destinationId: 'bara', fare: 22, label: 'Bree → Bara' },
    { id: 'noord-dobsonville', originId: 'noord', destinationId: 'dobsonville', fare: 24, label: 'Noord → Dobsonville' },
    { id: 'bree-alex', originId: 'bree', destinationId: 'alex', fare: 18, label: 'Bree → Alex' },
    { id: 'park-bara', originId: 'park', destinationId: 'bara', fare: 23, label: 'Park → Bara' },
  ],
  rankStatuses: [
    { rankId: 'bree', capacity: 'MOVING', loadEstimate: 48, marshalName: 'Sis Thuli', lastUpdated: Date.now() },
    { rankId: 'bara', capacity: 'HALF_FULL', loadEstimate: 62, marshalName: 'Baba Joe', lastUpdated: Date.now() },
  ],
  pings: [],
  posts: [
    { id: 'post-1', authorId: 'marshal-sis-thuli', authorName: 'Sis Thuli', content: 'Bree is moving sharp today. Bara line is clean and fast.', likes: 3, likedBy: ['passenger-demo'], replies: [], createdAt: Date.now() - 1000 * 60 * 15 },
  ],
  suggestions: [
    { id: 'suggestion-1', userId: 'passenger-demo', userName: 'Demo Passenger', content: 'Add better late-night rank updates for workers going home.', kind: 'IMPROVE', createdAt: Date.now() - 1000 * 60 * 45 },
  ],
  faqs: [
    { id: 'faq-1', question: 'How much is Bree to Bara?', answer: 'Usually around R22 unless there is a special event surge.', answeredBy: 'Sis Thuli', routeId: 'bree-bara', verifiedBy: ['passenger-demo'], createdAt: Date.now() - 1000 * 60 * 60 },
  ],
};
