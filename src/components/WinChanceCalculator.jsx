import { Users } from 'lucide-react';
import { ESTIMATOR_LIMITS } from '../model.js';
import { NumberField } from './Controls.jsx';

export default function WinChanceCalculator({ inputs, estimate, onChange, resetVersion }) {
  const field = (name, label, options = {}) => <NumberField name={name} label={label} value={inputs[name]}
    onChange={value => onChange(name, value)} limits={ESTIMATOR_LIMITS[name]} resetVersion={resetVersion} {...options}/>;

  return <section className="estimator-card" id="win-chance-calculator" aria-label="Calculate from orders">
    <div className="estimator-scope"><Users size={13} aria-hidden="true"/>All participants</div>
    <div className="estimator-inputs">
      {field('totalOrders', 'Total orders')}
      {field('drawsPerOrder', 'Avg. draws / order', { allowDecimals: true, step: .1 })}
      {field('totalPrizes', 'Total prizes')}
    </div>
    <div className="estimator-results" aria-live="polite">
      <div><span>Estimated win rate per draw</span><strong data-testid="estimated-win-probability">{estimate.probabilityPercent === null ? '—' : `${estimate.probabilityPercent.toFixed(2)}%`}</strong>{estimate.probabilityPercent === null && <small>Enter orders and draws above zero</small>}</div>
    </div>
    {estimate.capped && <p className="estimator-notice">There are more prizes than estimated draws, so the estimate is capped at 100%.</p>}
    <p className="estimator-help">Equal-draw estimate; account and shared-pool rules can affect actual odds.</p>
  </section>;
}
