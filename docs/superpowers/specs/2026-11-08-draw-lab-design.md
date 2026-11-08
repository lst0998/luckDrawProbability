# Lucky Draw Lab — current model

The user clarified that the supplied per-draw probability is the actual chance of receiving a prize. This supersedes the original shared-pool allocation model. Remove competitor inputs and the second allocation step. Each account can win once: q = 1 − (1 − p)^draws; total wins follow a binomial distribution over the user’s accounts.

Use two separate interactive graphs: outcome probabilities as bars, and cumulative P(prizes ≥ X) as a line on its own 0–100% axis, using only “X or more prizes” labels and including exactly X, without a configurable target. Preserve account-strategy comparisons, CSV export, and mobile support. Retain prize count as an explicitly optional ceiling on combined winnings, disabled by default; it is not a shared-pool exhaustion model.

React/Vite remains the frontend, with direct binomial probability calculations in a cancellable worker. No backend or credentials are required. Deployment uses the existing GitHub Pages branch and project subpath.

Add a cost-per-donation input, default 1, in user-supplied currency/units. Assume one donation per draw and charge all planned donations. Each prize gives exactly 2 tickets. Theoretical cost per ticket is total donation spend divided by 2 × the exact expected prize count (including the optional cap). When no tickets are expected, show no finite cost; a zero donation amount otherwise gives a zero cost. Include pricing inputs/results and inclusive probabilities in CSV exports. Add a separate graph of total cost / (2 × wins), with zero wins shown as no finite ticket cost. Show costs for all allowed win counts and their probabilities in tooltips. Remove simulation rounds, rerun controls, sampling confidence intervals, and seed fields; every result is calculated directly.

Keep one bar/point per integer prize count in both probability graphs. Trim only contiguous tails with less than 0.005% probability each; do not renormalize or change any calculations. Show all remaining integer labels and scroll horizontally when needed. Place the cost summary and cost-by-wins graph after the individual and cumulative probability graphs.
