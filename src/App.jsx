import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, ArrowUpRight, Download, FlaskConical, X, Trophy, CircleHelp, Ticket, Check, Users, LoaderCircle } from 'lucide-react';
import { DEFAULTS, ESTIMATOR_DEFAULTS, estimateWinProbability, applyCalculator, theoreticalCosts, TICKETS_PER_PRIZE } from './model.js';
import Controls from './components/Controls.jsx';
import WinChanceCalculator from './components/WinChanceCalculator.jsx';
import CostSummary from './components/CostSummary.jsx';
import CostByWinsChart from './components/CostByWinsChart.jsx';
import OutcomeChart from './components/OutcomeChart.jsx';
import { formatProbability as percent } from './format.js';
const DEFAULT_DONATION_COST = 30;
const INITIAL_SCENARIO = { config: DEFAULTS, donationCost: DEFAULT_DONATION_COST, estimatorInputs: ESTIMATOR_DEFAULTS, method: 'direct' };
const number = value => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

function ModelDialog({ onClose }) {
  const ref = useRef(null);
  useEffect(()=>{ref.current.showModal();},[]);
  return <dialog ref={ref} onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose()}} className="model-dialog"><div className="dialog-title"><span className="icon-tile"><FlaskConical size={24}/></span><button className="icon-button" onClick={onClose} aria-label="Close explanation"><X size={20}/></button></div><h2>Calculation details</h2><p>The winning probability is your actual chance of receiving a prize per draw. Each account can win only once.</p><p>You can enter the probability directly, or estimate it from total prizes ÷ (total orders × average draws per order). Both input methods limit winnings to the total prizes available.</p><ol><li><strong>A successful draw wins a prize.</strong> Each draw is independent and has the probability you set, until that account wins. Further draws cannot earn another prize for that account.</li><li><strong>Add up your winning accounts.</strong> Competition is already reflected in the probability you supply. There is no second lottery or selection step. Your combined winnings cannot exceed the total prizes available.</li><li><strong>Calculate every outcome.</strong> Winning accounts follow a binomial distribution. We calculate each outcome directly; the separate green graph adds the chances of winning X or more prizes, including exactly X.</li></ol><div className="formula">Chance an account wins = 1 − (1 − p)<sup>d</sup><small>p = per-draw probability · d = draws per account</small><small>Total wins ~ Binomial(accounts, chance an account wins)</small></div><p className="dialog-note">Odds stay fixed while an account is eligible to win. Total prizes sets a ceiling on your winnings; shared-pool depletion and changing odds are not modeled. The likely range shows the 5th through 95th percentiles of the calculated distribution.</p><button className="primary-button full-width" onClick={onClose}>Got it<Check size={16}/></button></dialog>;
}

export default function App() {
  const [draftConfig,setDraftConfig] = useState(DEFAULTS);
  const [method,setMethod] = useState('direct');
  const [submitted,setSubmitted] = useState(INITIAL_SCENARIO);
  const [displayed,setDisplayed] = useState(INITIAL_SCENARIO);
  const { config, donationCost } = displayed;
  const [estimatorInputs,setEstimatorInputs] = useState(ESTIMATOR_DEFAULTS);
  const [draftDonationCost,setDraftDonationCost] = useState(DEFAULT_DONATION_COST);
  const [resetVersion,setResetVersion] = useState(0);
  const [result,setResult] = useState(null);
  const [comparisons,setComparisons] = useState([]);
  const [busy,setBusy] = useState(true);
  const [error,setError] = useState('');
  const [showModel,setShowModel] = useState(false);
  const [exported,setExported] = useState(false);
  useEffect(()=>{
    setBusy(true); setError('');
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
        if(data.type==='result'){setDisplayed(submitted);setResult(data.result);setComparisons(data.comparisons);setBusy(false);}
        if(data.type==='error')fail(data.message);
      };
      worker.onerror=()=>fail('The calculation could not finish. Please reset and try again.');
      worker.postMessage({config:submitted.config});
    },160);
    return ()=>{clearTimeout(timer);worker?.terminate();};
  },[submitted]);
  const update=(name,value)=>setDraftConfig(c=>({...c,[name]:value,...(method==='direct'?{poolDrawLimit:null}:{})}));
  const updateEstimator=(name,value)=>{
    setEstimatorInputs(inputs=>({...inputs,[name]:value}));
    setDraftConfig(c=>({...c,poolDrawLimit:null}));
  };
  const calculate=()=>{
    const nextConfig=method==='calculate' ? applyCalculator({...draftConfig,poolDrawLimit:null},estimatorInputs) : {...draftConfig,poolDrawLimit:null};
    setDraftConfig(nextConfig);
    setBusy(true);
    setSubmitted({config:nextConfig,donationCost:draftDonationCost,estimatorInputs:{...estimatorInputs},method});
  };
  const reset=()=>{
    setBusy(true);setDraftConfig({...DEFAULTS});setDraftDonationCost(DEFAULT_DONATION_COST);
    setEstimatorInputs({...ESTIMATOR_DEFAULTS});setMethod('direct');
    setSubmitted({...INITIAL_SCENARIO,config:{...DEFAULTS}});setResetVersion(version=>version+1);
  };
  const estimate=useMemo(()=>estimateWinProbability(estimatorInputs),[estimatorInputs]);
  const controlConfig=method==='direct'?{...draftConfig,poolDrawLimit:null}:draftConfig;
  const totalDraws=config.accounts*config.draws;
  const costs=useMemo(()=>theoreticalCosts(config,donationCost),[config,donationCost]);
  const exportCSV=()=>{
    if(!result || busy)return;
    const appliedEstimate=estimateWinProbability(displayed.estimatorInputs);
    const rows=[['Lucky Lab scenario','value'],...Object.entries(config),['input_method',displayed.method],...Object.entries(displayed.estimatorInputs).map(([key,value])=>[`calculator_${key}`,value]),['calculator_total_draws',appliedEstimate.totalDraws],['calculator_probability_percent',appliedEstimate.probabilityPercent ?? ''],['donation_cost',donationCost],['tickets_per_prize',TICKETS_PER_PRIZE],['total_donation_cost',costs.totalCost],['expected_prizes_theoretical',costs.expectedPrizes],['expected_tickets',costs.expectedTickets],['theoretical_cost_per_ticket',costs.costPerTicket ?? ''],['model','Calculated binomial probabilities; fixed draw odds; one prize per account; total prizes cap'],[],['prizes','probability','probability_x_or_more','tickets','cost_per_ticket']];
    result.probabilities.forEach((probability,k)=>rows.push([k,probability,result.atLeast[k],costs.costByWins[k].tickets,costs.costByWins[k].costPerTicket ?? '']));
    const url=URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'}));
    const a=document.createElement('a');a.href=url;a.download='lucky-lab-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setExported(true);setTimeout(()=>setExported(false),2000);
  };
  const highestComparison=Math.max(1,...comparisons.map(c=>c.expected));
  return <><main id="lab">
    <div className="workspace"><Controls config={controlConfig} onChange={update} onReset={reset} donationCost={draftDonationCost} onCostChange={setDraftDonationCost} resetVersion={resetVersion}
      method={method} onMethodChange={setMethod} onCalculate={calculate} busy={busy} calculateDisabled={busy || (method==='calculate' && estimate.probabilityPercent===null)}
      winningChanceCalculator={<WinChanceCalculator inputs={estimatorInputs} estimate={estimate} resetVersion={resetVersion}
        onChange={updateEstimator}/>}/><div className="results-column" aria-busy={busy}>
      <div className="results-topline"><div className="section-heading"><span className="live-dot"/><span>{busy?'Calculating…':'Results'}</span></div><div className="result-actions"><button className="icon-button" onClick={()=>setShowModel(true)} aria-label="Calculation details" title="Calculation details"><CircleHelp size={16}/></button><button className="text-button" onClick={exportCSV} disabled={!result||busy}>{exported?<Check size={14}/>:<Download size={14}/>} {exported?'Downloaded':'Export results'}</button></div></div>
      {error && <p role="alert" className="error-message">{error}</p>}
      <div className={`metrics ${busy?'updating':''}`}><article className="metric card featured"><div className="metric-label">Expected prizes<span className="metric-icon"><Trophy size={17}/></span></div><div className="metric-value" data-testid="expected">{result?result.expected.toFixed(2):'—'}<span>prizes</span></div></article><article className="metric card"><div className="metric-label">1 or more prizes<span className="metric-icon green"><Ticket size={17}/></span></div><div className="metric-value" data-testid="at-least-one">{result?percent(result.atLeast[1] ?? 0):'—'}</div></article><article className="metric card"><div className="metric-label">Likely prize range<span className="metric-icon peach"><Sparkles size={17}/></span></div><div className="metric-value">{result?`${result.range[0]}–${result.range[1]}`:'—'}<span>prizes</span></div></article></div>
      {result?<div className={busy?'updating':''}><OutcomeChart result={result}/></div>:<div className="card loading-state">{error?<span>No results available. Reset the example to try again.</span>:<><LoaderCircle className="spin"/>Calculating your probabilities…</>}</div>}
      <div className="cost-section" hidden={!result}>
      <CostSummary costs={costs}/>
      <CostByWinsChart costs={costs}/>
      </div>
      <section className="card comparison-card" id="strategies"><div className="card-section-header"><h2>Strategy comparison</h2><span className="small-icon"><Users size={21}/></span></div><div className="comparison-table"><div className="comparison-table-head"><span>ACCOUNTS × DRAWS</span><span>EXPECTED PRIZES</span></div>{comparisons.length?comparisons.map(row=><button key={row.accounts} className={`comparison-row ${row.accounts===config.accounts?'selected':''}`} onClick={()=>setDraftConfig(c=>({...c,accounts:row.accounts,draws:row.draws}))} aria-label={`Use ${row.accounts} accounts with ${row.draws} draws each`}><span className="strategy-name"><b>{number(row.accounts)}</b><span>×</span>{number(row.draws)}{row.accounts===config.accounts&&<i>Current</i>}</span><span className="comparison-track"><span style={{width:`${row.expected/highestComparison*100}%`}}/></span><strong>{row.expected.toFixed(2)}</strong><ArrowUpRight size={14}/></button>):<div className="comparison-empty">{totalDraws===0?'Add accounts and draws to compare strategies.':'Comparing equal draw budgets…'}</div>}</div></section>
    </div></div></main>{showModel&&<ModelDialog onClose={()=>setShowModel(false)}/>}</>;
}
