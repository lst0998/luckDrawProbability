import { useEffect, useMemo, useRef, useState } from 'react';
import { ChartNoAxesColumnIncreasing, TrendingDown } from 'lucide-react';
import { formatProbability as pct } from '../format.js';

function ProbabilityPlot({ result, cumulative = false }) {
  const [active, setActive] = useState(null);
  const chartRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(760);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setChartWidth(Math.max(260, entry.contentRect.width)));
    if (chartRef.current) observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);

  const bins = useMemo(() => {
    let last = result.histogram.findLastIndex(x => x > 0);
    last = Math.min(result.histogram.length - 1, Math.max(4, last));
    const labelWidth = last > 99 ? 60 : last > 20 ? 42 : 20;
    const maxBins = Math.max(4, Math.min(24, Math.floor((chartWidth - 75) / labelWidth)));
    const width = Math.max(1, Math.ceil((last + 1) / maxBins));
    const out = [];
    for (let lo = 0; lo <= last; lo += width) {
      const hi = Math.min(last, lo + width - 1);
      const chance = result.histogram.slice(lo, hi + 1).reduce((a, b) => a + b, 0) / result.trials;
      out.push({ lo, hi, chance, tail: result.atLeast[hi], label: lo === hi ? String(lo) : `${lo}–${hi}` });
    }
    return out;
  }, [result, chartWidth]);

  const W = chartWidth, H = chartWidth < 450 ? 230 : 270;
  const left = 43, right = 20, top = 23, bottom = 42;
  const plotW = W - left - right, plotH = H - top - bottom;
  const maxY = cumulative ? 1 : Math.min(1, Math.max(.1, Math.ceil(Math.max(...bins.map(b => b.chance)) * 20) / 20));
  const unit = plotW / bins.length;
  const x = i => left + unit * (i + .5);
  const y = probability => top + plotH * (1 - probability / maxY);
  const current = active === null ? null : bins[active];
  const grouped = bins.some(bin => bin.lo !== bin.hi);
  const linePath = bins.map((b, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(b.tail)}`).join(' ');
  const areaPath = `${linePath} L ${x(bins.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`;
  const outcomeLabel = bin => cumulative
    ? `${bin.hi} or more prizes`
    : `${bin.lo === bin.hi ? 'Exactly' : 'Between'} ${bin.label} ${bin.lo === 1 && bin.hi === 1 ? 'prize' : 'prizes'}`;

  return (
    <section className={`card outcome-card ${cumulative ? 'cumulative-card' : 'individual-card'}`} id={cumulative ? 'cumulative-outcomes' : 'outcomes'}>
      <div className="chart-header">
        <div>
          <div className="eyebrow">{cumulative ? 'YOUR CUMULATIVE CHANCES' : 'YOUR POSSIBLE OUTCOMES'}</div>
          <h2>{cumulative ? 'Chance of winning X or more prizes' : 'What could you win?'}</h2>
          <p>{cumulative ? 'Includes exactly X prizes and every higher outcome.' : 'The chance of each individual prize outcome.'}</p>
        </div>
        <span className="pill"><span className="live-dot"/>{result.trials.toLocaleString()} rounds</span>
      </div>

      <div className="chart-legend">
        <span className="chart-legend-label">
          <span className={cumulative ? 'legend-line' : 'legend-square'}/>
          {cumulative ? 'Chance of winning X or more prizes' : grouped ? 'Chance of prizes in this range' : 'Chance of winning exactly this many prizes'}
        </span>
      </div>

      <div className="chart-wrap" ref={chartRef} onMouseLeave={() => setActive(null)}>
        <div className="axis-headings"><span>{cumulative ? 'Cumulative probability' : 'Individual probability'}</span></div>
        <svg className="outcome-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={cumulative ? 'Cumulative probability of winning X or more prizes' : 'Probability of each individual prize outcome'}>
          <defs>
            {cumulative ? <linearGradient id="cumulativeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a9c83" stopOpacity=".13"/><stop offset="100%" stopColor="#3a9c83" stopOpacity=".02"/></linearGradient>
              : <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8f78e7"/><stop offset="100%" stopColor="#b5a3ee"/></linearGradient>}
          </defs>
          {[0, 1, 2, 3, 4].map(i => <g key={i}>
            <line x1={left} x2={W - right} y1={top + plotH * i / 4} y2={top + plotH * i / 4} stroke="#eaeaf0" strokeDasharray={i === 4 ? '0' : '3 5'}/>
            <text x={left - 12} y={top + plotH * i / 4 + 4} textAnchor="end" className={`axis-text ${cumulative ? 'green-axis' : ''}`}>{Math.round(maxY * 100 * (1 - i / 4))}%</text>
          </g>)}
          {bins.map((bin, i) => <g key={i}>
            {active === i && <rect x={left + i * unit} y={top} width={unit} height={plotH} fill={cumulative ? '#edf6f1' : '#f1eefb'}/>}
            {!cumulative && <rect x={x(i) - unit * .29} y={y(bin.chance)} width={unit * .58} height={plotH * bin.chance / maxY} rx="5" fill={active === i ? '#7152cd' : 'url(#barFill)'}/>}
            <text x={x(i)} y={H - 21} textAnchor="middle" className="axis-text x-label">{cumulative ? bin.hi : bin.label}</text>
          </g>)}
          {cumulative && <>
            <path d={areaPath} fill="url(#cumulativeFill)"/>
            <path d={linePath} fill="none" stroke="#3a9c83" strokeWidth="2.5" strokeLinejoin="round"/>
            {bins.map((bin, i) => <circle key={i} cx={x(i)} cy={y(bin.tail)} r={active === i ? 5 : 3.5} fill="white" stroke="#3a9c83" strokeWidth="2"/>)}
          </>}
          {bins.map((bin, i) => <rect key={i} tabIndex="0" role="button"
            aria-label={`${outcomeLabel(bin)}: ${pct(cumulative ? bin.tail : bin.chance)}`}
            x={left + i * unit} y={top - 8} width={unit} height={plotH + 20} fill="transparent"
            onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(i)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(i); } }}/>
          )}
        </svg>
        {current && <div className="chart-tooltip" role="status" style={{ left: `${Math.max(18, Math.min(80, x(active) / W * 100))}%` }}>
          <strong>{outcomeLabel(current)}</strong>
          <span><i className={cumulative ? 'green-dot' : 'purple-dot'}/>{cumulative ? 'Cumulative chance' : 'Chance of this outcome'}<b>{pct(cumulative ? current.tail : current.chance)}</b></span>
        </div>}
        <div className="x-axis-title">{cumulative ? 'Number of prizes (X or more)' : 'Number of prizes you win'}</div>
      </div>

      {cumulative && <div className="cumulative-strip">
        <div className="cumulative-label"><TrendingDown size={17}/><span>YOUR CUMULATIVE CHANCES</span></div>
        {[1, 2, 3].map(k => <div key={k}><span>{k} or more prizes</span><strong>{pct(result.atLeast[k] ?? 0)}</strong></div>)}
      </div>}
      <p className="chart-caption">
        {cumulative ? <TrendingDown size={13}/> : <ChartNoAxesColumnIncreasing size={13}/>}
        {cumulative ? '“2 or more prizes” adds the chances of winning exactly 2, 3, 4… prizes.' : grouped ? 'Each bar combines the outcomes in its labeled range.' : 'Each bar shows one outcome, without adding other prize counts.'}
        {' '}Hover, tap, or focus a point to explore.
      </p>
    </section>
  );
}

export default function OutcomeChart({ result }) {
  return <div className="probability-charts">
    <ProbabilityPlot result={result}/>
    <ProbabilityPlot result={result} cumulative/>
  </div>;
}
