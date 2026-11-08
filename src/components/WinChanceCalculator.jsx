import { Calculator, ArrowUp } from 'lucide-react';
import { ESTIMATOR_LIMITS } from '../model.js';
import { NumberField } from './Controls.jsx';
import { formatProbability as percent } from '../format.js';

const number = value => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function WinChanceCalculator({ inputs, estimate, currentProbability, onChange, onApply }) {
  const field = (name, label, options = {}) => <NumberField name={name} label={label} value={inputs[name]}
    onChange={value => onChange(name, value)} limits={ESTIMATOR_LIMITS[name]} {...options}/>;

  return <section className="estimator-card" id="win-chance-calculator" aria-labelledby="estimator-title">
    <div className="estimator-heading"><Calculator size={15}/><h4 id="estimator-title">Calculate from orders</h4></div>
    <p className="estimator-help">Optional estimate using all participants’ orders.</p>
    <div className="estimator-inputs">
      {field('totalOrders', 'Total orders')}
      {field('drawsPerOrder', 'Draws per order', { allowDecimals: true, step: .1 })}
      {field('totalPrizes', 'Total prizes')}
    </div>
    <p className="estimator-help">Draws per order is the average coefficient, e.g. 1.5.</p>
    <div className="estimator-results" aria-live="polite">
      <div className="estimator-draw-count"><span>Estimated total draws</span><strong data-testid="estimated-total-draws">{number(estimate.totalDraws)}</strong></div>
      <div><span>Estimated win probability per draw</span><strong data-testid="estimated-win-probability">{estimate.probabilityPercent === null ? '—' : `${estimate.probabilityPercent.toFixed(2)}%`}</strong><small>{estimate.probabilityPercent === null ? 'Enter orders and draws above zero' : `${number(inputs.totalPrizes)} prizes ÷ ${number(estimate.totalDraws)} draws · rounded to 2 decimals`}</small></div>
      <button className="primary-button" disabled={estimate.probabilityPercent === null} onClick={() => onApply(estimate.probabilityPercent)}>Apply calculated probability<ArrowUp size={14}/></button>
    </div>
    {estimate.capped && <p className="estimator-notice">There are more prizes than estimated draws, so the estimate is capped at 100%.</p>}
    <p className="estimator-current">Entered probability: <strong data-testid="current-win-probability">{percent(currentProbability / 100)}</strong>. Edit above or apply this estimate.</p>
    <p className="estimator-help">Equal-draw estimate; account and shared-pool rules can affect actual odds.</p>
  </section>;
}
