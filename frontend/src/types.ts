export type UserRole = 'PASSENGER' | 'DRIVER' | 'MARSHAL';
export type QueueCapacity = 'EMPTY' | 'MOVING' | 'HALF_FULL' | 'FULL_HOUSE' | 'OVERFLOWING';

export interface Vehicle {
  brand: string;
  color: string;
  plate: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  points: number;
  verified: boolean;
  currentRouteId?: string;
  occupancy?: number;
  vehicle?: Vehicle;
}

export interface Rank {
  id: string;
  name: string;
  location: string;
  category: string;
}

export interface Route {
  id: string;
  originId: string;
  destinationId: string;
  fare: number;
  label: string;
}

export interface RankStatus {
  rankId: string;
  capacity: QueueCapacity;
  loadEstimate: number;
  marshalName: string;
  lastUpdated: number;
}

export interface Ping {
  id: string;
  passengerId: string;
  passengerName: string;
  originRankId: string;
  destinationRankId: string;
  price: number;
  message: string;
  acceptedDriverIds: string[];
  acceptedDriverNames: string[];
  createdAt: number;
  pickedUp: boolean;
}

export interface SocialReply {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: number;
}

export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  likes: number;
  likedBy: string[];
  replies: SocialReply[];
  createdAt: number;
}

export interface Suggestion {
  id: string;
  userId: string;
  userName: string;
  content: string;
  kind: 'IMPROVE' | 'REMOVE';
  createdAt: number;
}

export interface Faq {
  id: string;
  question: string;
  answer?: string;
  answeredBy?: string;
  routeId?: string;
  verifiedBy: string[];
  createdAt: number;
}

export interface Snapshot {
  users: User[];
  ranks: Rank[];
  routes: Route[];
  rankStatuses: RankStatus[];
  pings: Ping[];
  posts: SocialPost[];
  suggestions: Suggestion[];
  faqs: Faq[];
}
