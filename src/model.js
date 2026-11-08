export const LIMITS = { probability: [0, 100], accounts: [0, 1000], draws: [0, 10000], prizes: [0, 20000] };
export const COST_LIMITS = [0, 1000000];
export const TICKETS_PER_PRIZE = 2;
export const DEFAULTS = { probability: 5, accounts: 20, draws: 10, prizes: 20, limitPrizes: false };

export function accountWinChance(percent, draws) {
  if (draws === 0 || percent === 0) return 0;
  if (percent === 100) return 1;
  return -Math.expm1(draws * Math.log1p(-percent / 100));
}
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
// Start at the mode, then normalize. Unlike a recurrence from P(0), this
// does not underflow the entire distribution for large populations.
function binomialMass(n, p) {
  const mass = new Float64Array(n + 1);
  if (p === 0 || n === 0) mass[0] = 1;
  else if (p === 1) mass[n] = 1;
  else {
    const mode = Math.min(n, Math.floor((n + 1) * p));
    mass[mode] = 1;
    for (let k = mode; k > 0; k--) mass[k - 1] = mass[k] * k / (n - k + 1) * (1 - p) / p;
    for (let k = mode; k < n; k++) mass[k + 1] = mass[k] * (n - k) / (k + 1) * p / (1 - p);
  }
  const total = mass.reduce((a, b) => a + b, 0);
  return mass.map(value => value / total);
}
export function binomialCDF(n, p) {
  const mass = binomialMass(n, p);
  let cumulative = 0;
  for (let k = 0; k <= n; k++) { cumulative += mass[k]; mass[k] = Math.min(1, cumulative); }
  mass[n] = 1;
  return mass;
}
function sampleCDF(cdf, rng) {
  const u = rng();
  let low = 0, high = cdf.length - 1;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (u < cdf[mid]) high = mid; else low = mid + 1;
  }
  return low;
}
export function summarize(histogram, trials) {
  let sum = 0, cumulative = 0;
  let low, high;
  const atLeast = histogram.map((count, k) => {
    sum += k * count;
    cumulative += count;
    if (low === undefined && cumulative >= trials * .05) low = k;
    if (high === undefined && cumulative >= trials * .95) high = k;
    // Keep the outcome at k: cumulative probabilities mean P(prizes >= k).
    return (trials - cumulative + count) / trials;
  });
  return { histogram, trials, atLeast, expected: sum / trials, range: [low ?? 0, high ?? 0] };
}
function validateConfig(config) {
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    const value = config[key];
    if (!Number.isFinite(value) || value < min || value > max || (key !== 'probability' && !Number.isInteger(value))) throw new RangeError(`Invalid ${key}`);
  }
  if (typeof config.limitPrizes !== 'boolean') throw new RangeError('Invalid limitPrizes');
}
export function simulate(config, trials = 10000, seed = 42) {
  validateConfig(config);
  if (!Number.isInteger(trials) || trials < 1) throw new RangeError('Invalid trial count');
  const { probability, accounts, draws, prizes, limitPrizes } = config;
  const ownChance = accountWinChance(probability, draws);
  const ownCDF = binomialCDF(accounts, ownChance);
  const cap = limitPrizes ? Math.min(accounts, prizes) : accounts;
  const histogram = new Array(cap + 1).fill(0);
  const rng = seededRandom(seed);
  const recent = [];
  for (let i = 0; i < trials; i++) {
    const won = Math.min(sampleCDF(ownCDF, rng), cap);
    histogram[won]++;
    if (i < 40) recent.push(won);
  }
  return { ...summarize(histogram, trials), ownChance, recent };
}
export function strategies(config) {
  const budget = config.accounts * config.draws;
  if (!budget) return [];
  const divisors = [];
  for (let a = 1; a <= Math.min(1000, budget); a++) if (budget % a === 0 && budget / a <= 10000) divisors.push(a);
  const selected = new Set([config.accounts]);
  for (let i = 0; i < 5; i++) selected.add(divisors[Math.round(i * (divisors.length - 1) / 4)]);
  return [...selected].sort((a, b) => a - b).map(accounts => ({ accounts, draws: budget / accounts }));
}
export function wilsonInterval(successes, trials) {
  const p = successes / trials, z = 1.96, denominator = 1 + z * z / trials;
  const center = (p + z * z / (2 * trials)) / denominator;
  const radius = z * Math.sqrt(p * (1 - p) / trials + z * z / (4 * trials * trials)) / denominator;
  return [Math.max(0, center - radius), Math.min(1, center + radius)];
}

// Exact expectation for the ticket-cost calculation; independent of simulation seed.
export function theoreticalCosts(config, donationCost) {
  validateConfig(config);
  if (!Number.isFinite(donationCost) || donationCost < COST_LIMITS[0] || donationCost > COST_LIMITS[1]) {
    throw new RangeError('Invalid donation cost');
  }
  const { accounts, draws, probability, limitPrizes, prizes } = config;
  const q = accountWinChance(probability, draws);
  let expectedPrizes = accounts * q;
  if (limitPrizes && prizes < accounts) {
    expectedPrizes = prizes === 0 ? 0 : binomialMass(accounts, q).reduce((sum, mass, wins) => sum + Math.min(wins, prizes) * mass, 0);
  }
  const totalDonations = accounts * draws;
  const totalCost = totalDonations * donationCost;
  const expectedTickets = expectedPrizes * TICKETS_PER_PRIZE;
  return {
    totalDonations, totalCost, expectedPrizes, expectedTickets,
    costPerTicket: expectedTickets > 0 ? totalCost / expectedTickets : null,
  };
}
