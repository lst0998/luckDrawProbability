# Lucky Lab

An interactive website for understanding lucky-draw outcomes across multiple accounts competing for a shared prize pool.

## Run

Requires Node.js 20.19+ or 22.12+ and npm. Tested with Node.js 24.22.1.

```sh
npm ci
npm run dev -- --port 5173 --strictPort
```

Build the static site with `npm run build`; serve the build with `npm run preview -- --port 4173 --strictPort`. No backend, secrets, database, or external runtime services are needed. Fonts are bundled locally.

## Features

- Adjustable per-draw probability, own accounts, draws per account, shared prizes, other accounts, and draws per other account.
- Exact-outcome bars and a cumulative line for **P(prizes > k)**. For example, “more than 1” includes all outcomes of 2 or more prizes. Cumulative probabilities are shown directly in the graph; there is no target input.
- Expected prize count, chance of at least one prize, and a central 90% outcome interval.
- Equal-draw-budget account comparisons, repeatable simulations, and CSV download including scenario settings and seed.
- Responsive layout, keyboard-accessible chart tooltips, reduced-motion support, and cancellable worker calculations.

## Probability model

Every account has independent draws with the same per-draw win probability p. An account qualifies with probability `q = 1 - (1 - p)^draws`. Each account can receive at most one prize. When more accounts qualify than available prizes, a uniformly random subset of qualified accounts receives prizes; otherwise every qualified account wins. Own and rival qualification counts are sampled as binomial variables. Allocation among qualified accounts uses a hypergeometric distribution.

This is an explicit **round-end allocation assumption**, not a chronological first-come-first-served draw. Prizes can remain unclaimed if too few accounts qualify. A fixed probability, competing participants, and a finite pool alone cannot specify every possible real-world lottery; consult the in-app explanation before applying results to another rule set.

Results use 10,000 Monte Carlo rounds (comparisons use 5,000), so they are estimates. The cumulative line is the survival function, not P(Y <= k). The plotted domain ends at the last observed outcome (at least 0–4 where possible); larger counts group neighboring outcomes into labeled bins. Zero observations do not prove impossibility. The 90% outcome interval differs from the 95% Wilson confidence interval reported for the estimated chance of at least one win. Integer inputs are bounded to 1,000 own accounts, 20,000 other accounts/prizes, and 10,000 draws per account; zero is allowed.

## Validation

```sh
npm test
npm run build
# With the development server running:
npm run test:browser
```

The browser checks use Playwright and system Chromium. Set `CHROMIUM_PATH` if Chromium lives elsewhere and `APP_URL` to test another running server, including the production preview. Math tests cover known analytical cases, cumulative sums, rare and extreme parameters, hypergeometric bounds, and account/prize caps.

## GitHub Pages deployment

The source repository is `lst0998/luckDrawProbability`. Build for its project subpath with:

```sh
npm ci
npm run build -- --base=/luckDrawProbability/
```

Publish the contents of `dist/` (including an empty `.nojekyll` file) to the `gh-pages` branch. In repository **Settings → Pages**, choose **Deploy from a branch**, then **gh-pages / (root)**. The intended address is `https://lst0998.github.io/luckDrawProbability/`; this address works only after Pages has been enabled and its deployment has completed. The built files contain the application and its worker; no environment variables or server are required at runtime.

To check the subpath build locally, serve it with `npm run preview -- --base=/luckDrawProbability/ --port 4174 --strictPort`, then run `APP_URL=http://127.0.0.1:4174/luckDrawProbability/ npm run test:browser`.
