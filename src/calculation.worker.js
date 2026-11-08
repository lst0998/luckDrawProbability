import { calculate, strategies } from './model.js';
self.onmessage = ({ data: { config } }) => {
  try {
    self.postMessage({ type: 'result', result: calculate(config) });
    const comparisons = strategies(config).map(strategy => ({
      ...strategy,
      expected: calculate({ ...config, ...strategy }).expected,
    }));
    self.postMessage({ type: 'comparisons', comparisons });
  } catch (error) { self.postMessage({ type: 'error', message: error.message }); }
};
