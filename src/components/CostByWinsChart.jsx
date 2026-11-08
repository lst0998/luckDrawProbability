import { useEffect, useMemo, useRef, useState } from 'react';
import { Ticket } from 'lucide-react';
import { formatAmount as amount, formatProbability as percent } from '../format.js';

const axisAmount = value => value > 0 && value < .01
  ? value.toExponential(1)
  : value.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 });

export default function CostByWinsChart({ costs }) {
  const chartRef = useRef(null);
  const [width, setWidth] = useState(760);
  const [activeWin, setActiveWin] = useState(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(260, entry.contentRect.width)));
    if (chartRef.current) observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);

  const points = costs.costByWins.slice(1);
  const maxWin = points.length;
  const W = width, H = width < 450 ? 230 : 270;
  const left = 58, right = 20, top = 24, bottom = 42;
  const plotW = W - left - right, plotH = H - top - bottom;
  const maxY = points[0]?.costPerTicket || 1;
  const x = wins => maxWin === 1 ? left + plotW / 2 : left + (wins - 1) / (maxWin - 1) * plotW;
  const y = value => top + plotH * (1 - value / maxY);
  const ticks = useMemo(() => {
    if (!maxWin) return [];
    const count = Math.min(maxWin, Math.max(2, Math.floor((width - 78) / 38)));
    return [...new Set(Array.from({ length: count }, (_, i) => count === 1 ? 1 : 1 + Math.round(i * (maxWin - 1) / (count - 1))))];
  }, [maxWin, width]);
  const current = activeWin === null ? null : costs.costByWins[Math.min(maxWin, activeWin)];
  const path = points.map(row => `${row.wins === 1 ? 'M' : 'L'} ${x(row.wins)} ${y(row.costPerTicket)}`).join(' ');
  const selectPosition = event => {
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = (event.clientX - rect.left) / rect.width * W;
    setActiveWin(Math.max(1, Math.min(maxWin, Math.round(1 + (localX - left) / plotW * (maxWin - 1)))));
  };

  return <section className="card outcome-card cost-curve-card" id="cost-by-wins" aria-labelledby="cost-curve-title">
    <div className="chart-header">
      <div><div className="eyebrow">YOUR COST AT EACH OUTCOME</div><h2 id="cost-curve-title">Cost per ticket, by prizes won</h2><p>A total donation cost of {amount(costs.totalCost)}, spread across 2 tickets per prize.</p></div>
      <span className="pill"><Ticket size={12}/>2 tickets / prize</span>
    </div>
    <div className="chart-wrap" ref={chartRef} onMouseLeave={() => setActiveWin(null)}>
      {maxWin > 0 ? <>
        <div className="axis-headings"><span>Cost per ticket · your input units</span></div>
        <svg className="cost-by-wins-chart" viewBox={`0 0 ${W} ${H}`} role="slider" tabIndex="0"
          aria-label="Cost per ticket by prizes won" aria-valuemin={1} aria-valuemax={maxWin}
          aria-valuenow={current?.wins || 1}
          aria-valuetext={`${current?.wins || 1} prizes, ${amount(current?.costPerTicket ?? points[0].costPerTicket)} per ticket`}
          onPointerMove={selectPosition} onClick={selectPosition}
          onFocus={() => setActiveWin(win => Math.max(1, Math.min(maxWin, win || 1)))} onBlur={() => setActiveWin(null)}
          onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const delta = ['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1;
            setActiveWin(win => event.key === 'Home' ? 1 : event.key === 'End' ? maxWin : Math.max(1, Math.min(maxWin, (win || 1) + delta)));
          }}>
          {[0, 1, 2, 3, 4].map(i => <g key={i}>
            <line x1={left} x2={W - right} y1={top + plotH * i / 4} y2={top + plotH * i / 4} stroke="#eaeaf0" strokeDasharray={i === 4 ? '0' : '3 5'}/>
            <text x={left - 10} y={top + plotH * i / 4 + 4} textAnchor="end" className="axis-text">{axisAmount(maxY * (1 - i / 4))}</text>
          </g>)}
          <path d={path} fill="none" stroke="#b18144" strokeWidth="2.5" strokeLinejoin="round"/>
          {ticks.map(wins => <g key={wins}>
            <circle cx={x(wins)} cy={y(points[wins - 1].costPerTicket)} r="3.5" fill="white" stroke="#b18144" strokeWidth="2"/>
            <text x={x(wins)} y={H - 21} textAnchor="middle" className="axis-text x-label">{wins}</text>
          </g>)}
          {current && <g>
            <line x1={x(current.wins)} x2={x(current.wins)} y1={top} y2={y(0)} stroke="#b18144" opacity=".25" strokeDasharray="3 4"/>
            <circle cx={x(current.wins)} cy={y(current.costPerTicket)} r="5" fill="#b18144" stroke="white" strokeWidth="2"/>
          </g>}
        </svg>
        {current && <div className="chart-tooltip cost-tooltip" role="status">
          <strong>{current.wins} {current.wins === 1 ? 'prize' : 'prizes'} · {current.tickets} tickets</strong>
          <span>Cost per ticket<b>{amount(current.costPerTicket)}</b></span>
          <span>Chance of exactly this outcome<b>{percent(current.probability)}</b></span>
        </div>}
        <div className="x-axis-title">Number of prizes you win</div>
      </> : <p className="cost-curve-empty">No positive prize outcomes with the current account count or prize cap.</p>}
    </div>
    <div className="zero-win-note"><Ticket size={14}/><span><strong>0 wins = 0 tickets.</strong> No finite cost per ticket.</span></div>
    <p className="chart-caption">Cost per ticket = total donation cost ÷ (prizes won × 2). This curve shows the cost if you win each prize count; the probability graphs show how likely those outcomes are. Hover, tap, or use arrow keys to explore.</p>
  </section>;
}
