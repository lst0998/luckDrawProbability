import { useEffect, useMemo, useRef, useState } from 'react';
import { ChartNoAxesColumnIncreasing, TrendingDown } from 'lucide-react';
import { formatProbability as pct } from '../format.js';

export default function OutcomeChart({ result }) {
  const [active, setActive] = useState(null);
  const [showBars, setShowBars] = useState(true);
  const [showLine, setShowLine] = useState(true);
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
      const chance = result.histogram.slice(lo, hi + 1).reduce((a,b) => a+b,0) / result.trials;
      out.push({ lo, hi, chance, tail: result.moreThan[hi], label: lo === hi ? String(lo) : `${lo}–${hi}` });
    }
    return out;
  }, [result, chartWidth]);
  const W = chartWidth, H = chartWidth < 450 ? 230 : 285, left = 38, right = 38, top = 23, bottom = 42;
  const plotW = W-left-right, plotH = H-top-bottom;
  const maxY = Math.min(1, Math.max(.1, Math.ceil(Math.max(...bins.map(b=>b.chance)) * 20) / 20));
  const unit = plotW / bins.length;
  const x = i => left + unit * (i + .5);
  const yBar = p => top + plotH * (1-p/maxY);
  const yTail = p => top + plotH * (1-p);
  const current = active === null ? null : bins[active];
  const grouped = bins.some(bin => bin.lo !== bin.hi);
  const linePath = bins.map((b,i)=>`${i === 0 ? 'M':'L'} ${x(i)} ${yTail(b.tail)}`).join(' ');
  return <section className="card outcome-card" id="outcomes">
    <div className="chart-header"><div><div className="eyebrow">YOUR POSSIBLE OUTCOMES</div><h2>What could you win?</h2><p>See individual outcomes and the chance of winning more.</p></div><span className="pill"><span className="live-dot"/>10,000 rounds</span></div>
    <div className="chart-legend"><button aria-pressed={showBars} onClick={()=>{if(showLine || !showBars)setShowBars(!showBars)}}><span className={`legend-square ${!showBars?'muted':''}`}/>{grouped?'Prizes in this range':'Exactly this many prizes'}</button><button aria-pressed={showLine} onClick={()=>{if(showBars || !showLine)setShowLine(!showLine)}}><span className={`legend-line ${!showLine?'muted':''}`}/>{grouped?'More than range end':'More than this many'} · cumulative</button></div>
    <div className="chart-wrap" ref={chartRef} onMouseLeave={()=>setActive(null)}>
      <div className="axis-headings"><span>Individual probability</span><span>Cumulative probability</span></div>
      <svg className="outcome-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Prize outcomes: purple bars show exact probabilities; the green line shows cumulative probability of winning more than the prize count on the horizontal axis.">
        <defs><linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8f78e7"/><stop offset="100%" stopColor="#b5a3ee"/></linearGradient></defs>
        {[0,1,2,3,4].map(i=><g key={i}><line x1={left} x2={W-right} y1={top+plotH*i/4} y2={top+plotH*i/4} stroke="#eaeaf0" strokeDasharray={i===4?'0':'3 5'}/><text x={left-12} y={top+plotH*i/4+4} textAnchor="end" className="axis-text">{Math.round(maxY*100*(1-i/4))}%</text><text x={W-right+10} y={top+plotH*i/4+4} className="axis-text green-axis">{100-i*25}%</text></g>)}
        {bins.map((b,i)=><g key={i}>
          {active===i && <rect x={left+i*unit} y={top} width={unit} height={plotH} fill="#f1eefb"/>}
          {showBars && <rect x={x(i)-unit*.29} y={yBar(b.chance)} width={unit*.58} height={plotH*b.chance/maxY} rx="5" fill={active===i?'#7152cd':'url(#barFill)'}/>}
          <text x={x(i)} y={H-21} textAnchor="middle" className="axis-text x-label">{b.label}</text>
        </g>)}
        {showLine && <><path d={linePath} fill="none" stroke="#3a9c83" strokeWidth="2.5" strokeLinejoin="round"/>{bins.map((b,i)=><circle key={i} cx={x(i)} cy={yTail(b.tail)} r={active===i?5:3.5} fill="white" stroke="#3a9c83" strokeWidth="2"/>)}</>}
        {bins.map((b,i)=><rect key={i} tabIndex="0" role="button" aria-label={`${b.label} prizes: ${pct(b.chance)} exact; more than ${b.hi} prizes: ${pct(b.tail)}`} x={left+i*unit} y={top-8} width={unit} height={plotH+20} fill="transparent" onMouseEnter={()=>setActive(i)} onFocus={()=>setActive(i)} onBlur={()=>setActive(null)} onClick={()=>setActive(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setActive(i)}}}/>)}
      </svg>
      {current && <div className="chart-tooltip" role="status" style={{left:`${Math.max(18,Math.min(80,x(active)/W*100))}%`}}><strong>{current.label} prizes</strong><span><i className="purple-dot"/>Exactly {current.label}<b>{pct(current.chance)}</b></span><span><i className="green-dot"/>More than {current.hi}<b>{pct(current.tail)}</b></span></div>}
      <div className="x-axis-title">Number of prizes you win</div>
    </div>
    <div className="cumulative-strip"><div className="cumulative-label"><TrendingDown size={17}/><span>YOUR CUMULATIVE CHANCES</span></div>{[0,1,2].map(k=><div key={k}><span>More than {k} {k===1?'prize':'prizes'}</span><strong>{pct(result.moreThan[k] ?? 0)}</strong></div>)}</div>
    <p className="chart-caption"><ChartNoAxesColumnIncreasing size={13}/>“More than 1” adds the chances of winning 2, 3, 4… prizes. {grouped?'Ranges combine outcomes; the line counts outcomes above each range’s upper end. ':''}Hover or tap the graph to explore.</p>
  </section>;
}
