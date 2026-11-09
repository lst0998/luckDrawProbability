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

- An optional orders calculator estimates per-draw probability from total orders × average draws per order (a fractional coefficient) and total prizes. Use either probability method, then click the shared Calculate button at the bottom of the left panel.
- Adjustable per-draw win probability, total prizes, your accounts, and draws per account. Direct input includes Total prizes below the probability controls; winnings always respect that total.
- Two separate graphs: bars for individual outcomes, and a cumulative line for **P(prizes ≥ X)**. For example, “2 or more prizes” includes exactly 2 prizes and every higher outcome. Cumulative probabilities are shown directly in the graph; there is no target input.
- Cost per donation, total donation cost, expected tickets (2 per prize), and theoretical cost per ticket. One donation is one draw; all planned donations are charged.
- A separate interactive cost-by-wins curve: total donation cost divided by (wins × 2), showing outcomes with at least 0.1% probability and a dashed theoretical-cost reference. Includes a zero-win explanation and keyboard/touch exploration.
- Expected prize count, chance of winning 1 or more prizes, and a central 90% outcome interval.
- Calculated equal-draw-budget account comparisons and CSV download including scenario settings, probabilities, and costs at every win count.
- Responsive layout, keyboard-accessible chart tooltips, reduced-motion support, and cancellable worker calculations.

## Orders-based probability estimate

The left-hand **The winning chance** section has **Direct input** and **Calculate** tabs with one method visible at a time. Switching tabs preserves inputs and does not change the active rate. The calculator takes **total orders across all participants**, **average draws per order (coefficient)**, and **total prizes**. The coefficient can be fractional: 1.5 draws per order estimates 1,500 draws from 1,000 orders.

`estimated total draws = total orders × draws-per-order coefficient`

`estimated win probability per draw = min(1, total prizes / estimated total draws)`

This is an equal-draw estimate; account restrictions, prize-allocation rules, and shared-pool depletion can change actual odds. The estimated rate previews immediately, but all input edits remain pending until the shared **Calculate** button at the bottom of the left panel is clicked. This includes probability, total prizes, account strategy, and donation cost. The selected tab determines which probability method is used. A short Changes pending indicator appears when the selected settings differ from the displayed scenario.

In Calculate mode, the button copies the rate rounded to two decimal places and the calculator’s total prizes into the scenario, and constrains strategy draws to total orders × average draws per order. If needed, accounts are reduced while retaining draws per account; if one account alone exceeds the pool, draws per account is reduced first. Whole draws use the exact decimal product floored to an integer. After calculation, strategy inputs clamp to the applied pool and show a short Maximum hint. Editing calculator inputs releases the old draft pool constraint so a new pool and strategy can be submitted together. Direct input uses the manual probability and total prizes without a calculator draw-pool constraint.

Graphs, summaries, costs, comparisons, and exported CSV data share the last successfully calculated scenario. Changes made while calculation is running stay pending. Selecting a comparison strategy fills the strategy inputs and waits for Calculate. Reset restores and calculates the default example and selects Direct input. The calculator defaults are 1,000 orders, coefficient 2, and 100 prizes (5%).

Zero orders or a zero coefficient yields no estimate and disables Calculate only in Calculate mode. Zero prizes with positive draws yields 0%. More prizes than estimated draws yields 100% with an explanation. Counts must be integers from 0 to 1 billion; the coefficient accepts decimals from 0 to 10,000. CSV exports identify the applied input method, configuration, donation cost, and calculator inputs captured at calculation time; pending previews do not alter exports.

## Probability model

The supplied probability p is the actual chance of receiving a prize on each draw, while the account has not yet won. Once p is entered or applied from the calculator, the distribution uses it directly without a second prize-allocation step. Each account wins with probability `q = 1 - (1 - p)^draws`, with a maximum of one prize per account. Total wins follow `X ~ Binomial(accounts, q)`.

With 5% per draw, 10 draws per account, and 20 accounts, each account has a 40.1263% chance of winning and the mathematical expectation is 8.0253 prizes.

Both input methods require a total prize count. Direct input defaults to 20 prizes; applying a calculated rate copies the calculator’s total prizes into the active scenario. The result is `Y = min(X, totalPrizes)`; this combines all higher outcomes at the cap. Zero total prizes always means zero winnings. This is only a ceiling on combined winnings. It does not model a shared pool being exhausted by other participants or changing draw odds.

All probabilities and strategy comparisons are calculated directly from the binomial probability mass function, with no simulations or random sampling. The recurrence starts at the mode and normalizes, avoiding whole-distribution underflow for large populations. The cumulative line is the inclusive tail P(Y >= X), summed from the highest count down to retain very small probabilities. Chart labels, tooltips, summary cards, and the CSV column `probability_x_or_more` all include the threshold itself. All three outcome graphs show only prize counts whose individual probability is at least 0.1%; exactly 0.1% is retained. The cumulative graph uses that same set of counts and still sums all outcomes when computing X-or-more probabilities. Counts are never grouped, and omitted counts retain their numeric spacing; curves break across any gaps. The original probabilities are preserved, including hidden outcomes in cumulative sums, summaries, and CSV exports. Wide graphs scroll horizontally, initially centered around the most likely outcome. The cost summary and cost graph appear below both probability graphs. Values use floating-point arithmetic and extremely small probabilities may underflow. Percentages retain two decimal places, with inequalities for positive probabilities too close to 0 or 1 to display accurately. The likely range spans the 5th–95th percentiles of the outcome distribution; discrete outcomes may cover more than 90% probability. Integer inputs are bounded to 10,000 accounts, 1 billion prizes, and 10,000 draws per account; zero is allowed. Entries above or below the supported range are automatically clamped to the maximum or minimum, and a short hint shows that limit. The bounded value is used on the next Calculate click. Editing the input or using Reset clears the hint.

## Theoretical cost per ticket

`total donation cost = accounts × draws per account × cost per donation`

`expected tickets = 2 × expected prizes`

`theoretical cost per ticket = total donation cost / expected tickets`

Expected prizes are calculated from the binomial distribution, limited by total prizes, using the same direct calculation as the probability charts. This is long-run spending divided by expected ticket yield, not the average of per-outcome ratios (some outcomes yield zero tickets). No expected tickets is displayed as “— / No tickets expected”; free donations with positive expected yield cost zero per ticket. All amounts use the user’s input currency or units, with a default donation cost of 30.

The separate cost graph shows `total donation cost / (2 × wins)` for positive integer win counts with probability at least 0.1%, within the account/prize limit. Lower-probability outcomes are hidden from the cost curve and its interactions. Exactly 0.1% remains visible. The labeled dashed reference is total donation cost divided by expected tickets, using every outcome, including those hidden by the cutoff. CSV exports also retain every outcome. If no positive outcome meets the cutoff, the graph shows an empty-state message while the theoretical value remains available. Zero wins yields zero tickets, so no finite cost per ticket is plotted. Hover, touch, or arrow keys select a visible count.

## Validation

```sh
npm test
npm run build
# With the development server running:
npm run test:browser
```

The browser checks use Playwright and system Chromium. Set `CHROMIUM_PATH` if Chromium lives elsewhere and `APP_URL` to test another running server, including the production preview. Math tests cover known analytical cases, cumulative sums, rare and extreme parameters, fixed-odds expectations, and account and total-prize limits.

## GitHub Pages deployment

The source repository is `lst0998/luckDrawProbability`. Build for its project subpath with:

```sh
npm ci
npm run build -- --base=/luckDrawProbability/
```

Publish the contents of `dist/` (including an empty `.nojekyll` file) to the `gh-pages` branch. In repository **Settings → Pages**, choose **Deploy from a branch**, then **gh-pages / (root)**. The intended address is `https://lst0998.github.io/luckDrawProbability/`; this address works only after Pages has been enabled and its deployment has completed. The built files contain the application and its worker; no environment variables or server are required at runtime.

To check the subpath build locally, serve it with `npm run preview -- --base=/luckDrawProbability/ --port 4174 --strictPort`, then run `APP_URL=http://127.0.0.1:4174/luckDrawProbability/ npm run test:browser`.
