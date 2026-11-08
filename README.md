# Lucky Lab

An interactive website for understanding lucky-draw outcomes across multiple accounts using a fixed per-draw probability and a maximum of one prize per account.

## Run

Requires Node.js 20.19+ or 22.12+ and npm. Tested with Node.js 24.22.1.

```sh
npm ci
npm run dev -- --port 5173 --strictPort
```

Build the static site with `npm run build`; serve the build with `npm run preview -- --port 4173 --strictPort`. No backend, secrets, database, or external runtime services are needed. Fonts are bundled locally.

## Features

- Adjustable per-draw win probability, your accounts, and draws per account. An optional cap on combined prizes is off by default.
- Exact-outcome bars and a cumulative line for **P(prizes > k)**. For example, “more than 1” includes all outcomes of 2 or more prizes. Cumulative probabilities are shown directly in the graph; there is no target input.
- Expected prize count, chance of at least one prize, and a central 90% outcome interval.
- Equal-draw-budget account comparisons, repeatable simulations, and CSV download including scenario settings and seed.
- Responsive layout, keyboard-accessible chart tooltips, reduced-motion support, and cancellable worker calculations.

## Probability model

The supplied probability p is the actual chance of receiving a prize on each draw, while the account has not yet won. Competition is already reflected in p, so there are no competitor inputs or additional allocation step. Each account wins with probability `q = 1 - (1 - p)^draws`, with a maximum of one prize per account. Total wins follow `X ~ Binomial(accounts, q)`.

With 5% per draw, 10 draws per account, and 20 accounts, each account has a 40.1263% chance of winning and the mathematical expectation is 8.0253 prizes. The simulated average may differ slightly.

The optional prize limit is off by default. If explicitly enabled, the result is `Y = min(X, maximumPrizes)`; this combines all higher outcomes at the cap. A disabled cap never affects results, even when its saved count is zero. This is only a ceiling on combined winnings. It does not model a shared pool being exhausted by other participants or changing draw odds.

Results use 10,000 Monte Carlo rounds (comparisons use 5,000), so they are estimates. The cumulative line is the survival function, not P(Y <= k). The plotted domain ends at the last observed outcome (at least 0–4 where possible); larger counts group neighboring outcomes into labeled bins. Zero observations do not prove impossibility, and a simulated 100% does not guarantee success. Percentages retain two decimal places, with inequalities for positive probabilities too close to 0 or 1 to display accurately. The 90% outcome interval differs from the 95% Wilson confidence interval reported for the estimated chance of at least one win. Integer inputs are bounded to 1,000 own accounts, 20,000 prizes, and 10,000 draws per account; zero is allowed.

## Validation

```sh
npm test
npm run build
# With the development server running:
npm run test:browser
```

The browser checks use Playwright and system Chromium. Set `CHROMIUM_PATH` if Chromium lives elsewhere and `APP_URL` to test another running server, including the production preview. Math tests cover known analytical cases, cumulative sums, rare and extreme parameters, fixed-odds expectations, and optional account/prize caps.

## GitHub Pages deployment

The source repository is `lst0998/luckDrawProbability`. Build for its project subpath with:

```sh
npm ci
npm run build -- --base=/luckDrawProbability/
```

Publish the contents of `dist/` (including an empty `.nojekyll` file) to the `gh-pages` branch. In repository **Settings → Pages**, choose **Deploy from a branch**, then **gh-pages / (root)**. The intended address is `https://lst0998.github.io/luckDrawProbability/`; this address works only after Pages has been enabled and its deployment has completed. The built files contain the application and its worker; no environment variables or server are required at runtime.

To check the subpath build locally, serve it with `npm run preview -- --base=/luckDrawProbability/ --port 4174 --strictPort`, then run `APP_URL=http://127.0.0.1:4174/luckDrawProbability/ npm run test:browser`.
