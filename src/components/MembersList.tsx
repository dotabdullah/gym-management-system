import { useState, useEffect, FormEvent, MouseEvent, ChangeEvent } from 'react';
import { Member, Plan, Payment, AttendanceRecord } from '../types';
import { exportMembersToCSV, exportAttendanceToCSV } from '../lib/csvHelper';
import { 
  generateWhatsAppReminderMessage, 
  openWhatsApp,
  openWhatsAppLink, 
  formatPhoneNumberForWhatsApp,
  getCurrencySymbol,
  getWhatsAppDirectUrl
} from '../lib/whatsappHelper';
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
  Users,
  Clock,
  MessageCircle,
  Send,
  Globe,
  CreditCard,
  Copy,
  Check
} from 'lucide-react';

interface MembersListProps {
  members: Member[];
  plans: Plan[];
  payments: Payment[];
  attendance: AttendanceRecord[];
  gymName?: string;
  gymCountryCode?: string;
  gymCurrency?: string;
  isOnline?: boolean;
  onAddMember: (member: Omit<Member, 'id' | 'updatedAt'>) => void;
  onUpdateMember: (member: Member) => void;
  onDeleteMember: (id: string) => void;
  onRecordPayment: (payment: Omit<Payment, 'id' | 'updatedAt'>) => void;
  onCheckIn: (memberId: string) => void;
  onCustomCheckIn?: (memberId: string, customDate: string, customTime?: string) => void;
  onDeleteAttendance?: (id: string) => void;
}

export default function MembersList({
  members,
  plans,
  payments,
  attendance,
  gymName = 'Gym Management Center',
  gymCountryCode = '+92',
  gymCurrency = 'PKR',
  isOnline = true,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onRecordPayment,
  onCheckIn,
  onCustomCheckIn,
  onDeleteAttendance
}: MembersListProps) {
  const currSymbol = getCurrencySymbol(gymCurrency);
  const [isCopiedWhatsApp, setIsCopiedWhatsApp] = useState(false);
  const [isCopiedUrl, setIsCopiedUrl] = useState(false);
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

  // Selected Plan state in Payment Modal
  const [selectedPaymentPlanId, setSelectedPaymentPlanId] = useState<string>('');

  // When payment modal opens, initialize selected plan ID
  useEffect(() => {
    if (isPaymentOpen) {
      setSelectedPaymentPlanId(isPaymentOpen.planId || plans[0]?.id || '');
    }
  }, [isPaymentOpen, plans]);

  // Handle Payment Submit with Dues and Extra/Advance Calculation
  const handlePaymentSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isPaymentOpen || !paymentAmount) return;

    const currentMember = isPaymentOpen;
    const targetPlanId = selectedPaymentPlanId || currentMember.planId || plans[0]?.id || '';
    const currentPlan = plans.find(p => p.id === targetPlanId);
    const planPrice = currentPlan ? currentPlan.price : 0;
    const previousDues = currentMember.dueBalance || 0;
    const previousAdvance = currentMember.advanceBalance || 0;
    
    // Total required to cover current plan + previous dues - previous advance
    const totalRequired = Math.max(0, (planPrice + previousDues) - previousAdvance);
    const paid = Number(paymentAmount) || 0;

    let dueAmount = 0;
    let extraAmount = 0;

    if (paid < totalRequired) {
      dueAmount = totalRequired - paid;
    } else if (paid > totalRequired) {
      extraAmount = paid - totalRequired;
    }

    onRecordPayment({
      memberId: currentMember.id,
      planId: targetPlanId,
      amount: paid,
      planPrice,
      dueAmount,
      extraAmount,
      date: new Date().toISOString().split('T')[0],
      paymentMethod,
      notes: paymentNotes
    });

    setIsPaymentOpen(null);
    setPaymentAmount('');
    setPaymentNotes('');
    alert(`Payment of Rs. ${paid.toLocaleString()} logged successfully!${dueAmount > 0 ? ` Remaining Due: Rs. ${dueAmount.toLocaleString()}` : ''}${extraAmount > 0 ? ` Extra Advance Saved: Rs. ${extraAmount.toLocaleString()}` : ''}`);
  };

  // Date Range Filters for Athletes (Joining Date vs Check-In Activity Date vs Payment Ledger Date)
  const [dateFilterType, setDateFilterType] = useState<'join_date' | 'checkin_date' | 'payment_date'>('join_date');
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'this_month' | 'select_month' | 'custom_range'>('all');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Selected Athlete-Specific Attendance Date Filter State
  const [athleteAttFilterMode, setAthleteAttFilterMode] = useState<'all' | 'this_month' | 'select_month' | 'custom_range'>('all');
  const [athleteAttSelectedMonth, setAthleteAttSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [athleteAttStartDate, setAthleteAttStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [athleteAttEndDate, setAthleteAttEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Selected Athlete-Specific Payment & Dues Date Filter State
  const [athletePayFilterMode, setAthletePayFilterMode] = useState<'all' | 'this_month' | 'select_month' | 'custom_range'>('all');
  const [athletePaySelectedMonth, setAthletePaySelectedMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [athletePayStartDate, setAthletePayStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [athletePayEndDate, setAthletePayEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Custom / Back-Dated Check-In Modal State
  const [isCustomCheckInModalOpen, setIsCustomCheckInModalOpen] = useState(false);
  const [customCheckInDate, setCustomCheckInDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customCheckInTime, setCustomCheckInTime] = useState(() => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
  const [customCheckInMemberId, setCustomCheckInMemberId] = useState<string>('');

  // WhatsApp Reminder Preview Modal State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppMember, setWhatsAppMember] = useState<Member | null>(null);
  const [whatsAppCustomMessage, setWhatsAppCustomMessage] = useState('');

  const handleOpenWhatsAppModal = (member: Member) => {
    if (!isOnline) {
      alert("Note: Internet connection is needed to launch WhatsApp Web / App.");
    }
    const subInfo = getSubscriptionPeriod(member);
    const plan = plans.find(p => p.id === member.planId);
    
    const msg = generateWhatsAppReminderMessage({
      athleteName: member.name,
      phone: member.phone,
      countryCode: gymCountryCode,
      daysLeft: subInfo.daysRemaining,
      planName: plan?.name || 'Standard Package',
      gymName: gymName,
      availablePlans: plans.map(p => ({ name: p.name, price: p.price, durationMonths: p.durationMonths }))
    });

    setWhatsAppMember(member);
    setWhatsAppCustomMessage(msg);
    setIsWhatsAppModalOpen(true);
  };

  // Date Range Filter Logic for Members (Joining Date OR Check-In Activity Date)
  const dateFilteredMembers = members.filter(m => {
    if (dateFilterMode === 'all') return true;

    if (dateFilterType === 'join_date') {
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
    } else if (dateFilterType === 'payment_date') {
      // Payment & Ledger date filtering
      const memberPayments = payments.filter(p => p.memberId === m.id);
      if (dateFilterMode === 'this_month') {
        const currentMonth = new Date().toISOString().substring(0, 7);
        return memberPayments.some(p => p.date.substring(0, 7) === currentMonth);
      }

      if (dateFilterMode === 'select_month') {
        return memberPayments.some(p => p.date.substring(0, 7) === selectedMonth);
      }

      if (dateFilterMode === 'custom_range') {
        if (!startDate && !endDate) return memberPayments.length > 0;
        return memberPayments.some(p => {
          if (startDate && !endDate) return p.date >= startDate;
          if (!startDate && endDate) return p.date <= endDate;
          return p.date >= startDate && p.date <= endDate;
        });
      }
    } else {
      // Check-in date activity filtering
      const memberLogs = attendance.filter(a => a.memberId === m.id);
      if (dateFilterMode === 'this_month') {
        const currentMonth = new Date().toISOString().substring(0, 7);
        return memberLogs.some(a => a.date.substring(0, 7) === currentMonth);
      }

      if (dateFilterMode === 'select_month') {
        return memberLogs.some(a => a.date.substring(0, 7) === selectedMonth);
      }

      if (dateFilterMode === 'custom_range') {
        if (!startDate && !endDate) return memberLogs.length > 0;
        return memberLogs.some(a => {
          if (startDate && !endDate) return a.date >= startDate;
          if (!startDate && endDate) return a.date <= endDate;
          return a.date >= startDate && a.date <= endDate;
        });
      }
    }

    return true;
  });

  // Filter selected member's attendance records by date
  const selectedMemberAttendance = selectedMember ? attendance.filter(a => a.memberId === selectedMember.id) : [];

  const filteredSelectedMemberAttendance = selectedMemberAttendance.filter(a => {
    if (athleteAttFilterMode === 'all') return true;

    if (athleteAttFilterMode === 'this_month') {
      const currentMonth = new Date().toISOString().substring(0, 7);
      return a.date.substring(0, 7) === currentMonth;
    }

    if (athleteAttFilterMode === 'select_month') {
      return a.date.substring(0, 7) === athleteAttSelectedMonth;
    }

    if (athleteAttFilterMode === 'custom_range') {
      if (!athleteAttStartDate && !athleteAttEndDate) return true;
      if (athleteAttStartDate && !athleteAttEndDate) return a.date >= athleteAttStartDate;
      if (!athleteAttStartDate && athleteAttEndDate) return a.date <= athleteAttEndDate;
      return a.date >= athleteAttStartDate && a.date <= athleteAttEndDate;
    }

    return true;
  }).sort((a, b) => {
    const dComp = b.date.localeCompare(a.date);
    if (dComp !== 0) return dComp;
    return b.checkInTime.localeCompare(a.checkInTime);
  });

  // Filter selected member's payment and dues ledger records by date
  const selectedMemberPayments = selectedMember ? payments.filter(p => p.memberId === selectedMember.id) : [];
  const totalAdvanceCreditRecorded = selectedMemberPayments.reduce((s, p) => s + (p.extraAmount || 0), 0);
  const totalDuesRecorded = selectedMemberPayments.reduce((s, p) => s + (p.dueAmount || 0), 0);

  const filteredSelectedMemberPayments = selectedMemberPayments.filter(p => {
    if (athletePayFilterMode === 'all') return true;

    if (athletePayFilterMode === 'this_month') {
      const currentMonth = new Date().toISOString().substring(0, 7);
      return p.date.substring(0, 7) === currentMonth;
    }

    if (athletePayFilterMode === 'select_month') {
      return p.date.substring(0, 7) === athletePaySelectedMonth;
    }

    if (athletePayFilterMode === 'custom_range') {
      if (!athletePayStartDate && !athletePayEndDate) return true;
      if (athletePayStartDate && !athletePayEndDate) return p.date >= athletePayStartDate;
      if (!athletePayStartDate && athletePayEndDate) return p.date <= athletePayStartDate;
      return p.date >= athletePayStartDate && p.date <= athletePayEndDate;
    }

    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

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

  // Members with 1 day remaining or due today
  const expiringOneDayMembers = members.filter(m => {
    const period = getSubscriptionPeriod(m);
    return period.daysRemaining === 1 || period.daysRemaining === 0;
  });

  return (
    <div className="space-y-6" id="members-list-container">
      {/* Date Range & Monthly Tracking Control Bar */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm" id="members-date-filter-bar">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-lime-400 shrink-0" />
          <div>
            <h4 className="text-white font-bold text-sm">Athletes Activity & Financial Ledger Filter</h4>
            <p className="text-slate-400 text-xs">Filter members by registration date, date-wise check-ins, or fee payment dates</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5" id="members-date-filter-controls">
          <select
            value={dateFilterType}
            onChange={(e) => setDateFilterType(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-2.5 py-2 text-xs text-lime-400 font-semibold focus:outline-none cursor-pointer"
            id="members-date-type-select"
          >
            <option value="join_date">📅 Filter by Joining Date</option>
            <option value="checkin_date">⏱️ Filter by Check-In Activity Date</option>
            <option value="payment_date">💵 Filter by Fee / Payment Date</option>
          </select>

          <select
            value={dateFilterMode}
            onChange={(e) => setDateFilterMode(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            id="members-date-mode-select"
          >
            <option value="all">All Dates ({members.length})</option>
            <option value="this_month">This Month ({new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })})</option>
            <option value="select_month">Select Month...</option>
            <option value="custom_range">Custom Date Range...</option>
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

      {/* 📱 WhatsApp Expiry Notification Banner (1 Day Remaining / Due) */}
      {expiringOneDayMembers.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-[#161B22] to-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-lg shadow-emerald-950/20" id="whatsapp-expiring-banner">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-white font-bold text-sm">Impending Plan Expirations ({expiringOneDayMembers.length} Athlete{expiringOneDayMembers.length > 1 ? 's' : ''})</h4>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  1 Day Left / Due
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Send instant WhatsApp messages directly to their mobile number with pre-filled package details & fee renewal options.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {expiringOneDayMembers.slice(0, 3).map((expMember) => (
              <button
                key={expMember.id}
                onClick={() => handleOpenWhatsAppModal(expMember)}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                title={`Send WhatsApp reminder to ${expMember.name}`}
                id={`whatsapp-banner-btn-${expMember.id}`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Remind {expMember.name.split(' ')[0]}</span>
              </button>
            ))}
            {expiringOneDayMembers.length > 3 && (
              <span className="text-xs text-slate-400 font-mono pl-1">
                +{expiringOneDayMembers.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

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
                          {m.phone && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWhatsAppModal(m);
                              }}
                              title="Send WhatsApp Package Reminder"
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer"
                              id={`quick-whatsapp-${m.id}`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedMember(m)}
                            title="View Date-wise Attendance Logs"
                            className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white transition-colors cursor-pointer"
                            id={`view-att-logs-${m.id}`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                          <button
                             onClick={(e) => handleCheckInClick(m.id, e)}
                             title="Quick Check-In Today"
                             className="p-1.5 rounded-lg bg-lime-400/10 text-lime-400 hover:bg-lime-400 hover:text-black transition-colors cursor-pointer"
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
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Total Check-Ins</span>
                    <span className="block font-mono font-bold text-lg text-white mt-1">
                      {selectedMemberAttendance.length}
                    </span>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2.5 text-center">
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Payments Logged</span>
                    <span className="block font-mono font-bold text-lg text-white mt-1">
                      {payments.filter(p => p.memberId === selectedMember.id).length}
                    </span>
                  </div>
                </div>

                {/* 💵 Date-Wise Payment & Dues Ledger Tracker */}
                <div className="bg-[#1C2128] border border-slate-800 rounded-2xl p-4 space-y-3.5" id="member-payment-history-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Payment & Dues Ledger Tracker</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      {filteredSelectedMemberPayments.length} Records
                    </span>
                  </div>

                  {/* Summary Pills for Athlete's Ledger */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                      <span className="text-slate-500 block uppercase font-bold text-[9px] truncate">Total Paid</span>
                      <strong className="text-emerald-400 text-xs font-mono">
                        {currSymbol} {filteredSelectedMemberPayments.reduce((s, p) => s + p.amount, 0).toLocaleString()}
                      </strong>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                      <span className="text-slate-500 block uppercase font-bold text-[9px] truncate" title="Total Due Left Record">Total Due Left</span>
                      <strong className={`text-xs font-mono ${(totalDuesRecorded > 0 ? totalDuesRecorded : (selectedMember.dueBalance || 0)) > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                        {currSymbol} {(totalDuesRecorded > 0 ? totalDuesRecorded : (selectedMember.dueBalance || 0)).toLocaleString()}
                      </strong>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
                      <span className="text-slate-500 block uppercase font-bold text-[9px] truncate" title="Total Advance Credit Record">Total Advance Credit</span>
                      <strong className={`text-xs font-mono ${(totalAdvanceCreditRecorded > 0 ? totalAdvanceCreditRecorded : (selectedMember.advanceBalance || 0)) > 0 ? 'text-lime-400 font-bold' : 'text-slate-400'}`}>
                        {currSymbol} {(totalAdvanceCreditRecorded > 0 ? totalAdvanceCreditRecorded : (selectedMember.advanceBalance || 0)).toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  {/* Filter Controls for Payment Dates */}
                  <div className="space-y-2 bg-slate-900/80 border border-slate-800 rounded-xl p-2.5" id="athlete-pay-filter-box">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Filter className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Filter Payment Dates:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={athletePayFilterMode}
                        onChange={(e: any) => setAthletePayFilterMode(e.target.value)}
                        className="bg-slate-950 border border-slate-800 focus:border-emerald-400 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none cursor-pointer flex-1"
                        id="athlete-pay-mode-select"
                      >
                        <option value="all">All Payments ({selectedMemberPayments.length})</option>
                        <option value="this_month">This Month ({new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })})</option>
                        <option value="select_month">Select Month...</option>
                        <option value="custom_range">Custom Range...</option>
                      </select>

                      {athletePayFilterMode === 'select_month' && (
                        <input
                          type="month"
                          value={athletePaySelectedMonth}
                          onChange={(e) => setAthletePaySelectedMonth(e.target.value)}
                          className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1 text-[11px] font-mono"
                        />
                      )}

                      {athletePayFilterMode === 'custom_range' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={athletePayStartDate}
                            onChange={(e) => setAthletePayStartDate(e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-white rounded-lg px-1.5 py-0.5 text-[10px] font-mono"
                          />
                          <span className="text-slate-500 text-[10px]">to</span>
                          <input
                            type="date"
                            value={athletePayEndDate}
                            onChange={(e) => setAthletePayEndDate(e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-white rounded-lg px-1.5 py-0.5 text-[10px] font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment & Dues Log Records List */}
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1" id="athlete-payment-records-list">
                    {filteredSelectedMemberPayments.map((pay) => {
                      const payDate = new Date(pay.date + 'T00:00:00');
                      const formattedDate = isNaN(payDate.getTime()) ? pay.date : payDate.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });
                      const planObj = plans.find(p => p.id === pay.planId);

                      return (
                        <div key={pay.id} className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded-xl p-2.5 space-y-1.5 text-xs transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold font-mono text-[11px]">{formattedDate}</span>
                              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded font-sans">
                                {pay.paymentMethod || 'Cash'}
                              </span>
                            </div>
                            <span className="font-mono font-extrabold text-emerald-400 text-sm">
                              Rs. {pay.amount.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">
                              Package Rate: <strong className="text-slate-200">Rs. {(pay.planPrice || planObj?.price || pay.amount).toLocaleString()}</strong>
                              {planObj && ` (${planObj.name})`}
                            </span>
                          </div>

                          {(pay.dueAmount || 0) > 0 ? (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-1.5 text-[10px] text-amber-300 font-bold flex justify-between">
                              <span>⚠️ Remaining Unpaid Due Logged:</span>
                              <span>Rs. {pay.dueAmount?.toLocaleString()}</span>
                            </div>
                          ) : (pay.extraAmount || 0) > 0 ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-1.5 text-[10px] text-emerald-300 font-bold flex justify-between">
                              <span>✨ Advance Credit Recorded:</span>
                              <span>Rs. {pay.extraAmount?.toLocaleString()}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-lime-400/90 font-medium flex items-center gap-1">
                              <span>✅ Paid in Full (Zero Balance)</span>
                            </div>
                          )}

                          {pay.notes && (
                            <p className="text-[10px] text-slate-500 italic border-t border-slate-800/60 pt-1">
                              Note: {pay.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {filteredSelectedMemberPayments.length === 0 && (
                      <div className="p-3 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                        No fee payments logged for selected date range.
                      </div>
                    )}
                  </div>
                </div>

                {/* 📅 Date-Wise Attendance Log & Filter Box */}
                <div className="bg-[#1C2128] border border-slate-800 rounded-2xl p-4 space-y-3.5" id="member-attendance-history-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Attendance Date Tracker</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                      {filteredSelectedMemberAttendance.length} Logs
                    </span>
                  </div>

                  {/* Filter Controls */}
                  <div className="space-y-2 bg-slate-900/80 border border-slate-800 rounded-xl p-2.5" id="athlete-att-filter-box">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Filter className="w-3.5 h-3.5 text-purple-400" />
                      <span>Filter Check-in Dates:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={athleteAttFilterMode}
                        onChange={(e: any) => setAthleteAttFilterMode(e.target.value)}
                        className="bg-slate-950 border border-slate-800 focus:border-purple-400 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none cursor-pointer flex-1"
                        id="athlete-att-mode-select"
                      >
                        <option value="all">All Check-Ins ({selectedMemberAttendance.length})</option>
                        <option value="this_month">This Month ({new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })})</option>
                        <option value="select_month">Select Month...</option>
                        <option value="custom_range">Custom Range...</option>
                      </select>

                      {athleteAttFilterMode === 'select_month' && (
                        <input
                          type="month"
                          value={athleteAttSelectedMonth}
                          onChange={(e) => setAthleteAttSelectedMonth(e.target.value)}
                          className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1 text-[11px] font-mono"
                        />
                      )}

                      {athleteAttFilterMode === 'custom_range' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={athleteAttStartDate}
                            onChange={(e) => setAthleteAttStartDate(e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-white rounded-lg px-1.5 py-0.5 text-[10px] font-mono"
                          />
                          <span className="text-slate-500 text-[10px]">to</span>
                          <input
                            type="date"
                            value={athleteAttEndDate}
                            onChange={(e) => setAthleteAttEndDate(e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-white rounded-lg px-1.5 py-0.5 text-[10px] font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attendance Log Records Table */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1" id="athlete-checkin-records-list">
                    {filteredSelectedMemberAttendance.map((rec) => {
                      const recDate = new Date(rec.date + 'T00:00:00');
                      const formattedDate = isNaN(recDate.getTime()) ? rec.date : recDate.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });
                      return (
                        <div key={rec.id} className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded-xl p-2 flex items-center justify-between text-xs transition-colors">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-bold font-mono text-[11px]">{formattedDate}</span>
                              <span className="text-[10px] text-purple-300 bg-purple-500/15 border border-purple-500/20 px-1.5 py-0.2 rounded font-mono">
                                ⏰ {rec.checkInTime}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block">Verified Floor Entry</span>
                          </div>

                          {onDeleteAttendance && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete check-in record for ${rec.date} at ${rec.checkInTime}?`)) {
                                  onDeleteAttendance(rec.id);
                                }
                              }}
                              title="Delete attendance record"
                              className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {filteredSelectedMemberAttendance.length === 0 && (
                      <div className="p-3 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                        No check-in logs found for selected date range.
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setCustomCheckInMemberId(selectedMember.id);
                        setCustomCheckInDate(new Date().toISOString().split('T')[0]);
                        setIsCustomCheckInModalOpen(true);
                      }}
                      className="flex-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Log Past Check-In Date
                    </button>

                    <button
                      onClick={() => {
                        exportAttendanceToCSV(filteredSelectedMemberAttendance, [selectedMember], `${selectedMember.name.replace(/\s+/g, '_')}_attendance`);
                      }}
                      title="Export Athlete Check-in History CSV"
                      className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 p-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex flex-col gap-2" id="detail-action-footer">
              {selectedMember.phone && (
                <button
                  onClick={() => handleOpenWhatsAppModal(selectedMember)}
                  className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  id="whatsapp-detail-btn"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>Send WhatsApp Expiry Reminder</span>
                </button>
              )}
              <div className="flex gap-2">
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
              {/* Plan Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Allotted Plan / Package</label>
                <select
                  value={selectedPaymentPlanId}
                  onChange={(e) => setSelectedPaymentPlanId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none cursor-pointer"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Rs. {p.price.toLocaleString()} ({p.durationMonths} month{p.durationMonths > 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
              </div>

              {/* Financial Calculation Breakdown Card */}
              {(() => {
                const targetPlan = plans.find(p => p.id === (selectedPaymentPlanId || isPaymentOpen.planId)) || plans[0];
                const planPrice = targetPlan ? targetPlan.price : 0;
                const prevDue = isPaymentOpen.dueBalance || 0;
                const prevAdvance = isPaymentOpen.advanceBalance || 0;
                const totalTarget = Math.max(0, (planPrice + prevDue) - prevAdvance);
                const currentPaid = Number(paymentAmount) || 0;
                const netBalance = currentPaid - totalTarget;

                return (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Plan Rate ({targetPlan?.name || 'Package'}):</span>
                      <strong className="text-white">Rs. {planPrice.toLocaleString()}</strong>
                    </div>
                    {prevDue > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>Previous Unpaid Dues:</span>
                        <strong>+ Rs. {prevDue.toLocaleString()}</strong>
                      </div>
                    )}
                    {prevAdvance > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Previous Advance Credit:</span>
                        <strong>- Rs. {prevAdvance.toLocaleString()}</strong>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-800 pt-1.5 font-bold text-white">
                      <span>Total Expected Today:</span>
                      <span className="text-lime-400 font-sans font-extrabold text-sm">Rs. {totalTarget.toLocaleString()}</span>
                    </div>

                    {paymentAmount !== '' && (
                      <div className="border-t border-slate-800 pt-2 text-[11px]">
                        {netBalance < 0 ? (
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-amber-300 flex justify-between font-sans">
                            <span>⚠️ Remaining Unpaid Due:</span>
                            <strong className="font-bold">Rs. {Math.abs(netBalance).toLocaleString()}</strong>
                          </div>
                        ) : netBalance > 0 ? (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 text-emerald-300 flex justify-between font-sans">
                            <span>✨ Extra Payment / Advance:</span>
                            <strong className="font-bold">Rs. {netBalance.toLocaleString()}</strong>
                          </div>
                        ) : (
                          <div className="bg-lime-500/10 border border-lime-500/20 rounded-xl p-2 text-lime-300 flex justify-between font-sans font-bold">
                            <span>✅ Paid in Full (Zero Balance)</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div id="payment-field-amount">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Amount Paid Today (PKR) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none font-bold"
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
                  placeholder="e.g. Transaction ID, receipt #..."
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
                  className="px-5 py-2 rounded-xl bg-lime-400 hover:bg-lime-500 text-sm font-bold text-black cursor-pointer shadow-md shadow-lime-400/10"
                  id="save-payment-btn"
                >
                  Confirm & Log Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Attendance on Custom Date Modal */}
      {isCustomCheckInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" id="custom-checkin-modal">
          <div className="bg-[#161B22] border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-5 space-y-4" id="custom-checkin-card">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3" id="custom-checkin-header">
              <div>
                <h3 className="text-white font-bold text-base font-display">Log Attendance on Custom Date</h3>
                <p className="text-slate-400 text-xs">Record check-in date & time for athlete</p>
              </div>
              <button 
                onClick={() => setIsCustomCheckInModalOpen(false)} 
                className="text-slate-400 hover:text-white cursor-pointer"
                id="close-custom-checkin-btn"
              >
                ✕
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (onCustomCheckIn && customCheckInMemberId) {
                  onCustomCheckIn(customCheckInMemberId, customCheckInDate, customCheckInTime);
                  alert(`Successfully logged check-in for ${customCheckInDate} at ${customCheckInTime}!`);
                  setIsCustomCheckInModalOpen(false);
                } else {
                  onCheckIn(customCheckInMemberId);
                  setIsCustomCheckInModalOpen(false);
                }
              }} 
              className="space-y-3.5"
              id="custom-checkin-form"
            >
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Target Athlete</label>
                <select
                  value={customCheckInMemberId}
                  onChange={(e) => setCustomCheckInMemberId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-purple-400 rounded-xl px-3 py-2 text-white text-xs focus:outline-none cursor-pointer"
                  id="custom-checkin-athlete-select"
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} (Phone: {m.phone})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Check-In Date *</label>
                  <input
                    type="date"
                    required
                    value={customCheckInDate}
                    onChange={(e) => setCustomCheckInDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-purple-400 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none"
                    id="custom-checkin-date-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Check-In Time *</label>
                  <input
                    type="time"
                    required
                    value={customCheckInTime}
                    onChange={(e) => setCustomCheckInTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-purple-400 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none"
                    id="custom-checkin-time-input"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2" id="custom-checkin-footer">
                <button
                  type="button"
                  onClick={() => setIsCustomCheckInModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                  id="cancel-custom-checkin-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  id="save-custom-checkin-btn"
                >
                  Save Attendance Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📱 WhatsApp Expiry Message Customizer & Sender Modal */}
      {isWhatsAppModalOpen && whatsAppMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" id="whatsapp-preview-modal">
          <div className="bg-[#161B22] border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl space-y-0" id="whatsapp-modal-container">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <MessageCircle className="w-5 h-5" />
                <h3 className="text-base font-bold font-display text-white">WhatsApp Expiry Reminder</h3>
              </div>
              <button
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                id="close-whatsapp-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 text-xs space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Recipient Athlete:</span>
                  <strong className="text-white font-semibold">{whatsAppMember.name}</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Phone Number:</span>
                  <span className="text-emerald-400 font-mono font-bold">{formatPhoneNumberForWhatsApp(whatsAppMember.phone, gymCountryCode)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Country Prefix:</span>
                  <span className="text-slate-400 font-mono">{gymCountryCode}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Message Text Preview (Editable before launching WhatsApp)
                </label>
                <textarea
                  rows={8}
                  value={whatsAppCustomMessage}
                  onChange={(e) => setWhatsAppCustomMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-400 rounded-2xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400 leading-relaxed"
                  id="whatsapp-text-editor"
                />
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-[11px] text-emerald-300 leading-normal flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Desktop .exe compatibility:</strong> Click <strong>Direct API Link</strong> or <strong>Web WhatsApp</strong>. If your desktop container blocks opening popups, click <strong>Copy Web Link</strong> below and paste into Chrome / Edge!
                </span>
              </div>

              {/* Direct Link Copy Bar */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Direct WhatsApp URL</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={getWhatsAppDirectUrl(whatsAppMember.phone, gymCountryCode, whatsAppCustomMessage, 'api')}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-emerald-400 focus:outline-none truncate"
                    id="whatsapp-direct-url-input"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const directUrl = getWhatsAppDirectUrl(whatsAppMember.phone, gymCountryCode, whatsAppCustomMessage, 'api');
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(directUrl);
                        setIsCopiedUrl(true);
                        setTimeout(() => setIsCopiedUrl(false), 2500);
                      }
                    }}
                    className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    id="copy-whatsapp-url-btn"
                  >
                    {isCopiedUrl ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{isCopiedUrl ? 'Copied URL!' : 'Copy URL'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col space-y-2 p-6 border-t border-slate-800 bg-slate-900/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    openWhatsApp(whatsAppMember.phone, whatsAppCustomMessage, 'app', gymCountryCode);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10"
                  id="launch-app-whatsapp-btn"
                >
                  <Send className="w-4 h-4 text-black" />
                  <span>WhatsApp Desktop App (.exe)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    openWhatsApp(whatsAppMember.phone, whatsAppCustomMessage, 'api', gymCountryCode);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-xs font-bold py-2.5 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  id="launch-api-whatsapp-btn"
                >
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>Direct Web API</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    openWhatsApp(whatsAppMember.phone, whatsAppCustomMessage, 'web', gymCountryCode);
                  }}
                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-semibold py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 text-center"
                  id="launch-web-whatsapp-btn"
                >
                  <span>Web WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const cleanPhone = formatPhoneNumberForWhatsApp(whatsAppMember.phone, gymCountryCode);
                    const linkUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsAppCustomMessage)}`;
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(linkUrl);
                      setIsCopiedUrl(true);
                      setTimeout(() => setIsCopiedUrl(false), 2500);
                    }
                  }}
                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-emerald-400 text-xs font-semibold py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 text-center"
                  id="copy-whatsapp-link-btn"
                >
                  {isCopiedUrl ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{isCopiedUrl ? 'Copied Link!' : 'Copy Web Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (navigator.clipboard) {
                      const fullCopyText = `Phone: ${formatPhoneNumberForWhatsApp(whatsAppMember.phone, gymCountryCode)}\n\n${whatsAppCustomMessage}`;
                      navigator.clipboard.writeText(fullCopyText);
                      setIsCopiedWhatsApp(true);
                      setTimeout(() => setIsCopiedWhatsApp(false), 2500);
                    }
                  }}
                  className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-lime-400 text-xs font-semibold py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  id="copy-whatsapp-msg-btn"
                >
                  {isCopiedWhatsApp ? <Check className="w-3.5 h-3.5 text-lime-400" /> : <Copy className="w-3.5 h-3.5 text-lime-400" />}
                  <span>{isCopiedWhatsApp ? 'Copied Text!' : 'Copy Text'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
