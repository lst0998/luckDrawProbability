import { useEffect, useMemo, useRef, useState } from 'react';
import { ChartNoAxesColumnIncreasing, TrendingDown } from 'lucide-react';
import { formatProbability as pct } from '../format.js';
import { visibleOutcomes } from '../chart-data.js';

function ProbabilityPlot({ result, cumulative = false }) {
  const [active, setActive] = useState(null);
  const chartRef = useRef(null);
  const scrollRef = useRef(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [chartWidth, setChartWidth] = useState(760);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setChartWidth(Math.max(260, entry.contentRect.width)));
    if (chartRef.current) observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);

  const { points, trimmed } = useMemo(() => visibleOutcomes(result), [result]);
  const left = 43, right = 20, top = 23, bottom = 42;
  const firstWin = points[0]?.wins ?? 0, lastWin = points.at(-1)?.wins ?? firstWin;
  const countSpan = lastWin - firstWin + 1;
  const minUnit = Math.max(22, String(lastWin).length * 7 + 12);
  const W = Math.max(chartWidth - left, countSpan * minUnit + right);
  const H = chartWidth < 450 ? 230 : 270;
  const scrollable = W > chartWidth - left;
  const plotW = W - right, plotH = H - top - bottom;
  const peakChance = Math.max(0, ...points.map(point => point.chance));
  const yStep = peakChance < .1 ? .01 : .05;
  const maxY = cumulative ? 1 : Math.min(1, Math.max(yStep, Math.ceil(peakChance / yStep) * yStep));
  const unit = plotW / countSpan;
  const x = i => unit * (points[i].wins - firstWin + .5);
  const y = probability => top + plotH * (1 - probability / maxY);
  const current = active === null ? null : points[active];
  const tooltipWidth = Math.min(240, chartWidth - 16);
  const segments = [];
  points.forEach((point, i) => {
    if (i === 0 || point.wins !== points[i - 1].wins + 1) segments.push([]);
    segments.at(-1).push(i);
  });
  const segmentPath = indexes => indexes.map((index, i) => `${i === 0 ? 'M' : 'L'} ${x(index)} ${y(points[index].tail)}`).join(' ');
  const linePath = segments.map(segmentPath).join(' ');
  const areaPath = segments.map(indexes => `${segmentPath(indexes)} L ${x(indexes.at(-1))} ${y(0)} L ${x(indexes[0])} ${y(0)} Z`).join(' ');
  const outcomeLabel = bin => cumulative
    ? `${bin.wins} or more prizes`
    : `Exactly ${bin.wins} ${bin.wins === 1 ? 'prize' : 'prizes'}`;

  useEffect(() => {
    setActive(null);
    const peakIndex = points.reduce((best, point, i) => point.chance > points[best].chance ? i : best, 0);
    // Open wide charts around the likely outcomes; all retained counts are scrollable.
    const scroller = scrollRef.current;
    if (scroller && points.length) {
      scroller.scrollLeft = unit * (points[peakIndex].wins - firstWin + .5) - (chartWidth - left) / 2;
      setScrollLeft(scroller.scrollLeft);
    }
  }, [points, unit, chartWidth]);

  return (
    <section className={`card outcome-card ${cumulative ? 'cumulative-card' : 'individual-card'}`} id={cumulative ? 'cumulative-outcomes' : 'outcomes'}>
      <div className="chart-header">
        <div>
          <div className="eyebrow">{cumulative ? 'YOUR CUMULATIVE CHANCES' : 'YOUR POSSIBLE OUTCOMES'}</div>
          <h2>{cumulative ? 'Chance of winning X or more prizes' : 'What could you win?'}</h2>
          <p>{cumulative ? 'Includes exactly X prizes and every higher outcome.' : 'The chance of each individual prize outcome.'}</p>
        </div>
        <span className="pill"><span className="live-dot"/>Calculated</span>
      </div>

      <div className="chart-legend">
        <span className="chart-legend-label">
          <span className={cumulative ? 'legend-line' : 'legend-square'}/>
          {cumulative ? 'Chance of winning X or more prizes' : 'Chance of winning exactly this many prizes'}
        </span>
      </div>

      <div className="chart-wrap" ref={chartRef} onMouseLeave={() => setActive(null)}>
        {points.length === 0 ? <p className="probability-empty">No outcome has an individual chance of 0.1% or higher.</p> : <>
        <div className="axis-headings"><span>{cumulative ? 'Cumulative probability' : 'Individual probability'}</span></div>
        <div className="probability-scroll-frame">
          <svg className="probability-axis" width={left} height={H} aria-hidden="true">
            {[0, 1, 2, 3, 4].map(i => <text key={i} x={left - 12} y={top + plotH * i / 4 + 4} textAnchor="end" className={`axis-text ${cumulative ? 'green-axis' : ''}`}>{(maxY * 100 * (1 - i / 4)).toLocaleString(undefined, { maximumFractionDigits: maxY <= .1 ? 2 : 0 })}%</text>)}
          </svg>
          <div className="probability-scroll" ref={scrollRef} onScroll={event => setScrollLeft(event.currentTarget.scrollLeft)}
            tabIndex={scrollable ? 0 : undefined} role="region" aria-label={cumulative ? 'Scrollable cumulative prize counts' : 'Scrollable individual prize counts'}>
        <svg style={{ width: W, height: H }} className="outcome-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={cumulative ? 'Cumulative probability of winning X or more prizes' : 'Probability of each individual prize outcome'}>
          <defs>
            {cumulative ? <linearGradient id="cumulativeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a9c83" stopOpacity=".13"/><stop offset="100%" stopColor="#3a9c83" stopOpacity=".02"/></linearGradient>
              : <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8f78e7"/><stop offset="100%" stopColor="#b5a3ee"/></linearGradient>}
          </defs>
          {[0, 1, 2, 3, 4].map(i => <g key={i}>
            <line x1={0} x2={W - right} y1={top + plotH * i / 4} y2={top + plotH * i / 4} stroke="#eaeaf0" strokeDasharray={i === 4 ? '0' : '3 5'}/>
          </g>)}
          {points.map((bin, i) => <g key={i}>
            {active === i && <rect x={x(i) - unit / 2} y={top} width={unit} height={plotH} fill={cumulative ? '#edf6f1' : '#f1eefb'}/>}
            {!cumulative && <rect x={x(i) - unit * .29} y={y(bin.chance)} width={unit * .58} height={plotH * bin.chance / maxY} rx="5" fill={active === i ? '#7152cd' : 'url(#barFill)'}/>}
            <text x={x(i)} y={H - 21} textAnchor="middle" className="axis-text x-label">{bin.wins}</text>
          </g>)}
          {cumulative && <>
            <path d={areaPath} fill="url(#cumulativeFill)"/>
            <path d={linePath} fill="none" stroke="#3a9c83" strokeWidth="2.5" strokeLinejoin="round"/>
            {points.map((bin, i) => <circle key={i} cx={x(i)} cy={y(bin.tail)} r={active === i ? 5 : 3.5} fill="white" stroke="#3a9c83" strokeWidth="2"/>)}
          </>}
          {points.map((bin, i) => <rect key={i} tabIndex="0" role="button"
            aria-label={`${outcomeLabel(bin)}: ${pct(cumulative ? bin.tail : bin.chance)}`}
            x={x(i) - unit / 2} y={top - 8} width={unit} height={plotH + 20} fill="transparent"
            onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(i)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(i); } }}/>
          )}
        </svg>
          </div>
        </div>
        {current && <div className="chart-tooltip" role="status" style={{ width: tooltipWidth, left: Math.max(tooltipWidth / 2, Math.min(chartWidth - tooltipWidth / 2, left + x(active) - scrollLeft)) }}>
          <strong>{outcomeLabel(current)}</strong>
          <span><i className={cumulative ? 'green-dot' : 'purple-dot'}/>{cumulative ? 'Cumulative chance' : 'Chance of this outcome'}<b>{pct(cumulative ? current.tail : current.chance)}</b></span>
        </div>}
        <div className="x-axis-title">{cumulative ? 'Number of prizes (X or more)' : 'Number of prizes you win'}</div>
        </>}
      </div>

      {cumulative && <div className="cumulative-strip">
        <div className="cumulative-label"><TrendingDown size={17}/><span>YOUR CUMULATIVE CHANCES</span></div>
        {[1, 2, 3].map(k => <div key={k}><span>{k} or more prizes</span><strong>{pct(result.atLeast[k] ?? 0)}</strong></div>)}
      </div>}
      <p className="chart-caption">
        {cumulative ? <TrendingDown size={13}/> : <ChartNoAxesColumnIncreasing size={13}/>}
        {cumulative ? '“2 or more prizes” adds the chances of winning exactly 2, 3, 4… prizes.' : 'Each bar shows one individual prize count.'}
        {' '}Hover, tap, or focus a point to explore.{scrollable && ' Scroll sideways to see every count.'}
      </p>
      {trimmed && <p className="chart-domain-note">Outcomes below 0.1% individual chance are hidden. Calculations and CSV include every outcome.</p>}
    </section>
  );
}

export default function OutcomeChart({ result }) {
  return <div className="probability-charts">
    <ProbabilityPlot result={result}/>
    <ProbabilityPlot result={result} cumulative/>
  </div>;
}
