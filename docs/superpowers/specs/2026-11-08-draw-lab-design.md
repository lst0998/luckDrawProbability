# Lucky Draw Lab — current model

The user clarified that the supplied per-draw probability is the actual chance of receiving a prize. This supersedes the original shared-pool allocation model. Remove competitor inputs and the second allocation step. Each account can win once: q = 1 − (1 − p)^draws; total wins follow a binomial distribution over the user’s accounts.

Use two separate interactive graphs: outcome probabilities as bars, and cumulative P(prizes ≥ X) as a line on its own 0–100% axis, using only “X or more prizes” labels and including exactly X, without a configurable target. Preserve account-strategy comparisons, simulation, CSV export, and mobile support. Retain prize count as an explicitly optional ceiling on combined winnings, disabled by default; it is not a shared-pool exhaustion model.

React/Vite remains the frontend, with independent binomial Monte Carlo simulations in a cancellable worker. No backend or credentials are required. Deployment uses the existing GitHub Pages branch and project subpath.

Add a cost-per-donation input, default 1, in user-supplied currency/units. Assume one donation per draw and charge all planned donations. Each prize gives exactly 2 tickets. Theoretical cost per ticket is total donation spend divided by 2 × the exact expected prize count (including the optional cap), independent of Monte Carlo seed. When no tickets are expected, show no finite cost; a zero donation amount otherwise gives a zero cost. Include pricing inputs/results and inclusive probabilities in CSV exports.
