import { Calculator, ArrowDownLeft } from 'lucide-react';
import { ESTIMATOR_LIMITS } from '../model.js';
import { NumberField } from './Controls.jsx';
import { formatProbability as percent } from '../format.js';

const number = value => value.toLocaleString(undefined, { maximumSignificantDigits: 12 });

export default function WinChanceCalculator({ inputs, estimate, currentProbability, onChange, onApply }) {
  const field = (name, label, options = {}) => <NumberField name={name} label={label} value={inputs[name]}
    onChange={value => onChange(name, value)} limits={ESTIMATOR_LIMITS[name]} {...options}/>;

  return <section className="card estimator-card" id="win-chance-calculator" aria-labelledby="estimator-title">
    <div className="card-section-header">
      <div><div className="eyebrow">OPTIONAL · ESTIMATE FROM ORDERS</div><h2 id="estimator-title">Calculate the winning chance</h2><p>Use total orders from all participants and the total prizes available.</p></div>
      <span className="small-icon"><Calculator size={21}/></span>
    </div>
    <div className="estimator-inputs">
      {field('totalOrders', 'Total orders')}
      {field('drawsPerOrder', 'Draws per order (coefficient)', { allowDecimals: true, step: .1 })}
      {field('totalPrizes', 'Total prizes')}
    </div>
    <p className="estimator-help">The coefficient is the average draws per order. For example, 1.5 means 1,000 orders produce an estimated 1,500 draws.</p>
    <div className="estimator-results" aria-live="polite">
      <div><span>Estimated total draws</span><strong data-testid="estimated-total-draws">{number(estimate.totalDraws)}</strong><small>{number(inputs.totalOrders)} orders × {number(inputs.drawsPerOrder)} draws</small></div>
      <div><span>Estimated win probability per draw</span><strong data-testid="estimated-win-probability">{estimate.probability === null ? '—' : percent(estimate.probability)}</strong><small>{estimate.probability === null ? 'Enter orders and draws above zero' : `${number(inputs.totalPrizes)} prizes ÷ ${number(estimate.totalDraws)} draws`}</small></div>
      <button className="primary-button" disabled={estimate.probability === null} onClick={() => onApply(estimate.probability * 100)}>Apply calculated probability<ArrowDownLeft size={14}/></button>
    </div>
    {estimate.capped && <p className="estimator-notice">There are more prizes than estimated draws, so the estimate is capped at 100%.</p>}
    <p className="estimator-current">Current per-draw probability: <strong data-testid="current-win-probability">{percent(currentProbability / 100)}</strong>. You can enter it directly in settings or apply this estimate.</p>
    <p className="estimator-help">Prizes ÷ estimated draws assumes equally likely draws. Account limits and a shared pool can affect the actual odds. Editing this calculator updates the estimate; Apply updates your charts.</p>
  </section>;
}
