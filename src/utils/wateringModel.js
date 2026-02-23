import { dayDiff } from './dateUtils';

export function computeLearnedInterval(history) {
  if (history.length < 2) return 7;
  const sorted = [...history].sort((a, b) => new Date(a) - new Date(b));
  const intervals = [];

  for (let i = 1; i < sorted.length; i += 1) {
    const interval = dayDiff(sorted[i], sorted[i - 1]);
    if (interval >= 1 && interval <= 90) intervals.push(interval);
  }

  if (!intervals.length) return 7;

  const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const recent = intervals.slice(-3);
  const recentMean = recent.reduce((sum, value) => sum + value, 0) / recent.length;
  return Math.min(30, Math.max(2, mean * 0.6 + recentMean * 0.4));
}

export function predictNextReminder(lastWateredAt, intervalDays) {
  const next = new Date(lastWateredAt);
  next.setHours(9, 0, 0, 0);
  next.setDate(next.getDate() + Math.round(intervalDays));

  if (next <= new Date()) {
    next.setDate(new Date().getDate() + 1);
  }

  return next.toISOString();
}

export function confidenceLabel(historyCount) {
  if (historyCount < 3) return 'Learning';
  if (historyCount < 8) return 'Adapting';
  return 'Confident';
}
