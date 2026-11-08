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
- Two separate graphs: bars for individual outcomes, and a cumulative line for **P(prizes ≥ X)**. For example, “2 or more prizes” includes exactly 2 prizes and every higher outcome. Cumulative probabilities are shown directly in the graph; there is no target input.
- Cost per donation, total donation cost, expected tickets (2 per prize), and theoretical cost per ticket. One donation is one draw; all planned donations are charged.
- A separate interactive cost-by-wins curve: total donation cost divided by (wins × 2), with a zero-win explanation and keyboard/touch exploration.
- Expected prize count, chance of winning 1 or more prizes, and a central 90% outcome interval.
- Calculated equal-draw-budget account comparisons and CSV download including scenario settings, probabilities, and costs at every win count.
- Responsive layout, keyboard-accessible chart tooltips, reduced-motion support, and cancellable worker calculations.

## Probability model

The supplied probability p is the actual chance of receiving a prize on each draw, while the account has not yet won. Competition is already reflected in p, so there are no competitor inputs or additional allocation step. Each account wins with probability `q = 1 - (1 - p)^draws`, with a maximum of one prize per account. Total wins follow `X ~ Binomial(accounts, q)`.

With 5% per draw, 10 draws per account, and 20 accounts, each account has a 40.1263% chance of winning and the mathematical expectation is 8.0253 prizes.

The optional prize limit is off by default. If explicitly enabled, the result is `Y = min(X, maximumPrizes)`; this combines all higher outcomes at the cap. A disabled cap never affects results, even when its saved count is zero. This is only a ceiling on combined winnings. It does not model a shared pool being exhausted by other participants or changing draw odds.

All probabilities and strategy comparisons are calculated directly from the binomial probability mass function, with no simulations or random sampling. The recurrence starts at the mode and normalizes, avoiding whole-distribution underflow for large populations. The cumulative line is the inclusive tail P(Y >= X), summed from the highest count down to retain very small probabilities. Chart labels, tooltips, summary cards, and the CSV column `probability_x_or_more` all include the threshold itself. Both probability graphs show every integer prize count in the displayed interval, without combining counts into ranges. Only negligible tails are hidden: each excluded tail has less than 0.005% probability, so their combined probability stays below 0.01%. The original probabilities are preserved, including hidden outcomes in cumulative sums, summaries, and CSV exports. Wide graphs scroll horizontally, initially centered around the most likely outcome. The cost summary and cost graph appear below both probability graphs. Values use floating-point arithmetic and extremely small probabilities may underflow. Percentages retain two decimal places, with inequalities for positive probabilities too close to 0 or 1 to display accurately. The likely range spans the 5th–95th percentiles of the outcome distribution; discrete outcomes may cover more than 90% probability. Integer inputs are bounded to 1,000 accounts, 20,000 prizes, and 10,000 draws per account; zero is allowed.

## Theoretical cost per ticket

`total donation cost = accounts × draws per account × cost per donation`

`expected tickets = 2 × expected prizes`

`theoretical cost per ticket = total donation cost / expected tickets`

Expected prizes are calculated from the binomial distribution, including the optional cap, using the same direct calculation as the probability charts. This is long-run spending divided by expected ticket yield, not the average of per-outcome ratios (some outcomes yield zero tickets). No expected tickets is displayed as “— / No tickets expected”; free donations with positive expected yield cost zero per ticket. All amounts use the user’s input currency or units, with a default donation cost of 1.

The separate cost graph shows `total donation cost / (2 × wins)` for each positive integer win count up to the account/prize limit. It shows hypothetical costs even when an outcome has zero probability; the tooltip includes that outcome’s calculated chance. Zero wins yields zero tickets, so no finite cost per ticket is plotted. The curve and CSV preserve every integer outcome, and hover, touch, or arrow keys select a count. The graph is distinct from the summary ratio of spending to expected ticket yield.

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
