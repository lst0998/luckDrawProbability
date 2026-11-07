import { simulate, strategies } from './model.js';
self.onmessage = ({ data: { config, seed } }) => {
  try {
    const result = simulate(config, 10000, seed);
    self.postMessage({ type: 'result', result });
    const comparisons = strategies(config).map(strategy => ({
      ...strategy,
      expected: simulate({ ...config, ...strategy }, 5000, seed).expected,
    }));
    self.postMessage({ type: 'comparisons', comparisons });
  } catch (error) { self.postMessage({ type: 'error', message: error.message }); }
};
