import { useState, FormEvent } from 'react';
import { Plan, Member } from '../types';
import { getCurrencySymbol } from '../lib/whatsappHelper';
import { 
  PlusCircle, 
  Trash2, 
  Edit, 
  Check, 
  DollarSign, 
  Clock, 
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface PlansManagerProps {
  plans: Plan[];
  members: Member[];
  gymCurrency?: string;
  onAddPlan: (plan: Omit<Plan, 'id' | 'updatedAt'>) => void;
  onUpdatePlan: (plan: Plan) => void;
  onDeletePlan: (id: string) => void;
}

export default function PlansManager({
  plans,
  members,
  gymCurrency = 'PKR',
  onAddPlan,
  onUpdatePlan,
  onDeletePlan
}: PlansManagerProps) {
  const currSymbol = getCurrencySymbol(gymCurrency);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [durationMonths, setDurationMonths] = useState('1');
  const [featureInput, setFeatureInput] = useState('');
  const [features, setFeatures] = useState<string[]>([]);

  const handleAddFeature = () => {
    if (!featureInput.trim()) return;
    setFeatures([...features, featureInput.trim()]);
    setFeatureInput('');
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setDurationMonths('1');
    setFeatureInput('');
    setFeatures([]);
  };

  const startEdit = (p: Plan) => {
    setEditingPlan(p);
    setName(p.name);
    setPrice(String(p.price));
    setDurationMonths(String(p.durationMonths));
    setFeatures(p.features);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;

    if (editingPlan) {
      onUpdatePlan({
        ...editingPlan,
        name,
        price: Number(price),
        durationMonths: Number(durationMonths),
        features,
        updatedAt: new Date().toISOString()
      });
    } else {
      onAddPlan({
        name,
        price: Number(price),
        durationMonths: Number(durationMonths),
        features
      });
    }

    setIsFormOpen(false);
    setEditingPlan(null);
    resetForm();
  };

  const handleDeleteClick = (p: Plan) => {
    // Check if any member is currently assigned to this plan
    const activeContracts = members.filter(m => m.planId === p.id);
    if (activeContracts.length > 0) {
      alert(`Cannot delete plan "${p.name}". There are currently ${activeContracts.length} athletes locked into this plan. Please re-assign them first.`);
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete the plan "${p.name}"?`);
    if (confirmed) {
      onDeletePlan(p.id);
    }
  };

  return (
    <div className="space-y-6" id="plans-manager-container">
      {/* Plans Action Header */}
      <div className="flex justify-between items-center bg-[#161B22] border border-slate-800 rounded-3xl p-5 shadow-sm" id="plans-header">
        <div>
          <h3 className="text-white font-semibold font-display text-lg">Membership Rates & Plans</h3>
          <p className="text-slate-400 text-xs">Configure subscription models, pricing schedules, and privileges</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingPlan(null); setIsFormOpen(true); }}
          className="bg-lime-400 hover:bg-lime-500 text-black px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-lime-400/5"
          id="add-plan-btn"
        >
          <PlusCircle className="w-4 h-4" />
          Create Pricing Tier
        </button>
      </div>

      {/* Grid of Plan Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="plans-grid">
        {plans.map((p) => {
          const userCount = members.filter(m => m.planId === p.id).length;
          return (
            <div 
              key={p.id} 
              className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-lime-400/30 transition-all duration-300"
              id={`plan-card-${p.id}`}
            >
              {p.price > 150 && (
                <div className="absolute top-0 right-0 bg-lime-400 text-black text-[9px] font-extrabold uppercase px-3 py-1 rounded-bl-xl tracking-wider flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Best Value
                </div>
              )}

              <div className="space-y-4" id={`plan-top-${p.id}`}>
                <div id={`plan-meta-${p.id}`}>
                  <h4 className="text-white font-bold font-display text-base tracking-wide uppercase">{p.name}</h4>
                  <span className="inline-block bg-slate-900 text-slate-400 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-800 mt-1">
                    {p.durationMonths} {p.durationMonths === 1 ? 'Month' : 'Months'} Term
                  </span>
                </div>

                <div className="flex items-baseline" id={`plan-price-block-${p.id}`}>
                  <span className="text-white text-3xl font-extrabold font-display">{currSymbol} {p.price.toLocaleString()}</span>
                  <span className="text-slate-500 text-xs ml-1 font-medium">/ term</span>
                </div>

                <div className="border-t border-slate-800/80 my-4" />

                {/* Features list */}
                <div className="space-y-2" id={`plan-features-${p.id}`}>
                  {p.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300" id={`feature-item-${p.id}-${i}`}>
                      <Check className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  {p.features.length === 0 && (
                    <span className="text-slate-500 italic text-xs">No specifications defined</span>
                  )}
                </div>
              </div>

              {/* Card Footer: Users & Controls */}
              <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between" id={`plan-footer-${p.id}`}>
                <span className="text-[11px] text-slate-400 font-sans">
                  <strong>{userCount}</strong> {userCount === 1 ? 'member' : 'members'} enrolled
                </span>
                
                <div className="flex gap-1.5" id={`plan-controls-${p.id}`}>
                  <button
                    onClick={() => startEdit(p)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-lime-400 transition-colors cursor-pointer"
                    id={`edit-plan-${p.id}`}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(p)}
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                    id={`delete-plan-${p.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pricing Form Dialog Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" id="plan-modal">
          <div className="bg-[#161B22] border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl" id="plan-modal-content">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900" id="plan-modal-header">
              <h3 className="text-white font-semibold font-display text-lg">
                {editingPlan ? 'Modify Pricing Tier' : 'Create Pricing Tier'}
              </h3>
              <button 
                onClick={() => { setIsFormOpen(false); setEditingPlan(null); resetForm(); }}
                className="text-slate-400 hover:text-white cursor-pointer"
                id="close-plan-modal-x"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4" id="plan-form">
              <div id="plan-field-name">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Plan Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Personal Coaching"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4" id="plan-form-grid">
                <div id="plan-field-price">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Cost (PKR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 199"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                  />
                </div>

                <div id="plan-field-duration">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Term (Months)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Feature Tags Adder */}
              <div id="plan-field-features">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Privileges / Features</label>
                <div className="flex gap-2 mb-2" id="feature-add-box">
                  <input
                    type="text"
                    placeholder="e.g. Towel service, pool access..."
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="bg-lime-400 hover:bg-lime-500 text-black px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    id="add-feature-btn"
                  >
                    Add
                  </button>
                </div>

                {/* Tags lists */}
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto" id="feature-tags">
                  {features.map((feature, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center gap-1 bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                      id={`tag-${idx}`}
                    >
                      {feature}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveFeature(idx)}
                        className="text-red-400 hover:text-red-300 ml-1 font-bold cursor-pointer"
                        id={`remove-tag-btn-${idx}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3" id="plan-form-footer">
                <button
                  type="button"
                  onClick={() => { setIsFormOpen(false); setEditingPlan(null); resetForm(); }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-sm font-semibold text-slate-300 cursor-pointer"
                  id="cancel-plan-form-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-lime-400 hover:bg-lime-500 text-sm font-bold text-black cursor-pointer"
                  id="save-plan-form-btn"
                >
                  {editingPlan ? 'Save Pricing Tier' : 'Add Pricing Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
