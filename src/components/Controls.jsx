import { useState, useEffect } from 'react';
import { Minus, Plus, SlidersHorizontal, Users, Ticket, Gift, RotateCcw, ArrowRight, Info, PencilLine, Calculator } from 'lucide-react';
import { LIMITS, COST_LIMITS } from '../model.js';

export function NumberField({ label, value, onChange, name, suffix, step = 1, limits, allowDecimals = false, disabled = false }) {
  const [draft, setDraft] = useState(String(value));
  const [min, max] = limits ?? LIMITS[name];
  const decimals = allowDecimals || name === 'probability' || name === 'donationCost';
  const valid = n => Number.isFinite(n) && n >= min && n <= max && (decimals || Number.isInteger(n));
  const invalid = !disabled && draft.trim() !== '' && !valid(Number(draft));
  const rangeError = !Number.isFinite(Number(draft)) || Number(draft) < min || Number(draft) > max;
  useEffect(() => setDraft(String(value)), [value]);
  const update = (raw) => {
    setDraft(raw);
    if (raw.trim() === '') return;
    const n = Number(raw);
    if (valid(n)) onChange(n);
  };
  return <div className={`number-field${invalid ? ' has-error' : ''}${disabled ? ' is-disabled' : ''}`}><label htmlFor={name}>{label}</label><div className="number-input">
    <button type="button" onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} disabled={disabled || value <= min} aria-label={`Decrease ${label.toLowerCase()}`}><Minus size={13}/></button>
    <input id={name} type="number" inputMode="decimal" min={min} max={max} step={step} value={draft} disabled={disabled} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${name}-error` : undefined} onChange={e => update(e.target.value)} onBlur={() => setDraft(String(value))}/>
    {suffix && <span>{suffix}</span>}
    <button type="button" onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))} disabled={disabled || value >= max} aria-label={`Increase ${label.toLowerCase()}`}><Plus size={13}/></button>
  </div>{invalid && <span className="number-error" id={`${name}-error`} role="alert">{rangeError ? `Enter ${min.toLocaleString()}–${max.toLocaleString()}.` : 'Enter a whole number.'}</span>}</div>;
}
export default function Controls({ config, onChange, onReset, donationCost, onCostChange, winningChanceCalculator }) {
  const [method, setMethod] = useState('direct');
  const switchWithKeyboard = event => {
    const next = { ArrowLeft: method === 'direct' ? 'calculate' : 'direct', ArrowRight: method === 'direct' ? 'calculate' : 'direct', Home: 'direct', End: 'calculate' }[event.key];
    if (!next) return;
    event.preventDefault();
    setMethod(next);
    event.currentTarget.parentElement.querySelector(`#probability-tab-${next}`).focus();
  };
  const field = (name, label, options = {}) => <NumberField key={name} name={name} label={label} value={config[name]} onChange={v => onChange(name, v)} {...options}/>;
  return <aside className="control-panel card" aria-label="Scenario settings">
    <div className="panel-title"><div><SlidersHorizontal size={17}/><h2>Set the scene</h2></div><button className="icon-button" onClick={() => { setMethod('direct'); onReset(); }} title="Reset to example" aria-label="Reset to example"><RotateCcw size={15}/></button></div>
    <div className="control-section" id="winning-chance-settings"><div className="section-heading"><span className="step-number">01</span><h3>The winning chance</h3></div>
      <div className="chance-method-tabs" role="tablist" aria-label="Winning probability method">
        <button type="button" role="tab" id="probability-tab-direct" aria-controls="probability-panel-direct" aria-selected={method === 'direct'} tabIndex={method === 'direct' ? 0 : -1} onClick={() => setMethod('direct')} onKeyDown={switchWithKeyboard}><PencilLine size={15} aria-hidden="true"/>Direct input</button>
        <button type="button" role="tab" id="probability-tab-calculate" aria-controls="probability-panel-calculate" aria-selected={method === 'calculate'} tabIndex={method === 'calculate' ? 0 : -1} onClick={() => setMethod('calculate')} onKeyDown={switchWithKeyboard}><Calculator size={15} aria-hidden="true"/>Calculate</button>
      </div>
      <div className="chance-method-panel" id="probability-panel-direct" role="tabpanel" aria-labelledby="probability-tab-direct" hidden={method !== 'direct'}>
        <NumberField name="probability" label="Win probability per draw" value={config.probability} onChange={v => onChange('probability', v)} suffix="%" step={.5}/>
        <input className="slider" aria-label="Win probability slider" type="range" min="0" max="100" step=".5" value={config.probability} onChange={e => onChange('probability', Number(e.target.value))} style={{'--progress':`${config.probability}%`}}/>
        <div className="range-labels"><span>0%</span><span>50%</span><span>100%</span></div>
      </div>
      <div className="chance-method-panel" id="probability-panel-calculate" role="tabpanel" aria-labelledby="probability-tab-calculate" hidden={method !== 'calculate'}>{winningChanceCalculator}</div>
    </div>
    <div className="control-section"><div className="section-heading"><span className="step-number">02</span><h3>Your strategy</h3><Users size={15}/></div>
      {field('accounts', 'Your accounts')}{field('draws', 'Draws per account')}
      <NumberField name="donationCost" label="Cost per donation" value={donationCost} onChange={onCostChange} step={.01} limits={COST_LIMITS}/>
      <p className="field-note">One donation = one draw. Each prize contains 2 tickets.</p>
      <div className="budget"><Ticket size={18}/><div><strong>{(config.accounts * config.draws).toLocaleString()}</strong><span>total draws</span></div><span className="budget-equation">{config.accounts.toLocaleString()} × {config.draws.toLocaleString()}</span></div>
      <p className="field-note"><Info size={12}/>Each account can win one prize, at most.</p>
    </div>
    <div className="control-section"><div className="section-heading"><span className="step-number">03</span><h3>Optional prize limit</h3><Gift size={15}/></div>
      <label className="cap-toggle"><input type="checkbox" checked={config.limitPrizes} onChange={e => onChange('limitPrizes', e.target.checked)}/>Limit total prizes</label>
      {field('prizes', 'Total prizes', { disabled: !config.limitPrizes })}
      <p className="field-note">An optional ceiling on your combined winnings. Off by default; this does not model how a shared pool runs out.</p>
    </div>
    <div className="panel-footer"><span className="live-dot"/>Changes update your results automatically<ArrowRight size={13}/></div>
  </aside>;
}
