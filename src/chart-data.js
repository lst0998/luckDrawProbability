export const OUTCOME_CHANCE_THRESHOLD = .001;

// Normalization can shift an exact boundary by a few floating-point steps.
const meetsCutoff = probability => probability >= OUTCOME_CHANCE_THRESHOLD * (1 - 16 * Number.EPSILON);

export function visibleOutcomes(result) {
  const { probabilities, atLeast } = result;
  const points = [];
  let omittedProbability = 0;
  probabilities.forEach((chance, wins) => {
    if (meetsCutoff(chance)) points.push({ wins, chance, tail: atLeast[wins] });
    else omittedProbability += chance;
  });
  return { points, omittedProbability, trimmed: points.length < probabilities.length };
}

export function visibleCostOutcomes(costs) {
  return costs.costByWins.filter(row => row.wins > 0 && meetsCutoff(row.probability));
}
