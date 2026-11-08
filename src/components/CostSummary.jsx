import { Ticket } from 'lucide-react';
import { TICKETS_PER_PRIZE } from '../model.js';
import { formatAmount as amount } from '../format.js';

export default function CostSummary({ costs, donationCost }) {
  return <section className="card cost-card" aria-labelledby="ticket-cost-title">
    <div className="card-section-header">
      <div><div className="eyebrow">DONATIONS → PRIZES → TICKETS</div><h2 id="ticket-cost-title">The theoretical cost of a ticket</h2></div>
      <span className="ticket-rate"><Ticket size={14}/>{TICKETS_PER_PRIZE} tickets per prize</span>
    </div>
    <div className="cost-metrics">
      <div><span>Total donation cost</span><strong data-testid="total-cost">{amount(costs.totalCost)}</strong><small>{costs.totalDonations.toLocaleString()} donations × {amount(donationCost)}</small></div>
      <div><span>Expected tickets</span><strong data-testid="expected-tickets">{amount(costs.expectedTickets)}</strong><small>{amount(costs.expectedPrizes)} expected prizes × {TICKETS_PER_PRIZE}</small></div>
      <div className="ticket-cost-result"><span>Theoretical cost per ticket</span><strong data-testid="cost-per-ticket">{amount(costs.costPerTicket)}</strong><small>{costs.costPerTicket === null ? 'No tickets expected' : 'Total cost ÷ expected tickets'}</small></div>
    </div>
    <p className="cost-note">Uses the mathematical expectation, including your prize cap if enabled. All planned donations are paid; results use the same currency or units as your donation cost.</p>
  </section>;
}
