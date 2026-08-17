export const INSTAGRAM_MAX_ATTEMPTS = 3;
export const INSTAGRAM_RETRY_DELAYS_MS = [5 * 60_000, 30 * 60_000, 2 * 60 * 60_000];

export function nextInstagramRetry(attemptCount: number, now = Date.now()): Date | null {
  const delay = INSTAGRAM_RETRY_DELAYS_MS[attemptCount - 1];
  return delay ? new Date(now + delay) : null;
}

export function canUseNativeFacebookSchedule(scheduledFor: string | null, contentFormat: string): boolean {
  if (!scheduledFor || !["image", "carousel"].includes(contentFormat)) return false;
  const distance = new Date(scheduledFor).getTime() - Date.now();
  return distance >= 10 * 60_000 && distance <= 30 * 24 * 60 * 60_000;
}
