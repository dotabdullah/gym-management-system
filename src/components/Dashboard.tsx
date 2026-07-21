import { useState } from 'react';
import { Member, Payment, Plan, AttendanceRecord } from '../types';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  TrendingUp, 
  ArrowUpRight, 
  Clock, 
  UserPlus, 
  CreditCard, 
  Key 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardProps {
  members: Member[];
  payments: Payment[];
  plans: Plan[];
  attendance: AttendanceRecord[];
  licenseStatus: string;
  onNavigate: (tab: string) => void;
  onQuickCheckIn: () => void;
  onQuickAddMember: () => void;
  onQuickAddPayment: () => void;
}

export default function Dashboard({
  members,
  payments,
  plans,
  attendance,
  licenseStatus,
  onNavigate,
  onQuickCheckIn,
  onQuickAddMember,
  onQuickAddPayment
}: DashboardProps) {
  // 1. Calculate Statistics
  const activeMembers = members.filter(m => m.status === 'active');
  const expiredMembers = members.filter(m => m.status === 'expired');
  
  // Calculate this month's revenue (assume current month is July 2026 based on timestamp)
  const currentMonthPayments = payments.filter(p => p.date.startsWith('2026-07'));
  const monthlyRevenue = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

  // Today's attendance
  const todayStr = "2026-07-16"; // Fixed simulated active day close to current local time for visualization
  const todayAttendance = attendance.filter(a => a.date === todayStr).length;

  // 2. Prepare Chart Data - Monthly Revenue for 2026
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const monthlyRevenueData = months.map((m, index) => {
    const monthNum = `0${index + 1}`.slice(-2);
    const monthPayments = payments.filter(p => p.date.startsWith(`2026-${monthNum}`));
    const total = monthPayments.reduce((sum, p) => sum + p.amount, 0);
    return { name: m, amount: total };
  });

  // Prepare Plan Distribution Chart Data
  const planDistribution = plans.map(p => {
    const count = members.filter(m => m.planId === p.id).length;
    return { name: p.name, value: count };
  }).filter(p => p.value > 0);

  const COLORS = ['#bef264', '#10b981', '#3b82f6', '#8b5cf6'];

  // Upcoming expirations (next 15 days)
  const upcomingExpirations = members
    .filter(m => m.status === 'active')
    .slice(0, 3); // Simulated list for display

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Upper Grid: Analytics Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5" id="stats-grid">
        {/* Metric 1 */}
        <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 relative overflow-hidden group hover:border-lime-400/40 transition-all duration-300 shadow-sm" id="stat-active-members">
          <div className="flex justify-between items-start" id="stat-1-header">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-sans">Active Members</p>
              <h3 className="text-3xl font-bold font-display text-white mt-2">{activeMembers.length}</h3>
            </div>
            <div className="bg-lime-400/10 p-3 rounded-xl text-lime-400" id="icon-container-1">
              <Users className="w-5 h-5" id="icon-active-members" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-xs text-green-400" id="stat-1-trend">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+{members.filter(m => m.joinDate.startsWith('2026-06') || m.joinDate.startsWith('2026-07')).length} new this summer</span>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-lime-400/5 to-transparent rounded-bl-full pointer-events-none" />
        </div>

        {/* Metric 2 */}
        <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 relative overflow-hidden group hover:border-blue-400/40 transition-all duration-300 shadow-sm" id="stat-monthly-revenue">
          <div className="flex justify-between items-start" id="stat-2-header">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-sans">July Revenue</p>
              <h3 className="text-3xl font-bold font-display text-white mt-2">Rs. {monthlyRevenue}</h3>
            </div>
            <div className="bg-blue-400/10 p-3 rounded-xl text-blue-400" id="icon-container-2">
              <DollarSign className="w-5 h-5" id="icon-monthly-revenue" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-xs text-slate-400" id="stat-2-trend">
            <span className="text-green-400 font-medium">Total: Rs. {totalRevenue}</span>
            <span className="text-slate-500">all-time</span>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-400/5 to-transparent rounded-bl-full pointer-events-none" />
        </div>

        {/* Metric 3 */}
        <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 relative overflow-hidden group hover:border-purple-400/40 transition-all duration-300 shadow-sm" id="stat-total-athletes">
          <div className="flex justify-between items-start" id="stat-3-header">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-sans">Total Athletes</p>
              <h3 className="text-3xl font-bold font-display text-white mt-2">{members.length}</h3>
            </div>
            <div className="bg-purple-400/10 p-3 rounded-xl text-purple-400" id="icon-container-3">
              <Users className="w-5 h-5" id="icon-total-athletes" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-xs text-slate-400" id="stat-3-trend">
            <CheckCircle className="w-3.5 h-3.5 text-lime-400" />
            <span>{activeMembers.length} active memberships</span>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-400/5 to-transparent rounded-bl-full pointer-events-none" />
        </div>

        {/* Metric 4 */}
        <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 relative overflow-hidden group hover:border-lime-400/40 transition-all duration-300 shadow-sm" id="stat-licensing">
          <div className="flex justify-between items-start" id="stat-4-header">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider font-sans">Local Station Lock</p>
              <h3 className="text-2xl font-bold font-display text-lime-400 mt-2.5">
                {licenseStatus === 'activated' ? 'Active Pro' : 'Trial Active'}
              </h3>
            </div>
            <div className="bg-lime-400/10 p-3 rounded-xl text-lime-400" id="icon-container-4">
              <Key className="w-5 h-5" id="icon-licensing" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-xs text-slate-400" id="stat-4-trend">
            <span className="text-slate-500">Device Locked ID:</span>
            <span className="font-mono text-slate-300">GYM-HW-DEMOPC</span>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-lime-400/5 to-transparent rounded-bl-full pointer-events-none" />
        </div>
      </div>

      {/* Main Area: Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="charts-main-grid">
        {/* Left 2 Columns: Revenue Chart */}
        <div className="lg:col-span-2 bg-[#161B22] border border-slate-800 rounded-3xl p-5" id="chart-revenue-container">
          <div className="flex justify-between items-center mb-6" id="chart-revenue-header">
            <div>
              <h4 className="text-white font-semibold font-display text-lg">Financial Performance</h4>
              <p className="text-slate-400 text-xs">Monthly gross subscription sales (2026)</p>
            </div>
            <div className="bg-lime-400/10 text-lime-400 text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1" id="revenue-growth-tag">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Healthy Growth</span>
            </div>
          </div>
          
          <div className="h-72 w-full" id="area-chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a3e635" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a3e635" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#161B22', borderColor: '#334155', borderRadius: '12px' }}
                  labelStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  itemStyle={{ color: '#bef264' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#a3e635" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Column: Plan Distribution Pie Chart */}
        <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 flex flex-col justify-between" id="chart-plans-container">
          <div>
            <h4 className="text-white font-semibold font-display text-lg mb-1">Membership Splits</h4>
            <p className="text-slate-400 text-xs mb-4">Breakdown of members by subscription plan</p>
          </div>

          <div className="h-44 flex items-center justify-center relative" id="pie-chart-wrapper">
            {planDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161B22', borderColor: '#334155', borderRadius: '12px' }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-sm">No members registered yet</p>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" id="pie-inner-label">
              <span className="text-2xl font-bold font-display text-white">{activeMembers.length}</span>
              <span className="text-slate-500 text-[10px] uppercase font-semibold">Active</span>
            </div>
          </div>

          <div className="space-y-2 mt-4" id="pie-legend">
            {planDistribution.map((entry, index) => (
              <div key={entry.name} className="flex justify-between items-center text-xs" id={`legend-item-${index}`}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-300 font-sans">{entry.name}</span>
                </div>
                <span className="text-white font-mono font-medium">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Quick Actions & Expirations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-bottom-grid">
        {/* Left Columns: Quick Actions Panel */}
        <div className="lg:col-span-1 bg-[#161B22] border border-slate-800 rounded-3xl p-5" id="quick-actions-panel">
          <h4 className="text-white font-semibold font-display text-lg mb-4">Front Desk Quick Actions</h4>
          <div className="grid grid-cols-1 gap-3" id="quick-actions-grid">
            <button 
              onClick={onQuickAddMember}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-lime-400 hover:bg-slate-800/40 text-left group transition-all duration-200 cursor-pointer"
              id="action-add-member"
            >
              <div className="bg-lime-400/10 text-lime-400 p-2.5 rounded-lg group-hover:scale-110 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-white text-sm font-semibold">Register New Athlete</span>
                <span className="block text-slate-400 text-xs mt-0.5">Quick enrollment form & plan locker</span>
              </div>
            </button>

            <button 
              onClick={onQuickAddPayment}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-lime-400 hover:bg-slate-800/40 text-left group transition-all duration-200 cursor-pointer"
              id="action-record-payment"
            >
              <div className="bg-blue-400/10 text-blue-400 p-2.5 rounded-lg group-hover:scale-110 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-white text-sm font-semibold">Log Dues Payment</span>
                <span className="block text-slate-400 text-xs mt-0.5">Record incoming cash or card cash flow</span>
              </div>
            </button>
          </div>
        </div>

        {/* Right Column: Upcoming Renewals List */}
        <div className="lg:col-span-2 bg-[#161B22] border border-slate-800 rounded-3xl p-5" id="upcoming-renewals-panel">
          <div className="flex justify-between items-center mb-4" id="upcoming-renewals-header">
            <div>
              <h4 className="text-white font-semibold font-display text-lg">Impending Plan Expirations</h4>
              <p className="text-slate-400 text-xs">Members requiring attention or contact soon</p>
            </div>
            <button 
              onClick={() => onNavigate('members')}
              className="text-xs text-lime-400 font-semibold hover:text-lime-300 hover:underline flex items-center gap-0.5 cursor-pointer"
              id="view-all-expirations-btn"
            >
              Manage all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/80" id="renewals-list">
            {upcomingExpirations.map((member) => {
              const plan = plans.find(p => p.id === member.planId);
              return (
                <div key={member.id} className="py-3 flex items-center justify-between" id={`renewal-row-${member.id}`}>
                  <div className="flex items-center gap-3" id={`renewal-info-${member.id}`}>
                    <div className="w-10 h-10 rounded-full bg-lime-400/15 flex items-center justify-center text-lime-400 font-display font-bold text-sm">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <span className="block text-white text-sm font-semibold">{member.name}</span>
                      <span className="block text-slate-400 text-xs mt-0.5">{member.phone} • {plan?.name || 'No Plan'}</span>
                    </div>
                  </div>
                  <div className="text-right" id={`renewal-action-${member.id}`}>
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-lime-400/10 text-lime-400 border border-lime-400/20">
                      Renewal Due
                    </span>
                    <button 
                      onClick={onQuickAddPayment}
                      className="block text-xs text-slate-400 hover:text-white mt-1 underline transition-colors cursor-pointer"
                      id={`renew-btn-${member.id}`}
                    >
                      Process Payment
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

