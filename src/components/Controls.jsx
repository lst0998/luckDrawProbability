import { useState, useEffect } from 'react';
import { Minus, Plus, SlidersHorizontal, Users, Ticket, RotateCcw, ArrowRight, Info, PencilLine, Calculator } from 'lucide-react';
import { LIMITS, COST_LIMITS, strategyLimits } from '../model.js';

export function NumberField({ label, value, onChange, name, suffix, step = 1, limits, allowDecimals = false, disabled = false, resetVersion = 0 }) {
  const [draft, setDraft] = useState(String(value));
  const [limitNotice, setLimitNotice] = useState(null);
  const [min, max] = limits ?? LIMITS[name];
  const decimals = allowDecimals || name === 'probability' || name === 'donationCost';
  const valid = n => Number.isFinite(n) && n >= min && n <= max && (decimals || Number.isInteger(n));
  const invalid = !disabled && draft.trim() !== '' && !valid(Number(draft));
  const format = n => `${Number.isInteger(n) ? n.toLocaleString() : String(n)}${suffix ?? ''}`;
  const hint = invalid ? (!Number.isFinite(Number(draft)) ? `Enter ${format(min)}–${format(max)}.` : 'Enter a whole number.')
    : !disabled && limitNotice?.value === value ? limitNotice.text : '';
  const hintId = `${name}-${invalid ? 'error' : 'hint'}`;
  useEffect(() => {
    setDraft(String(value));
    setLimitNotice(notice => notice?.value === value ? notice : null);
  }, [value, resetVersion]);
  useEffect(() => setLimitNotice(null), [resetVersion, min, max]);
  const update = (raw) => {
    setDraft(raw);
    setLimitNotice(null);
    if (raw.trim() === '') return;
    const n = Number(raw);
    if (Number.isFinite(n) && (n < min || n > max)) {
      const bounded = Math.max(min, Math.min(max, n));
      setDraft(String(bounded));
      setLimitNotice({ value: bounded, text: n > max ? `Maximum: ${format(max)}.` : `Minimum: ${format(min)}.` });
      onChange(bounded);
      return;
    }
    if (valid(n)) onChange(n);
  };
  return <div className={`number-field${invalid ? ' has-error' : hint ? ' has-hint' : ''}${disabled ? ' is-disabled' : ''}`}><label htmlFor={name}>{label}</label><div className="number-input">
    <button type="button" onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} disabled={disabled || value <= min} aria-label={`Decrease ${label.toLowerCase()}`}><Minus size={13}/></button>
    <input id={name} type="number" inputMode="decimal" min={min} max={max} step={step} value={draft} disabled={disabled} aria-invalid={invalid || undefined} aria-describedby={hint ? hintId : undefined} onChange={e => update(e.target.value)} onBlur={() => setDraft(String(value))}/>
    {suffix && <span>{suffix}</span>}
    <button type="button" onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))} disabled={disabled || value >= max} aria-label={`Increase ${label.toLowerCase()}`}><Plus size={13}/></button>
  </div>{hint && <span className={invalid ? 'number-error' : 'number-hint'} id={hintId} role={invalid ? 'alert' : 'status'}>{hint}</span>}</div>;
}
export default function Controls({ config, onChange, onReset, donationCost, onCostChange, winningChanceCalculator, resetVersion }) {
  const [method, setMethod] = useState('direct');
  const strategyBounds = strategyLimits(config);
  const switchWithKeyboard = event => {
    const next = { ArrowLeft: method === 'direct' ? 'calculate' : 'direct', ArrowRight: method === 'direct' ? 'calculate' : 'direct', Home: 'direct', End: 'calculate' }[event.key];
    if (!next) return;
    event.preventDefault();
    setMethod(next);
    event.currentTarget.parentElement.querySelector(`#probability-tab-${next}`).focus();
  };
  const field = (name, label, options = {}) => <NumberField key={name} name={name} label={label} value={config[name]} onChange={v => onChange(name, v)} resetVersion={resetVersion} {...options}/>;
  return <aside className="control-panel card" aria-label="Scenario settings">
    <div className="panel-title"><div><SlidersHorizontal size={17}/><h2>Set the scene</h2></div><button className="icon-button" onClick={() => { setMethod('direct'); onReset(); }} title="Reset to example" aria-label="Reset to example"><RotateCcw size={15}/></button></div>
    <div className="control-section" id="winning-chance-settings"><div className="section-heading"><span className="step-number">01</span><h3>The winning chance</h3></div>
      <div className="chance-method-tabs" role="tablist" aria-label="Winning probability method">
        <button type="button" role="tab" id="probability-tab-direct" aria-controls="probability-panel-direct" aria-selected={method === 'direct'} tabIndex={method === 'direct' ? 0 : -1} onClick={() => setMethod('direct')} onKeyDown={switchWithKeyboard}><PencilLine size={15} aria-hidden="true"/>Direct input</button>
        <button type="button" role="tab" id="probability-tab-calculate" aria-controls="probability-panel-calculate" aria-selected={method === 'calculate'} tabIndex={method === 'calculate' ? 0 : -1} onClick={() => setMethod('calculate')} onKeyDown={switchWithKeyboard}><Calculator size={15} aria-hidden="true"/>Calculate</button>
      </div>
      <div className="chance-method-panel" id="probability-panel-direct" role="tabpanel" aria-labelledby="probability-tab-direct" hidden={method !== 'direct'}>
        <NumberField name="probability" label="Win probability per draw" value={config.probability} onChange={v => onChange('probability', v)} suffix="%" step={.5} resetVersion={resetVersion}/>
        <input className="slider" aria-label="Win probability slider" type="range" min="0" max="100" step=".5" value={config.probability} onChange={e => onChange('probability', Number(e.target.value))} style={{'--progress':`${config.probability}%`}}/>
        <div className="range-labels"><span>0%</span><span>50%</span><span>100%</span></div>
        {field('prizes', 'Total prizes')}
      </div>
      <div className="chance-method-panel" id="probability-panel-calculate" role="tabpanel" aria-labelledby="probability-tab-calculate" hidden={method !== 'calculate'}>{winningChanceCalculator}</div>
    </div>
    <div className="control-section"><div className="section-heading"><span className="step-number">02</span><h3>Your strategy</h3><Users size={15}/></div>
      {field('accounts', 'Your accounts', { limits: strategyBounds.accounts })}{field('draws', 'Draws per account', { limits: strategyBounds.draws })}
      <NumberField name="donationCost" label="Cost per donation" value={donationCost} onChange={onCostChange} step={.01} limits={COST_LIMITS} resetVersion={resetVersion}/>
      <p className="field-note">One donation = one draw. Each prize contains 2 tickets.</p>
      <div className="budget"><Ticket size={18}/><div><strong>{(config.accounts * config.draws).toLocaleString()}</strong><span>total draws</span></div><span className="budget-equation">{config.accounts.toLocaleString()} × {config.draws.toLocaleString()}</span></div>
      {config.poolDrawLimit != null && <p className="field-note" data-testid="strategy-draw-limit">Maximum: {config.poolDrawLimit.toLocaleString()} total draws</p>}
      <p className="field-note"><Info size={12}/>Each account can win one prize, at most.</p>
    </div>
    <div className="panel-footer"><span className="live-dot"/>Changes update your results automatically<ArrowRight size={13}/></div>
  </aside>;
}
