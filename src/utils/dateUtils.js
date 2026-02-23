export function toISODate(date = new Date()) {
  return date.toISOString();
}

export function toReadable(dateString) {
  return new Date(dateString).toLocaleDateString();
}

export function dayDiff(a, b) {
  return Math.max(1, (new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24));
}
