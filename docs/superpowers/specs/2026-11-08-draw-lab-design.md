# Lucky Draw Lab

Build a responsive interactive website explaining prize outcomes across multiple accounts. User requirements: independent chance per draw, adjustable own accounts and draws per account, a shared finite prize pool, other participants, and one prize maximum per account. Cumulative probabilities (including winning more than one prize) belong directly in the graph, without a target control.

Implementation decisions: React and Vite, local calculations in a worker, no backend or credentials. A calculator dashboard with purple distribution bars and a teal cumulative line, scenario controls, summary metrics, a repeated experiment, and equal-budget account comparisons. Show the user's example of 20 accounts × 10 draws initially.

Model assumption: every account gets its allotted independent draws; an account qualifies if at least one succeeds. If more accounts qualify than prizes, select a uniformly random subset of qualified accounts. This is a round-end lottery; it does not model chronological prize depletion, fixed guaranteed winners, or changing draw odds. Other accounts use the same per-draw probability and have an independently adjustable draw count. Report Monte Carlo results as estimates; per-account qualification probability is exact. No external participant knowledge is implied.

Approaches considered: exact independent binomial calculator is insufficient for the shared pool; exhaustive shared-pool enumeration grows too quickly; Monte Carlo with exact binomial and hypergeometric sampling supports responsive exploration and transparent uncertainty. Selected the latter as an implementation decision. No deployment requested.
