export function formatProbability(value = 0) {
  if (value > 0 && value < 0.0001) return '<0.01%';
  if (value < 1 && value > 0.9999) return '>99.99%';
  return `${(value * 100).toFixed(2)}%`;
}

export function formatAmount(value) {
  if (value === null) return '—';
  if (value > 0 && value < .0001) return '<0.0001';
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}
