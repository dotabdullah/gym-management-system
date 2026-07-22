import { useState, FormEvent, MouseEvent, ChangeEvent } from 'react';
import { Member, Plan, Payment, AttendanceRecord } from '../types';
import { exportMembersToCSV } from '../lib/csvHelper';
import { 
  Search, 
  Filter, 
  UserPlus, 
  Edit, 
  Trash2, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Info, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  PlusCircle,
  FileText,
  Upload,
  Camera,
  X,
  Download,
  Users
} from 'lucide-react';

interface MembersListProps {
  members: Member[];
  plans: Plan[];
  payments: Payment[];
  attendance: AttendanceRecord[];
  onAddMember: (member: Omit<Member, 'id' | 'updatedAt'>) => void;
  onUpdateMember: (member: Member) => void;
  onDeleteMember: (id: string) => void;
  onRecordPayment: (payment: Omit<Payment, 'id' | 'updatedAt'>) => void;
  onCheckIn: (memberId: string) => void;
}

export default function MembersList({
  members,
  plans,
  payments,
  attendance,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onRecordPayment,
  onCheckIn
}: MembersListProps) {
  // Calculate remaining days and renewal date based on joinDate and last payment date
  const getSubscriptionPeriod = (member: Member) => {
    const plan = plans.find(p => p.id === member.planId);
    if (!plan) {
      return { 
        daysRemaining: 0, 
        formattedDueDate: 'N/A', 
        statusText: 'No Plan', 
        daysText: 'N/A', 
        badgeColor: 'bg-slate-800 text-slate-400 border border-slate-700',
        lastPaymentDate: null,
        lastPaymentAmount: null
      };
    }

    // Find payments for this member
    const memberPayments = payments
      .filter(p => p.memberId === member.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Cycle starts from last payment date or joining date
    const baseDateStr = memberPayments.length > 0 ? memberPayments[0].date : member.joinDate;
    const baseDate = new Date(baseDateStr || new Date().toISOString().split('T')[0]);
    const nextDueDate = new Date(baseDate);
    
    // Add plan duration in months
    nextDueDate.setMonth(nextDueDate.getMonth() + (plan.durationMonths || 1));

    // Calculate remaining days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    nextDueDate.setHours(0, 0, 0, 0);

    const diffTime = nextDueDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const formattedDueDate = nextDueDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    let statusText = 'Active';
    let daysText = `${daysRemaining} days left`;
    let badgeColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';

    if (daysRemaining < 0) {
      statusText = 'Expired';
      daysText = `${Math.abs(daysRemaining)} days overdue`;
      badgeColor = 'bg-red-500/10 text-red-400 border border-red-500/20';
    } else if (daysRemaining === 0) {
      statusText = 'Due Today';
      daysText = 'Due today';
      badgeColor = 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse';
    }

    return {
      daysRemaining,
      formattedDueDate,
      statusText,
      daysText,
      badgeColor,
      lastPaymentDate: memberPayments.length > 0 ? memberPayments[0].date : null,
      lastPaymentAmount: memberPayments.length > 0 ? memberPayments[0].amount : null
    };
  };

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'pending'>('all');
  const [planFilter, setPlanFilter] = useState('all');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState<Member | null>(null);

  // Form states - Add/Edit Member
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [planId, setPlanId] = useState('');
  const [status, setStatus] = useState<'active' | 'expired' | 'pending'>('active');
  const [notes, setNotes] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Form states - Record Payment
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer' | 'Other'>('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Reset member form
  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPlanId(plans[0]?.id || '');
    setStatus('active');
    setNotes('');
    setEmergencyName('');
    setEmergencyPhone('');
    setJoinDate(new Date().toISOString().split('T')[0]);
    setPhotoUrl('');
  };

  // Open Edit Form
  const startEdit = (m: Member, e: MouseEvent) => {
    e.stopPropagation();
    setEditingMember(m);
    setName(m.name || '');
    setEmail(m.email || '');
    setPhone(m.phone || '');
    setPlanId(m.planId || '');
    setStatus(m.status || 'active');
    setNotes(m.notes || '');
    setEmergencyName(m.emergencyContactName || '');
    setEmergencyPhone(m.emergencyContactPhone || '');
    setJoinDate(m.joinDate || new Date().toISOString().split('T')[0]);
    setPhotoUrl(m.photoUrl || '');
  };

  // Handle Photo File Select & convert to Base64
  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1500000) {
      alert("Image is too large. Please select an image under 1.5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPhotoUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
  };

  // Handle Add Member Submit
  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onAddMember({
      name,
      email,
      phone,
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      planId: planId || plans[0]?.id,
      status,
      notes,
      emergencyContactName: emergencyName,
      emergencyContactPhone: emergencyPhone,
      photoUrl
    });
    setIsAddOpen(false);
    resetForm();
  };

  // Handle Edit Member Submit
  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingMember || !name) return;
    onUpdateMember({
      ...editingMember,
      name,
      email,
      phone,
      joinDate: joinDate || editingMember.joinDate || new Date().toISOString().split('T')[0],
      planId,
      status,
      notes,
      emergencyContactName: emergencyName,
      emergencyContactPhone: emergencyPhone,
      photoUrl,
      updatedAt: new Date().toISOString()
    });
    setEditingMember(null);
    resetForm();
  };

  // Handle Delete with Confirmation
  const handleDeleteClick = (id: string, name: string, e: MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Are you sure you want to delete member "${name}"? This will remove all their local attendance records.`);
    if (confirmed) {
      onDeleteMember(id);
      if (selectedMember?.id === id) setSelectedMember(null);
    }
  };

  // Handle Check in
  const handleCheckInClick = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    onCheckIn(id);
    alert("Check-in recorded successfully for today!");
  };

  // Handle Payment Submit
  const handlePaymentSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isPaymentOpen || !paymentAmount) return;
    onRecordPayment({
      memberId: isPaymentOpen.id,
      planId: isPaymentOpen.planId,
      amount: Number(paymentAmount),
      date: new Date().toISOString().split('T')[0],
      paymentMethod,
      notes: paymentNotes
    });
    setIsPaymentOpen(null);
    setPaymentAmount('');
    setPaymentNotes('');
    alert(`Payment of Rs. ${paymentAmount} logged successfully!`);
  };

  // Date Range Filters for Athletes
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'this_month' | 'select_month' | 'custom_range'>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Date Range Filter Logic for Members
  const dateFilteredMembers = members.filter(m => {
    if (dateFilterMode === 'all') return true;

    if (dateFilterMode === 'this_month') {
      const currentMonth = new Date().toISOString().substring(0, 7);
      return m.joinDate && m.joinDate.substring(0, 7) === currentMonth;
    }

    if (dateFilterMode === 'select_month') {
      return m.joinDate && m.joinDate.substring(0, 7) === selectedMonth;
    }

    if (dateFilterMode === 'custom_range') {
      if (!startDate && !endDate) return true;
      if (startDate && !endDate) return m.joinDate >= startDate;
      if (!startDate && endDate) return m.joinDate <= endDate;
      return m.joinDate >= startDate && m.joinDate <= endDate;
    }

    return true;
  });

  // Final Filtered members list
  const filteredMembers = dateFilteredMembers.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesPlan = planFilter === 'all' || m.planId === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Export Athletes CSV
  const handleExportCSV = () => {
    exportMembersToCSV(filteredMembers, plans, `athletes_${dateFilterMode}`);
  };

  return (
    <div className="space-y-6" id="members-list-container">
      {/* Date Range & Monthly Tracking Control Bar */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm" id="members-date-filter-bar">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-lime-400 shrink-0" />
          <div>
            <h4 className="text-white font-bold text-sm">Athletes Joining & Activity Date Range</h4>
            <p className="text-slate-400 text-xs">Track active members and new athlete registrations by month or custom range</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5" id="members-date-filter-controls">
          <select
            value={dateFilterMode}
            onChange={(e) => setDateFilterMode(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            id="members-date-mode-select"
          >
            <option value="all">All Joined Athletes ({members.length})</option>
            <option value="this_month">Joined This Month ({new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })})</option>
            <option value="select_month">Joined Select Month...</option>
            <option value="custom_range">Joined Custom Range...</option>
          </select>

          {dateFilterMode === 'select_month' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
              id="members-month-picker"
            />
          )}

          {dateFilterMode === 'custom_range' && (
            <div className="flex items-center gap-1.5" id="members-custom-range-inputs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
                id="members-range-start-date"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
                id="members-range-end-date"
              />
            </div>
          )}

          <button
            onClick={handleExportCSV}
            className="bg-lime-400 hover:bg-lime-500 text-black px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-lime-400/5 ml-auto md:ml-0"
            id="export-athletes-csv-btn"
          >
            <Download className="w-3.5 h-3.5" />
            Export Athletes CSV
          </button>
        </div>
      </div>
      {/* Search and Filters Header */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-[#161B22] border border-slate-800 rounded-3xl p-5 shadow-sm" id="members-header-panel">
        <div className="flex-1 relative" id="search-input-wrapper">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3" id="filters-wrapper">
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5" id="status-filter-box">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Plan Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5" id="plan-filter-box">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="all">All Membership Plans</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Add Member Button */}
          <button
            onClick={() => { resetForm(); setIsAddOpen(true); }}
            className="bg-lime-400 hover:bg-lime-500 text-black px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md shadow-lime-400/5 cursor-pointer"
            id="register-member-btn"
          >
            <UserPlus className="w-4 h-4" />
            Add Athlete
          </button>
        </div>
      </div>

      {/* Main Grid: List table & details side-by-side */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="members-list-grid">
        {/* Members List Table */}
        <div className={`${selectedMember ? 'xl:col-span-2' : 'xl:col-span-3'} bg-[#161B22] border border-slate-800 rounded-3xl overflow-hidden shadow-sm`} id="members-table-card">
          <div className="p-5 border-b border-slate-800" id="table-card-header">
            <h3 className="text-white font-semibold font-display text-lg">Active Roster ({filteredMembers.length})</h3>
            <p className="text-slate-400 text-xs">Registered gym members and current statuses</p>
          </div>

          <div className="overflow-x-auto" id="members-table-scroller">
            <table className="w-full text-left border-collapse" id="members-main-table">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-semibold uppercase tracking-wider font-sans bg-slate-900/45">
                  <th className="py-3.5 px-5">Member</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Plan Locked</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm">
                {filteredMembers.map((m) => {
                  const plan = plans.find(p => p.id === m.planId);
                  return (
                    <tr 
                      key={m.id}
                      onClick={() => setSelectedMember(selectedMember?.id === m.id ? null : m)}
                      className={`cursor-pointer transition-colors ${selectedMember?.id === m.id ? 'bg-lime-400/5 border-l-4 border-l-lime-400' : 'hover:bg-slate-800/30'}`}
                      id={`member-row-${m.id}`}
                    >
                      <td className="py-3.5 px-5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 text-lime-400 font-display font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                          {m.photoUrl ? (
                            <img src={m.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            m.name.split(' ').map(n => n[0]).join('')
                          )}
                        </div>
                        <div>
                          <span className="block text-white font-semibold">{m.name}</span>
                          <span className="block text-[11px] text-slate-500 font-mono">ID: {m.id}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="block text-slate-300 font-sans">{m.phone}</span>
                        <span className="block text-slate-500 text-xs font-sans">{m.email || 'N/A'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="block text-white font-medium">{plan?.name || 'Default Basic'}</span>
                        <span className="block text-slate-500 text-xs">Joined {m.joinDate}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {(() => {
                          const period = getSubscriptionPeriod(m);
                          return (
                            <div className="space-y-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${period.badgeColor}`}>
                                {period.daysRemaining > 0 ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : period.daysRemaining === 0 ? (
                                  <AlertCircle className="w-3 h-3 animate-pulse text-amber-400" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-red-400" />
                                )}
                                {period.statusText}
                              </span>
                              <span className="block text-[11px] text-slate-400 font-mono">{period.daysText}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                             onClick={(e) => handleCheckInClick(m.id, e)}
                             title="Check-In Athlete"
                             className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white transition-colors cursor-pointer"
                             id={`quick-checkin-${m.id}`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setIsPaymentOpen(m)}
                            title="Record Payment"
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors cursor-pointer"
                            id={`quick-pay-${m.id}`}
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => startEdit(m, e)}
                            title="Edit Athlete"
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-lime-400 hover:text-black transition-colors cursor-pointer"
                            id={`quick-edit-${m.id}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(m.id, m.name, e)}
                            title="Remove Athlete"
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                            id={`quick-delete-${m.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <tr id="empty-members-row">
                    <td colSpan={5} className="py-12 text-center text-neutral-500 font-sans">
                      No matching athletes found. Register one to begin!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Member Details Side Panel */}
        {selectedMember && (
          <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 space-y-6 flex flex-col justify-between shadow-sm" id="member-detail-panel">
            <div className="space-y-5" id="member-detail-body">
              <div className="flex justify-between items-start" id="member-detail-header">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-lime-400/15 border border-lime-400/20 text-lime-400 font-display font-bold text-sm flex items-center justify-center overflow-hidden shrink-0">
                    {selectedMember.photoUrl ? (
                      <img src={selectedMember.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      selectedMember.name.split(' ').map(n => n[0]).join('')
                    )}
                  </div>
                  <div>
                    <h4 className="text-white font-bold font-display text-lg leading-snug">{selectedMember.name}</h4>
                    <span className="text-slate-500 font-mono text-[11px] block mt-0.5">ID: {selectedMember.id}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer bg-slate-900 border border-slate-800 hover:bg-slate-850 px-2.5 py-1 rounded-lg"
                  id="close-details-btn"
                >
                  ✕ Close
                </button>
              </div>

              {/* Dynamic Subscription / Fee Period Tracker Card */}
              {(() => {
                const period = getSubscriptionPeriod(selectedMember);
                const plan = plans.find(p => p.id === selectedMember.planId);
                return (
                  <div className="bg-[#1C2128] border border-slate-800 rounded-2xl p-4.5 space-y-3.5" id="fee-period-tracker-card">
                    <span className="block text-[10px] text-lime-400 uppercase font-bold tracking-wider">Fee Period Tracker</span>
                    
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <span className="block text-slate-500">Package Tier</span>
                        <span className="block text-white font-semibold mt-0.5">{plan?.name || 'Default Basic'}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500">Duration Cycle</span>
                        <span className="block text-white font-semibold mt-0.5">{plan ? `${plan.durationMonths} Month(s)` : 'N/A'}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-850 pt-2.5 grid grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <span className="block text-slate-500">Gym Joined Date</span>
                        <span className="block text-white font-semibold mt-0.5">{selectedMember.joinDate}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500">Next Due Date</span>
                        <span className="block text-lime-400 font-semibold mt-0.5 font-mono">{period.formattedDueDate}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-850 pt-2.5 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="block text-slate-500">Remaining Period</span>
                        <span className="block text-slate-300 font-medium mt-0.5">{period.daysText}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${period.badgeColor}`}>
                        {period.statusText}
                      </span>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800/85 rounded-xl p-3 text-[11px] text-slate-400 leading-normal">
                      {period.lastPaymentDate ? (
                        <span>Last payment of <strong className="text-white">Rs. {period.lastPaymentAmount}</strong> was logged on <strong className="text-white">{period.lastPaymentDate}</strong>.</span>
                      ) : (
                        <span className="text-amber-400/80">⚠️ No subscription payments logged yet. Fee tracker is active from gym joining date.</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Detail Items */}
              <div className="space-y-3.5 text-xs text-slate-300" id="detail-items">
                <div className="flex items-center gap-3" id="detail-phone">
                  <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{selectedMember.phone}</span>
                </div>
                <div className="flex items-center gap-3" id="detail-email">
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{selectedMember.email || 'No email registered'}</span>
                </div>
                {selectedMember.notes && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1" id="detail-notes">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Trainer Notes</span>
                    <p className="text-slate-300 leading-relaxed">{selectedMember.notes}</p>
                  </div>
                )}
                
                {/* Emergency Contact */}
                <div className="border-t border-slate-800 pt-3.5 space-y-2.5" id="detail-emergency-box">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold">Emergency Contact</span>
                  {selectedMember.emergencyContactName ? (
                    <div>
                      <span className="block font-medium text-white">{selectedMember.emergencyContactName}</span>
                      <span className="text-slate-400 text-[11px] block mt-0.5">{selectedMember.emergencyContactPhone}</span>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic block">None registered</span>
                  )}
                </div>

                {/* History Analytics (Attendance & Payments counts) */}
                <div className="border-t border-slate-800 pt-3.5 grid grid-cols-2 gap-3" id="detail-history-badges">
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2.5 text-center">
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Gym Check-Ins</span>
                    <span className="block font-mono font-bold text-lg text-white mt-1">
                      {attendance.filter(a => a.memberId === selectedMember.id).length}
                    </span>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2.5 text-center">
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Payments Logged</span>
                    <span className="block font-mono font-bold text-lg text-white mt-1">
                      {payments.filter(p => p.memberId === selectedMember.id).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex gap-2" id="detail-action-footer">
              <button
                onClick={(e) => startEdit(selectedMember, e)}
                className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-semibold py-2 rounded-xl transition-all cursor-pointer"
                id="edit-detail-btn"
              >
                Modify Info
              </button>
              <button
                onClick={() => setIsPaymentOpen(selectedMember)}
                className="flex-1 bg-lime-400/10 border border-lime-400/20 text-lime-400 hover:bg-lime-400 hover:text-black text-xs font-semibold py-2 rounded-xl transition-all cursor-pointer"
                id="pay-detail-btn"
              >
                Record Payment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Member Modal Dialog */}
      {(isAddOpen || editingMember) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" id="member-form-modal">
          <div className="bg-[#161B22] border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl" id="member-modal-content">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900" id="modal-header-container">
              <h3 className="text-white font-semibold font-display text-lg">
                {editingMember ? 'Edit Athlete Record' : 'Register New Athlete'}
              </h3>
              <button 
                onClick={() => { setIsAddOpen(false); setEditingMember(null); resetForm(); }}
                className="text-slate-400 hover:text-white cursor-pointer"
                id="close-modal-x"
              >
                ✕
              </button>
            </div>

            <form onSubmit={editingMember ? handleEditSubmit : handleAddSubmit} className="p-5 space-y-4" id="member-form">
              <div className="grid grid-cols-2 gap-4" id="form-grid">
                <div className="col-span-2" id="form-field-name">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Athlete Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lime-400"
                  />
                </div>

                <div id="form-field-email">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lime-400"
                  />
                </div>

                <div id="form-field-phone">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0300-1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lime-400"
                  />
                </div>

                <div id="form-field-plan">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Locker Plan</label>
                  <select
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none cursor-pointer"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Rs. {p.price})</option>
                    ))}
                  </select>
                </div>

                <div id="form-field-status">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Membership Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div className="col-span-2" id="form-field-joindate">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Gym Joining Date</label>
                  <input
                    type="date"
                    required
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lime-400"
                  />
                </div>

                <div className="col-span-2 border-t border-slate-800 pt-4" id="form-field-photo-upload">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase mb-3">Profile Photo (Optional)</span>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      {photoUrl ? (
                        <img src={photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Camera className="w-6 h-6 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
                          <Upload className="w-3.5 h-3.5 text-lime-400" />
                          {photoUrl ? 'Change Photo' : 'Upload Photo'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                        {photoUrl && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">Supported formats: JPG, PNG, GIF. Max size 1.5MB.</p>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 border-t border-slate-800 pt-4" id="form-field-emergency">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase mb-3">Emergency Information</span>
                  <div className="grid grid-cols-2 gap-3" id="emergency-grid">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Contact Name</label>
                      <input
                        type="text"
                        placeholder="Guardian / Spouse Name"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Contact Phone</label>
                      <input
                        type="tel"
                        placeholder="Emergency Phone"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-2" id="form-field-notes">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Athlete / Trainer Notes</label>
                  <textarea
                    placeholder="Specific physical conditions, health constraints, preferences..."
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lime-400 resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3" id="form-submit-footer">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setEditingMember(null); resetForm(); }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-sm font-semibold text-slate-300 cursor-pointer"
                  id="cancel-modal-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-lime-400 hover:bg-lime-500 text-sm font-bold text-black cursor-pointer"
                  id="save-member-btn"
                >
                  {editingMember ? 'Save Modifications' : 'Register Athlete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Dialog */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" id="payment-modal">
          <div className="bg-[#161B22] border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl" id="payment-modal-content">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900" id="payment-header-container">
              <div>
                <h3 className="text-white font-semibold font-display text-base">Record Subscription Payment</h3>
                <p className="text-slate-400 text-xs">Logging transaction details for {isPaymentOpen.name}</p>
              </div>
              <button 
                onClick={() => setIsPaymentOpen(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
                id="close-payment-x"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4" id="payment-form">
              <div id="payment-field-amount">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Amount Paid (PKR) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 49"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                />
              </div>

              <div id="payment-field-method">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Payment Channel</label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none cursor-pointer"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Bank Transfer">Bank Wire Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div id="payment-field-notes">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Reference / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Transaction #9A24D, cash bag ID..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3" id="payment-submit-footer">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-sm font-semibold text-slate-300 cursor-pointer"
                  id="cancel-payment-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-lime-400 hover:bg-lime-500 text-sm font-bold text-black cursor-pointer"
                  id="save-payment-btn"
                >
                  Log Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
