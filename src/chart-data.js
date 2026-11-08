// Reserve half the 0.01% display budget for each tail. Keep every integer
// between the remaining endpoints, using the original, unscaled probabilities.
export function visibleOutcomes(result) {
  const { probabilities, atLeast } = result;
  const tailBudget = .00005;
  let first = 0, last = probabilities.length - 1;
  let lowerTail = 0, upperTail = 0;
  while (first < last && lowerTail + probabilities[first] < tailBudget) {
    lowerTail += probabilities[first++];
  }
  while (last > first && upperTail + probabilities[last] < tailBudget) {
    upperTail += probabilities[last--];
  }
  const points = [];
  for (let wins = first; wins <= last; wins++) {
    points.push({ wins, chance: probabilities[wins], tail: atLeast[wins] });
  }
  return { points, omittedProbability: lowerTail + upperTail, trimmed: first > 0 || last < probabilities.length - 1 };
}

export const COST_CHANCE_THRESHOLD = .001;

export function visibleCostOutcomes(costs) {
  // Normalizing the distribution can move an exact cutoff by a few floating-
  // point steps. Keep that boundary without rounding displayed percentages.
  const cutoff = COST_CHANCE_THRESHOLD * (1 - 16 * Number.EPSILON);
  return costs.costByWins.filter(row => row.wins > 0 && row.probability >= cutoff);
}
