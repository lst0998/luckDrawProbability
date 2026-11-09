import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, ArrowUpRight, Download, FlaskConical, X, Trophy, CircleHelp, Ticket, Check, Users, Lightbulb, LoaderCircle, Dices } from 'lucide-react';
import { DEFAULTS, ESTIMATOR_DEFAULTS, estimateWinProbability, accountWinChance, theoreticalCosts, TICKETS_PER_PRIZE } from './model.js';
import Controls from './components/Controls.jsx';
import WinChanceCalculator from './components/WinChanceCalculator.jsx';
import CostSummary from './components/CostSummary.jsx';
import CostByWinsChart from './components/CostByWinsChart.jsx';
import OutcomeChart from './components/OutcomeChart.jsx';
import { formatProbability as percent } from './format.js';
const DEFAULT_DONATION_COST = 30;
const number = value => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

function ModelDialog({ onClose }) {
  const ref = useRef(null);
  useEffect(()=>{ref.current.showModal();},[]);
  return <dialog ref={ref} onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose()}} className="model-dialog"><div className="dialog-title"><span className="icon-tile"><FlaskConical size={24}/></span><button className="icon-button" onClick={onClose} aria-label="Close explanation"><X size={20}/></button></div><div className="eyebrow">A LOOK UNDER THE HOOD</div><h2>Your odds. Your accounts.</h2><p>The winning probability is your actual chance of receiving a prize per draw. Each account can win only once.</p><p>You can enter the probability directly, or estimate it from total prizes ÷ (total orders × average draws per order). Applying that estimate uses the same fixed-odds model below.</p><ol><li><strong>A successful draw wins a prize.</strong> Each draw is independent and has the probability you set, until that account wins. Further draws cannot earn another prize for that account.</li><li><strong>Add up your winning accounts.</strong> Competition is already reflected in the probability you supply. There is no second lottery or selection step. If you enable the optional prize limit, we cap your combined winnings at that number.</li><li><strong>Calculate every outcome.</strong> Winning accounts follow a binomial distribution. We calculate each outcome directly; the separate green graph adds the chances of winning X or more prizes, including exactly X.</li></ol><div className="formula">Chance an account wins = 1 − (1 − p)<sup>d</sup><small>p = per-draw probability · d = draws per account</small><small>Total wins ~ Binomial(accounts, chance an account wins)</small></div><p className="dialog-note">Odds stay fixed while an account is eligible to win. The optional cap is a ceiling on your total, not a model of a shared pool being depleted or changing odds. The likely range shows the 5th through 95th percentiles of the calculated distribution.</p><button className="primary-button full-width" onClick={onClose}>Got it<Check size={16}/></button></dialog>;
}

export default function App() {
  const [config,setConfig] = useState(DEFAULTS);
  const [estimatorInputs,setEstimatorInputs] = useState(ESTIMATOR_DEFAULTS);
  const [donationCost,setDonationCost] = useState(DEFAULT_DONATION_COST);
  const [resetVersion,setResetVersion] = useState(0);
  const [result,setResult] = useState(null);
  const [comparisons,setComparisons] = useState([]);
  const [busy,setBusy] = useState(true);
  const [error,setError] = useState('');
  const [showModel,setShowModel] = useState(false);
  const [exported,setExported] = useState(false);
  useEffect(()=>{
    setBusy(true); setError(''); setComparisons([]);
    let worker;
    const fail = message => {
      setResult(null);
      setComparisons([]);
      setError(message);
      setBusy(false);
    };
    const timer=setTimeout(()=>{
      worker=new Worker(new URL('./calculation.worker.js',import.meta.url),{type:'module'});
      worker.onmessage=({data})=>{
        if(data.type==='result'){setResult(data.result);setBusy(false);}
        if(data.type==='comparisons')setComparisons(data.comparisons);
        if(data.type==='error')fail(data.message);
      };
      worker.onerror=()=>fail('The calculation could not finish. Please reset and try again.');
      worker.postMessage({config});
    },160);
    return ()=>{clearTimeout(timer);worker?.terminate();};
  },[config]);
  const update=(name,value)=>{setBusy(true);setConfig(c=>({...c,[name]:value}));};
  const reset=()=>{setBusy(true);setConfig({...DEFAULTS});setDonationCost(DEFAULT_DONATION_COST);setEstimatorInputs({...ESTIMATOR_DEFAULTS});setResetVersion(version=>version+1);};
  const estimate=useMemo(()=>estimateWinProbability(estimatorInputs),[estimatorInputs]);
  const totalDraws=config.accounts*config.draws;
  const costs=useMemo(()=>theoreticalCosts(config,donationCost),[config,donationCost]);
  const ownChance=accountWinChance(config.probability,config.draws);
  const expectedUncapped=config.accounts*ownChance;
  const zeroCap=config.limitPrizes && config.prizes===0;
  const exportCSV=()=>{
    if(!result || busy)return;
    const rows=[['Lucky Lab scenario','value'],...Object.entries(config),...Object.entries(estimatorInputs).map(([key,value])=>[`calculator_${key}`,value]),['calculator_total_draws',estimate.totalDraws],['calculator_probability_percent',estimate.probabilityPercent ?? ''],['donation_cost',donationCost],['tickets_per_prize',TICKETS_PER_PRIZE],['total_donation_cost',costs.totalCost],['expected_prizes_theoretical',costs.expectedPrizes],['expected_tickets',costs.expectedTickets],['theoretical_cost_per_ticket',costs.costPerTicket ?? ''],['model','Calculated binomial probabilities; fixed draw odds; one prize per account; optional total cap'],[],['prizes','probability','probability_x_or_more','tickets','cost_per_ticket']];
    result.probabilities.forEach((probability,k)=>rows.push([k,probability,result.atLeast[k],costs.costByWins[k].tickets,costs.costByWins[k].costPerTicket ?? '']));
    const url=URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'}));
    const a=document.createElement('a');a.href=url;a.download='lucky-lab-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setExported(true);setTimeout(()=>setExported(false),2000);
  };
  const highestComparison=Math.max(1,...comparisons.map(c=>c.expected));
  return <><header className="site-header"><div className="header-inner"><a className="brand" href="#" aria-label="Lucky Lab home"><span className="brand-mark"><Sparkles size={23} strokeWidth={1.8}/></span>lucky<span>lab</span><span className="beta">BETA</span></a><nav><a className="nav-link active" href="#lab"><FlaskConical size={15}/>Probability lab</a><button className="nav-link" onClick={()=>setShowModel(true)}>How it works<ArrowUpRight size={14}/></button></nav><div className="header-note"><span className="live-dot"/>A playground for probability</div></div></header>
    <main id="lab"><section className="intro"><div><div className="eyebrow"><span/>LESS GUESSWORK. MORE POSSIBILITIES.</div><h1>Make sense of your <span>luck.<svg viewBox="0 0 115 12" aria-hidden="true"><path d="M2 8Q55 0 112 6" fill="none" stroke="#c1b1f2" strokeWidth="5" strokeLinecap="round"/></svg></span></h1><p>One prize per account. A world of possibilities.<br className="mobile-break"/> Explore your odds before you draw.</p></div><div className="intro-art" aria-hidden="true"><span className="art-orbit orbit-one"/><span className="art-orbit orbit-two"/><span className="art-star star-one">✦</span><span className="art-star star-two">✧</span><div className="ticket-art"><Ticket size={38} strokeWidth={1.3}/><span>GOOD<br/>FORTUNE</span><i/></div><div className="dice-art"><Dices size={35} strokeWidth={1.5}/></div></div></section>
    <div className="workspace"><Controls config={config} onChange={update} onReset={reset} donationCost={donationCost} onCostChange={setDonationCost} resetVersion={resetVersion}
      winningChanceCalculator={<WinChanceCalculator inputs={estimatorInputs} estimate={estimate} resetVersion={resetVersion}
        onChange={(name,value)=>setEstimatorInputs(inputs=>({...inputs,[name]:value}))} onApply={value=>update('probability',value)}/>}/><div className="results-column" aria-busy={busy}>
      <div className="results-topline"><div className="section-heading"><span className="live-dot"/><span>{busy?'Exploring the possibilities…':'Your results, at a glance'}</span></div><button className="text-button" onClick={exportCSV} disabled={!result||busy}>{exported?<Check size={14}/>:<Download size={14}/>} {exported?'Downloaded':'Export results'}</button></div>
      {error && <p role="alert" className="error-message">{error}</p>}
      <div className={`metrics ${busy?'updating':''}`}><article className="metric card featured"><div className="metric-label">Expected prizes<span className="metric-icon"><Trophy size={17}/></span></div><div className="metric-value" data-testid="expected">{result?result.expected.toFixed(2):'—'}<span>prizes</span></div><p>Calculated mathematical expectation</p></article><article className="metric card"><div className="metric-label">1 or more prizes<span className="metric-icon green"><Ticket size={17}/></span></div><div className="metric-value" data-testid="at-least-one">{result?percent(result.atLeast[1] ?? 0):'—'}</div><p>Chance of taking something home</p></article><article className="metric card"><div className="metric-label">Your likely range<span className="metric-icon peach"><Sparkles size={17}/></span></div><div className="metric-value">{result?`${result.range[0]}–${result.range[1]}`:'—'}<span>prizes</span></div><p>5th–95th percentile outcomes</p></article></div>
      {result?<div className={busy?'updating':''}><OutcomeChart result={result}/></div>:<div className="card loading-state">{error?<span>No results available. Reset the example to try again.</span>:<><LoaderCircle className="spin"/>Calculating your probabilities…</>}</div>}
      <div className="cost-section">
      <CostSummary costs={costs} donationCost={donationCost}/>
      <CostByWinsChart costs={costs}/>
      </div>
      <div className="insight"><span className="insight-icon"><Lightbulb size={21}/></span><div><strong>{zeroCap?'Your prize limit is zero.':config.accounts===0?'Add an account to join the draw.':ownChance===0?'No successful draws, no prizes.':'One win per account. Every draw counts.'}</strong><p>{zeroCap?'Raise the limit or turn it off to explore potential wins.':config.accounts===0?'Each account can win one prize, so your account count sets your maximum.':ownChance===0?'Increase the draw count or winning probability to explore winning outcomes.':<>Each account has a <b>{percent(ownChance)}</b> chance of winning. With <b>{number(config.accounts)}</b> accounts, the mathematical expectation is <b>{number(expectedUncapped)}</b> prizes{config.limitPrizes?<> before applying your <b>{number(config.prizes)}</b>-prize cap</>:''}.</>}</p></div></div>
      <section className="card comparison-card" id="strategies"><div className="card-section-header"><div><div className="eyebrow">SAME DRAWS. DIFFERENT STRATEGY.</div><h2>Find your balance</h2><p>Split your {number(totalDraws)} draws across different numbers of accounts.</p></div><span className="small-icon"><Users size={21}/></span></div><div className="comparison-table"><div className="comparison-table-head"><span>ACCOUNTS × DRAWS</span><span>EXPECTED PRIZES</span></div>{comparisons.length?comparisons.map(row=><button key={row.accounts} className={`comparison-row ${row.accounts===config.accounts?'selected':''}`} onClick={()=>{setBusy(true);setConfig(c=>({...c,accounts:row.accounts,draws:row.draws}));}} aria-label={`Use ${row.accounts} accounts with ${row.draws} draws each`}><span className="strategy-name"><b>{number(row.accounts)}</b><span>×</span>{number(row.draws)}{row.accounts===config.accounts&&<i>Current</i>}</span><span className="comparison-track"><span style={{width:`${row.expected/highestComparison*100}%`}}/></span><strong>{row.expected.toFixed(2)}</strong><ArrowUpRight size={14}/></button>):<div className="comparison-empty">{totalDraws===0?'Add accounts and draws to compare strategies.':'Comparing equal draw budgets…'}</div>}</div><p className="comparison-note">One prize per account means spreading draws can help. Each expected value is calculated from the same probability model. Click a strategy to try it.</p></section>
      <div className="method-note"><CircleHelp size={15}/><p>Calculated probabilities describe possible outcomes, not a guaranteed result. Draws use a fixed, independent win probability and each account can win once. The optional total cap applies only when enabled. <button onClick={()=>setShowModel(true)}>Understand the model<ArrowUpRight size={12}/></button></p></div>
    </div></div><footer><span className="footer-brand"><Sparkles size={14}/>lucky lab</span><span>Built for curiosity. Powered by probability.</span><button onClick={()=>setShowModel(true)}>A note on the math<ArrowUpRight size={12}/></button></footer></main>{showModel&&<ModelDialog onClose={()=>setShowModel(false)}/>}</>;
}
