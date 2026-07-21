import { useState } from 'react';
import { Payment, Member, Plan } from '../types';
import { 
  DollarSign, 
  Search, 
  Calendar, 
  CreditCard, 
  ArrowDownLeft, 
  TrendingUp, 
  FileText, 
  Printer, 
  Download, 
  CheckCircle,
  Tag
} from 'lucide-react';

interface PaymentsListProps {
  payments: Payment[];
  members: Member[];
  plans: Plan[];
  gymName?: string;
  gymPhone?: string;
  gymAddress?: string;
}

export default function PaymentsList({ 
  payments, 
  members, 
  plans,
  gymName,
  gymPhone,
  gymAddress
}: PaymentsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);

  // Financial Stats Calculations
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const averageTicket = payments.length > 0 ? Math.round(totalRevenue / payments.length) : 0;
  
  // Method breakdowns
  const cashTotal = payments.filter(p => p.paymentMethod === 'Cash').reduce((sum, p) => sum + p.amount, 0);
  const cardTotal = payments.filter(p => p.paymentMethod === 'Card').reduce((sum, p) => sum + p.amount, 0);
  const bankTotal = payments.filter(p => p.paymentMethod === 'Bank Transfer').reduce((sum, p) => sum + p.amount, 0);
  const otherTotal = payments.filter(p => p.paymentMethod === 'Other').reduce((sum, p) => sum + p.amount, 0);

  // Filtered payments list
  const filteredPayments = payments.filter(p => {
    const member = members.find(m => m.id === p.memberId);
    const matchesSearch = member 
      ? member.name.toLowerCase().includes(searchTerm.toLowerCase())
      : false;
    const matchesMethod = methodFilter === 'all' || p.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Generate Receipt Trigger
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="payments-list-container">
      {/* Financial Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5" id="payments-stats-grid">
        <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 shadow-sm" id="card-gross">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Gross Revenue</span>
            <DollarSign className="w-4 h-4 text-lime-400" />
          </div>
          <h3 className="text-3xl font-bold text-white font-display mt-3">Rs. {totalRevenue}</h3>
          <p className="text-slate-500 text-xs mt-2 font-sans flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-lime-400" />
            <span className="text-slate-400 font-medium">All recorded dues payments</span>
          </p>
        </div>

        <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 shadow-sm" id="card-ticket">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Average Receipt</span>
            <ArrowDownLeft className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="text-3xl font-bold text-white font-display mt-3">Rs. {averageTicket}</h3>
          <p className="text-slate-500 text-xs mt-2 font-sans">
            Across {payments.length} transactions
          </p>
        </div>

        <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 shadow-sm" id="card-cash">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Cash Box</span>
            <span className="text-emerald-400 font-mono text-[10px] font-bold">PHYSICAL</span>
          </div>
          <h3 className="text-3xl font-bold text-white font-display mt-3">Rs. {cashTotal}</h3>
          <p className="text-slate-500 text-xs mt-2 font-sans">
            {Math.round((cashTotal / (totalRevenue || 1)) * 100)}% of total receipts
          </p>
        </div>

        <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 shadow-sm" id="card-digital">
          <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Digital / Card</span>
            <CreditCard className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="text-3xl font-bold text-white font-display mt-3">Rs. {cardTotal + bankTotal}</h3>
          <p className="text-slate-500 text-xs mt-2 font-sans">
            Bank transfer & POS terminals combined
          </p>
        </div>
      </div>

      {/* Main Ledger Section */}
      <div className="bg-[#161B22] border border-slate-800 rounded-3xl overflow-hidden shadow-sm" id="ledger-main-card">
        {/* Table Filter Header */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center p-5 border-b border-slate-800" id="ledger-header">
          <div>
            <h3 className="text-white font-semibold font-display text-lg">Sales Ledger</h3>
            <p className="text-slate-400 text-xs">Complete chronological audit trail of processed sales</p>
          </div>

          <div className="flex gap-3" id="ledger-filters">
            <div className="relative flex-1 md:w-64" id="ledger-search-box">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search athlete name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl pl-9 pr-4 py-1.5 text-white text-xs focus:outline-none focus:ring-0"
              />
            </div>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
              id="payment-method-select"
            >
              <option value="all">All Channels</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto" id="ledger-table-scroller">
          <table className="w-full text-left border-collapse" id="ledger-table">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-semibold uppercase tracking-wider font-sans bg-slate-900/45">
                <th className="py-3 px-5">Receipt No</th>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Locked Plan</th>
                <th className="py-3 px-4">Paid On</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Gross Amt</th>
                <th className="py-3 px-5 text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {filteredPayments.map((p, index) => {
                const member = members.find(m => m.id === p.memberId);
                const plan = plans.find(pl => pl.id === p.planId);
                return (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors" id={`ledger-row-${p.id}`}>
                    <td className="py-3.5 px-5 font-mono text-slate-400 font-medium">
                      #TXN-{(payments.length - index).toString().padStart(4, '0')}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {member ? member.name : 'Unknown Athlete'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {plan ? plan.name : 'Basic Plan'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {p.date}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.paymentMethod === 'Cash' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Cash</span>
                      )}
                      {p.paymentMethod === 'Card' && (
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">POS Card</span>
                      )}
                      {p.paymentMethod === 'Bank Transfer' && (
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Wire Transfer</span>
                      )}
                      {p.paymentMethod === 'Other' && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">Other</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                      Rs. {p.amount}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => setSelectedReceipt(p)}
                        className="text-lime-400 hover:text-lime-500 hover:underline font-bold flex items-center justify-end gap-1 ml-auto cursor-pointer"
                        id={`invoice-btn-${p.id}`}
                      >
                        <FileText className="w-3.5 h-3.5" /> Receipt
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredPayments.length === 0 && (
                <tr id="ledger-empty-row">
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                    No transactions found in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Simulated Receipt / Invoice overlay */}
      {selectedReceipt && (() => {
        const member = members.find(m => m.id === selectedReceipt.memberId);
        const plan = plans.find(pl => pl.id === selectedReceipt.planId);
        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" id="receipt-modal">
            <div className="bg-[#161B22] border border-slate-800 text-white rounded-3xl max-w-sm w-full shadow-2xl p-6 relative flex flex-col justify-between" id="receipt-card">
              {/* Receipt Header */}
              <div className="text-center space-y-2 border-b border-slate-800 pb-5" id="receipt-header">
                <div className="w-12 h-12 rounded-full bg-lime-400/10 text-lime-400 flex items-center justify-center mx-auto text-xl font-bold font-display">
                  🏋️
                </div>
                <h3 className="font-extrabold font-display text-lg uppercase tracking-wider text-white">
                  {gymName || "IRON METRIC GYM"}
                </h3>
                {gymAddress && (
                  <p className="text-[10px] text-slate-400 font-sans leading-tight">
                    📍 {gymAddress}
                  </p>
                )}
                {gymPhone && (
                  <p className="text-[10px] text-slate-400 font-mono leading-tight">
                    📞 {gymPhone}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 font-sans font-medium uppercase mt-1">Receipt / Invoice Document</p>
                <div className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-400 inline-block border border-slate-850">
                  TXN-{selectedReceipt.id.toUpperCase().substring(0, 8)}
                </div>
              </div>

              {/* Receipt Details */}
              <div className="py-5 space-y-4 text-xs" id="receipt-body">
                <div className="flex justify-between" id="r-bill-to">
                  <span className="text-slate-400">Bill To:</span>
                  <span className="font-bold text-white text-right">{member ? member.name : 'Gym Athlete'}</span>
                </div>
                <div className="flex justify-between" id="r-date">
                  <span className="text-slate-400">Payment Date:</span>
                  <span className="font-medium text-white">{selectedReceipt.date}</span>
                </div>
                <div className="flex justify-between" id="r-method">
                  <span className="text-slate-400">Payment Channel:</span>
                  <span className="font-semibold text-white">{selectedReceipt.paymentMethod}</span>
                </div>

                <div className="border-t border-dashed border-slate-800 my-2 pt-3" id="receipt-itemized">
                  <div className="flex justify-between font-bold text-white" id="r-items-header">
                    <span>Subscription Plan</span>
                    <span>Subtotal</span>
                  </div>
                  <div className="flex justify-between text-slate-300 mt-1.5" id="r-item-row">
                    <span>{plan ? plan.name : 'Gym Membership'}</span>
                    <span>Rs. {selectedReceipt.amount}</span>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3 flex justify-between items-baseline" id="r-total">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Grand Total:</span>
                  <span className="text-xl font-extrabold text-lime-400 font-display">Rs. {selectedReceipt.amount}</span>
                </div>

                {selectedReceipt.notes && (
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-[10px] text-slate-400 italic mt-3" id="r-notes-box">
                    <strong>Memo:</strong> {selectedReceipt.notes}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex gap-2" id="receipt-actions">
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-semibold py-2.5 rounded-xl transition-all text-center cursor-pointer"
                  id="close-receipt-btn"
                >
                  Dismiss
                </button>
                <button
                  onClick={handlePrintReceipt}
                  className="flex-1 bg-lime-400 hover:bg-lime-500 text-black text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-lime-400/5"
                  id="print-receipt-btn"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Tax
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
