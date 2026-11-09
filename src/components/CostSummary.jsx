import { formatAmount as amount } from '../format.js';

export default function CostSummary({ costs }) {
  return <section className="card cost-card" aria-labelledby="ticket-cost-title">
    <div className="card-section-header">
      <h2 id="ticket-cost-title">Ticket costs</h2>
    </div>
    <div className="cost-metrics">
      <div><span>Total donation cost</span><strong data-testid="total-cost">{amount(costs.totalCost)}</strong></div>
      <div><span>Expected tickets</span><strong data-testid="expected-tickets">{amount(costs.expectedTickets)}</strong></div>
      <div className="ticket-cost-result"><span>Theoretical cost per ticket</span><strong data-testid="cost-per-ticket">{amount(costs.costPerTicket)}</strong>{costs.costPerTicket === null && <small>No tickets expected</small>}</div>
    </div>
  </section>;
}
