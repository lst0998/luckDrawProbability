import { useState, useEffect } from 'react';
import { Minus, Plus, SlidersHorizontal, Users, Ticket, Gift, RotateCcw, ArrowRight, Info } from 'lucide-react';
import { LIMITS, COST_LIMITS } from '../model.js';

function NumberField({ label, value, onChange, name, suffix, step = 1, limits }) {
  const [draft, setDraft] = useState(String(value));
  const [min, max] = limits ?? LIMITS[name];
  useEffect(() => setDraft(String(value)), [value]);
  const update = (raw) => {
    setDraft(raw);
    if (raw.trim() === '') return;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= min && n <= max && (name === 'probability' || name === 'donationCost' || Number.isInteger(n))) onChange(n);
  };
  return <div className="number-field"><label htmlFor={name}>{label}</label><div className="number-input">
    <button type="button" onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} disabled={value <= min} aria-label={`Decrease ${label.toLowerCase()}`}><Minus size={13}/></button>
    <input id={name} type="number" inputMode="decimal" min={min} max={max} step={step} value={draft} onChange={e => update(e.target.value)} onBlur={() => setDraft(String(value))}/>
    {suffix && <span>{suffix}</span>}
    <button type="button" onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))} disabled={value >= max} aria-label={`Increase ${label.toLowerCase()}`}><Plus size={13}/></button>
  </div></div>;
}
export default function Controls({ config, onChange, onReset, donationCost, onCostChange }) {
  const field = (name, label) => <NumberField key={name} name={name} label={label} value={config[name]} onChange={v => onChange(name, v)}/>;
  return <aside className="control-panel card" aria-label="Scenario settings">
    <div className="panel-title"><div><SlidersHorizontal size={17}/><h2>Set the scene</h2></div><button className="icon-button" onClick={onReset} title="Reset to example" aria-label="Reset to example"><RotateCcw size={15}/></button></div>
    <div className="control-section"><div className="section-heading"><span className="step-number">01</span><h3>The winning chance</h3></div>
      <NumberField name="probability" label="Win probability per draw" value={config.probability} onChange={v => onChange('probability', v)} suffix="%" step={.5}/>
      <input className="slider" aria-label="Win probability slider" type="range" min="0" max="100" step=".5" value={config.probability} onChange={e => onChange('probability', Number(e.target.value))} style={{'--progress':`${config.probability}%`}}/>
      <div className="range-labels"><span>0%</span><span>50%</span><span>100%</span></div>
      <p className="field-note">Your actual chance of receiving a prize on each draw, until that account wins.</p>
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
      {config.limitPrizes && field('prizes', 'Maximum prizes')}
      <p className="field-note">An optional ceiling on your combined winnings. Off by default; this does not model how a shared pool runs out.</p>
    </div>
    <div className="panel-footer"><span className="live-dot"/>Changes update your results automatically<ArrowRight size={13}/></div>
  </aside>;
}
