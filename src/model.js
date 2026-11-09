export const LIMITS = { probability: [0, 100], accounts: [0, 10000], draws: [0, 10000], prizes: [0, 1000000000] };
export const COST_LIMITS = [0, 1000000];
export const TICKETS_PER_PRIZE = 2;
export const DEFAULTS = { probability: 5, accounts: 20, draws: 10, prizes: 20, limitPrizes: false };
export const ESTIMATOR_DEFAULTS = { totalOrders: 1000, drawsPerOrder: 2, totalPrizes: 100 };
export const ESTIMATOR_LIMITS = { totalOrders: [0, 1000000000], drawsPerOrder: [0, 10000], totalPrizes: LIMITS.prizes };

export function estimateWinProbability(inputs) {
  for (const [key, [min, max]] of Object.entries(ESTIMATOR_LIMITS)) {
    const value = inputs[key];
    if (!Number.isFinite(value) || value < min || value > max || (key !== 'drawsPerOrder' && !Number.isInteger(value))) {
      throw new RangeError(`Invalid ${key}`);
    }
  }
  const totalDraws = inputs.totalOrders * inputs.drawsPerOrder;
  const probability = totalDraws > 0 ? Math.min(1, inputs.totalPrizes / totalDraws) : null;
  // Round in hundredths of a percent, allowing for floating-point error
  // at decimal midpoints (for example, 107 / 4000 must display 2.68%).
  const basisPoints = totalDraws > 0 ? Math.min(10000, inputs.totalPrizes * 10000 / totalDraws) : null;
  return {
    totalDraws,
    probability,
    probabilityPercent: basisPoints === null ? null : Math.round(basisPoints + 4 * Number.EPSILON * basisPoints) / 100,
    capped: totalDraws > 0 && inputs.totalPrizes > totalDraws,
  };
}

export function accountWinChance(percent, draws) {
  if (draws === 0 || percent === 0) return 0;
  if (percent === 100) return 1;
  return -Math.expm1(draws * Math.log1p(-percent / 100));
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
function validateConfig(config) {
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    const value = config[key];
    if (!Number.isFinite(value) || value < min || value > max || (key !== 'probability' && !Number.isInteger(value))) throw new RangeError(`Invalid ${key}`);
  }
  if (typeof config.limitPrizes !== 'boolean') throw new RangeError('Invalid limitPrizes');
}
export function calculate(config) {
  validateConfig(config);
  const { probability, accounts, draws, prizes, limitPrizes } = config;
  const ownChance = accountWinChance(probability, draws);
  const cap = limitPrizes ? Math.min(accounts, prizes) : accounts;
  const probabilities = new Array(cap + 1).fill(0);
  binomialMass(accounts, ownChance).forEach((mass, wins) => {
    probabilities[Math.min(wins, cap)] += mass;
  });
  if (cap === 0) probabilities[0] = 1;
  // Sum from the upper tail to preserve very small positive probabilities.
  const atLeast = new Array(cap + 1);
  let tail = 0;
  for (let k = cap; k >= 0; k--) {
    tail += probabilities[k];
    atLeast[k] = Math.min(1, tail);
  }
  atLeast[0] = 1;
  let expected = 0, cumulative = 0, low, high;
  probabilities.forEach((mass, k) => {
    expected += k * mass;
    cumulative += mass;
    if (low === undefined && cumulative >= .05) low = k;
    if (high === undefined && cumulative >= .95) high = k;
  });
  return { probabilities, atLeast, expected: Math.min(cap, expected), range: [low ?? 0, high ?? cap], ownChance };
}
export function strategies(config) {
  const budget = config.accounts * config.draws;
  if (!budget) return [];
  const divisors = [];
  for (let a = 1; a <= Math.min(LIMITS.accounts[1], budget); a++) if (budget % a === 0 && budget / a <= LIMITS.draws[1]) divisors.push(a);
  const selected = new Set([config.accounts]);
  for (let i = 0; i < 5; i++) selected.add(divisors[Math.round(i * (divisors.length - 1) / 4)]);
  return [...selected].sort((a, b) => a - b).map(accounts => ({ accounts, draws: budget / accounts }));
}
export function theoreticalCosts(config, donationCost) {
  const result = calculate(config);
  if (!Number.isFinite(donationCost) || donationCost < COST_LIMITS[0] || donationCost > COST_LIMITS[1]) {
    throw new RangeError('Invalid donation cost');
  }
  const expectedPrizes = result.expected;
  const totalDonations = config.accounts * config.draws;
  const totalCost = totalDonations * donationCost;
  const expectedTickets = expectedPrizes * TICKETS_PER_PRIZE;
  return {
    totalDonations, totalCost, expectedPrizes, expectedTickets,
    costPerTicket: expectedTickets > 0 ? totalCost / expectedTickets : null,
    costByWins: result.probabilities.map((probability, wins) => ({
      wins, tickets: wins * TICKETS_PER_PRIZE,
      costPerTicket: wins > 0 ? totalCost / (wins * TICKETS_PER_PRIZE) : null,
      probability,
    })),
  };
}
