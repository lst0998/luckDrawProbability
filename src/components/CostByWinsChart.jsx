import { useEffect, useMemo, useRef, useState } from 'react';
import { Ticket } from 'lucide-react';
import { formatAmount as amount, formatProbability as percent } from '../format.js';
import { visibleCostOutcomes } from '../chart-data.js';

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

  const points = useMemo(() => visibleCostOutcomes(costs), [costs]);
  const minWin = points[0]?.wins ?? 0;
  const maxWin = points.at(-1)?.wins ?? 0;
  const W = width, H = width < 450 ? 230 : 270;
  const left = 58, right = 20, top = 24, bottom = 42;
  const plotW = W - left - right, plotH = H - top - bottom;
  const maxY = Math.max(points[0]?.costPerTicket || 0, costs.costPerTicket || 0) * 1.08 || 1;
  const x = wins => maxWin === minWin ? left + plotW / 2 : left + (wins - minWin) / (maxWin - minWin) * plotW;
  const y = value => top + plotH * (1 - value / maxY);
  const ticks = useMemo(() => {
    const count = Math.min(points.length, Math.max(2, Math.floor((width - 78) / 38)));
    return Array.from({ length: count }, (_, i) => points[count === 1 ? 0 : Math.round(i * (points.length - 1) / (count - 1))]);
  }, [points, width]);
  const current = points.find(row => row.wins === activeWin) ?? null;
  const path = points.map((row, i) => `${i === 0 || row.wins !== points[i - 1].wins + 1 ? 'M' : 'L'} ${x(row.wins)} ${y(row.costPerTicket)}`).join(' ');
  const selectPosition = event => {
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = (event.clientX - rect.left) / rect.width * W;
    const targetWin = minWin + (localX - left) / plotW * (maxWin - minWin);
    const nearest = points.reduce((best, row) => Math.abs(row.wins - targetWin) < Math.abs(best.wins - targetWin) ? row : best);
    setActiveWin(nearest.wins);
  };

  return <section className="card outcome-card cost-curve-card" id="cost-by-wins" aria-labelledby="cost-curve-title">
    <div className="chart-header">
      <div><div className="eyebrow">YOUR COST AT EACH OUTCOME</div><h2 id="cost-curve-title">Cost per ticket, by prizes won</h2><p>A total donation cost of {amount(costs.totalCost)}, spread across 2 tickets per prize.</p></div>
      <span className="pill"><Ticket size={12}/>2 tickets / prize</span>
    </div>
    <div className="cost-reference">
      <span className="reference-label"><i/>Theoretical cost per ticket</span>
      <strong data-testid="chart-theoretical-cost">{amount(costs.costPerTicket)}</strong>
      <small>{costs.costPerTicket === null ? 'Undefined when no tickets are expected.' : 'Total donation cost ÷ expected tickets, using every outcome.'}</small>
    </div>
    <div className="chart-wrap" ref={chartRef} onMouseLeave={() => setActiveWin(null)}>
      {points.length > 0 ? <>
        <div className="axis-headings"><span>Cost per ticket · your input units</span></div>
        <svg className="cost-by-wins-chart" viewBox={`0 0 ${W} ${H}`} role="slider" tabIndex="0"
          aria-label="Cost per ticket by prizes won" aria-valuemin={minWin} aria-valuemax={maxWin}
          aria-valuenow={current?.wins ?? minWin}
          aria-valuetext={`${current?.wins ?? minWin} prizes, ${amount(current?.costPerTicket ?? points[0].costPerTicket)} per ticket`}
          onPointerMove={selectPosition} onClick={selectPosition}
          onFocus={() => setActiveWin(win => points.some(row => row.wins === win) ? win : minWin)} onBlur={() => setActiveWin(null)}
          onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const delta = ['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1;
            setActiveWin(win => {
              const index = Math.max(0, points.findIndex(row => row.wins === win));
              return event.key === 'Home' ? minWin : event.key === 'End' ? maxWin : points[Math.max(0, Math.min(points.length - 1, index + delta))].wins;
            });
          }}>
          {[0, 1, 2, 3, 4].map(i => <g key={i}>
            <line x1={left} x2={W - right} y1={top + plotH * i / 4} y2={top + plotH * i / 4} stroke="#eaeaf0" strokeDasharray={i === 4 ? '0' : '3 5'}/>
            <text x={left - 10} y={top + plotH * i / 4 + 4} textAnchor="end" className="axis-text">{axisAmount(maxY * (1 - i / 4))}</text>
          </g>)}
          {costs.costPerTicket !== null && <line className="theoretical-cost-line" data-value={costs.costPerTicket}
            x1={left} x2={W - right} y1={y(costs.costPerTicket)} y2={y(costs.costPerTicket)} stroke="#8062d8" strokeWidth="2" strokeDasharray="6 5">
            <title>Theoretical cost per ticket: {amount(costs.costPerTicket)}</title>
          </line>}
          <path d={path} fill="none" stroke="#b18144" strokeWidth="2.5" strokeLinejoin="round"/>
          {ticks.map(row => <g key={row.wins}>
            <circle cx={x(row.wins)} cy={y(row.costPerTicket)} r="3.5" fill="white" stroke="#b18144" strokeWidth="2"/>
            <text x={x(row.wins)} y={H - 21} textAnchor="middle" className="axis-text x-label">{row.wins}</text>
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
      </> : <p className="cost-curve-empty">No winning outcome has a chance of 0.1% or higher.</p>}
    </div>
    <div className="zero-win-note"><Ticket size={14}/><span><strong>0 wins = 0 tickets.</strong> No finite cost per ticket.</span></div>
    <p className="chart-caption">Only outcomes with a chance of at least 0.1% are plotted. Cost per ticket = total donation cost ÷ (prizes won × 2). The dashed line shows the theoretical cost using every outcome. Hover, tap, or use arrow keys to explore.</p>
  </section>;
}
