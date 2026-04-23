import type { QueueCapacity } from './types';

export const queueCapacityOptions: QueueCapacity[] = ['EMPTY', 'MOVING', 'HALF_FULL', 'FULL_HOUSE', 'OVERFLOWING'];

export const roleDescriptions = {
  PASSENGER: 'Find fares, routes, rank movement, and nearby drivers.',
  DRIVER: 'Manage trip demand, occupancy, and accepted pings.',
  MARSHAL: 'Update rank conditions and verify community information.',
} as const;

export const bibleVerses = [
  'Trust in the Lord with all your heart and lean not on your own understanding. — Proverbs 3:5',
  'I can do all things through Christ who strengthens me. — Philippians 4:13',
  'Be strong and courageous. — Joshua 1:9',
];
