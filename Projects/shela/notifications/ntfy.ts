// Shela Push Notifications via ntfy
// Server-side notification system for Shela events

import { createHash } from 'crypto';

const NTFY_BASE_URL = 'https://ntfy.sh';
const SHELA_TOPIC = 'shela-alerts';

export interface NotificationPayload {
  topic: string;
  title: string;
  message: string;
  priority?: 'low' | 'default' | 'high' | 'urgent';
  tags?: string[];
  actions?: NotificationAction[];
  icon?: string;
  click?: string;
}

export interface NotificationAction {
  action: 'view' | 'broadcast' | 'http';
  label: string;
  url?: string;
  body?: string;
  clear?: boolean;
}

/**
 * Send push notification via ntfy
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const response = await fetch(`${NTFY_BASE_URL}/${payload.topic || SHELA_TOPIC}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: payload.title,
        message: payload.message,
        priority: payload.priority || 'default',
        tags: payload.tags || [],
        actions: payload.actions || [],
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
}

// Shela-specific notification helpers

export async function notifyMatchUnlocked(
  userId: string,
  matchName: string,
  tier: string
): Promise<void> {
  await sendNotification({
    topic: `shela-user-${hashUserId(userId)}`,
    title: 'New Match! 🔥',
    message: `${matchName} unlocked ${tier} chat with you! Both staked and verified.`,
    priority: 'high',
    tags: ['match', 'verified', 'love'],
    actions: [
      {
        action: 'view',
        label: 'Open Chat',
        url: `https://shela.app/matches`,
        clear: true,
      }
    ]
  });
}

export async function notifyStakeLocked(
  userId: string,
  amount: number,
  meetTime: string
): Promise<void> {
  await sendNotification({
    topic: `shela-user-${hashUserId(userId)}`,
    title: 'Stake Locked 🔒',
    message: `${amount} SOL locked for meet at ${meetTime}. Remember to check in!`,
    priority: 'default',
    tags: ['stake', 'escrow', 'money'],
  });
}

export async function notifyCheckInRequired(
  userId: string,
  meetLocation: string,
  timeRemaining: number
): Promise<void> {
  await sendNotification({
    topic: `shela-user-${hashUserId(userId)}`,
    title: '⏰ Check-in Required!',
    message: `30 minutes to check in at ${meetLocation}. Don't lose your stake!`,
    priority: 'urgent',
    tags: ['checkin', 'urgent', 'money'],
    actions: [
      {
        action: 'view',
        label: 'Check In Now',
        url: `https://shela.app/checkin`,
        clear: true,
      }
    ]
  });
}

export async function notifyBothCheckedIn(
  userId: string,
  otherUserName: string
): Promise<void> {
  await sendNotification({
    topic: `shela-user-${hashUserId(userId)}`,
    title: '✅ Meet Verified!',
    message: `Both you and ${otherUserName} checked in. Stakes releasing soon!`,
    priority: 'high',
    tags: ['verified', 'success', 'stake-release'],
  });
}

export async function notifySlashExecuted(
  slashedUserId: string,
  reason: string,
  amount: number,
  victimId?: string
): Promise<void> {
  await sendNotification({
    topic: `shela-user-${hashUserId(slashedUserId)}`,
    title: '⚠️ Stake Slashed',
    message: `${amount} SOL slashed for: ${reason}. Reputation affected.`,
    priority: 'urgent',
    tags: ['slash', 'violation', 'penalty'],
  });
  
  if (victimId) {
    await sendNotification({
      topic: `shela-user-${hashUserId(victimId)}`,
      title: 'Justice Served ⚖️',
      message: `Violation reported. ${amount * 0.5} SOL compensation issued.`,
      priority: 'high',
      tags: ['compensation', 'justice', 'victim-support'],
    });
  }
}

export async function notifyReputationChange(
  userId: string,
  newScore: number,
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond',
  change: number
): Promise<void> {
  const emojis = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
    diamond: '👑'
  };
  
  const sign = change > 0 ? '+' : '';
  
  await sendNotification({
    topic: `shela-user-${hashUserId(userId)}`,
    title: `${emojis[tier]} Reputation ${change > 0 ? 'Up!' : 'Down'}`,
    message: `Score: ${newScore} (${sign}${change}). Tier: ${tier.toUpperCase()}.`,
    priority: change > 0 ? 'high' : 'default',
    tags: ['reputation', 'nft', tier],
  });
}

// Helper to hash user ID for topic privacy
function hashUserId(userId: string): string {
  return createHash('sha256')
    .update(userId + 'shela-salt-2024')
    .digest('hex')
    .slice(0, 16);
}

// Subscribe to notifications
export function getSubscriptionUrl(userId: string): string {
  return `${NTFY_BASE_URL}/shela-user-${hashUserId(userId)}/json`;
}