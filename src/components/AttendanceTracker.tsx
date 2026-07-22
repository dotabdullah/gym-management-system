import { useState } from 'react';
import { Member, AttendanceRecord, Plan } from '../types';
import { exportAttendanceToCSV } from '../lib/csvHelper';
import { 
  Scan, 
  Search, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  ShieldAlert, 
  History, 
  BarChart, 
  Users,
  Download,
  CheckCircle2,
  Activity,
  Award
} from 'lucide-react';

interface AttendanceTrackerProps {
  attendance: AttendanceRecord[];
  members: Member[];
  plans: Plan[];
  onCheckIn: (memberId: string) => void;
}

export default function AttendanceTracker({
  attendance,
  members,
  plans,
  onCheckIn
}: AttendanceTrackerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [scannedMember, setScannedMember] = useState<Member | null>(null);
  const [scanStatus, setScanStatus] = useState<'granted' | 'expired' | 'idle'>('idle');

  // Date Range Filters for Attendance Logs
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'this_month' | 'select_month' | 'custom_range'>('this_month');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  // Date Filtering Logic
  const dateFilteredAttendance = attendance.filter(a => {
    if (dateFilterMode === 'all') return true;
    
    if (dateFilterMode === 'this_month') {
      const currentMonth = new Date().toISOString().substring(0, 7);
      return a.date.substring(0, 7) === currentMonth;
    }

    if (dateFilterMode === 'select_month') {
      return a.date.substring(0, 7) === selectedMonth;
    }

    if (dateFilterMode === 'custom_range') {
      if (!startDate && !endDate) return true;
      if (startDate && !endDate) return a.date >= startDate;
      if (!startDate && endDate) return a.date <= endDate;
      return a.date >= startDate && a.date <= endDate;
    }

    return true;
  });

  // Export Attendance CSV
  const handleExportCSV = () => {
    exportAttendanceToCSV(dateFilteredAttendance, members, `attendance_logs_${dateFilterMode}`);
  };

  // Filter members list based on quick search in scanner
  const searchResults = searchQuery.trim() === '' 
    ? [] 
    : members.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.phone.includes(searchQuery)
      ).slice(0, 5);

  const handleSimulateScan = (member: Member) => {
    setScannedMember(member);
    if (member.status === 'active') {
      setScanStatus('granted');
      onCheckIn(member.id);
    } else {
      setScanStatus('expired');
    }
    setSearchQuery('');
  };

  // Sorted attendance records
  const sortedAttendance = [...dateFilteredAttendance].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.checkInTime.localeCompare(a.checkInTime);
  });

  // Calculate athlete check-in metrics for the selected period
  const athleteCheckInCounts = members.map(m => {
    const memberLogs = attendance.filter(a => a.memberId === m.id);
    const periodLogs = dateFilteredAttendance.filter(a => a.memberId === m.id);
    const plan = plans.find(p => p.id === m.planId);
    
    // Sort logs to find latest check-in
    const sortedLogs = [...memberLogs].sort((a, b) => {
      const dComp = b.date.localeCompare(a.date);
      if (dComp !== 0) return dComp;
      return b.checkInTime.localeCompare(a.checkInTime);
    });

    const lastLog = sortedLogs[0];

    return {
      member: m,
      planName: plan?.name || 'Basic',
      periodCheckIns: periodLogs.length,
      allTimeCheckIns: memberLogs.length,
      lastCheckInDate: lastLog ? lastLog.date : 'Never',
      lastCheckInTime: lastLog ? lastLog.checkInTime : ''
    };
  }).filter(item => {
    if (!memberSearchTerm.trim()) return true;
    return item.member.name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
           item.member.phone.includes(memberSearchTerm);
  }).sort((a, b) => b.periodCheckIns - a.periodCheckIns);

  // Summary Metrics
  const totalPeriodCheckIns = dateFilteredAttendance.length;
  const uniqueActiveAthletes = new Set(dateFilteredAttendance.map(a => a.memberId)).size;
  const topAthlete = athleteCheckInCounts[0]?.periodCheckIns > 0 ? athleteCheckInCounts[0] : null;

  return (
    <div className="space-y-6" id="attendance-tracker-container">
      {/* Date Filter Bar & Export CSV */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm" id="attendance-date-filter-bar">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-400 shrink-0" />
          <div>
            <h4 className="text-white font-bold text-sm">Attendance Logs & Monthly Check-In Filter</h4>
            <p className="text-slate-400 text-xs">Track athlete floor entries and check-in volume per month or custom range</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5" id="attendance-filter-controls">
          <select
            value={dateFilterMode}
            onChange={(e) => setDateFilterMode(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            id="attendance-mode-select"
          >
            <option value="this_month">This Month ({new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })})</option>
            <option value="all">All Time Records ({attendance.length})</option>
            <option value="select_month">Select Month...</option>
            <option value="custom_range">Custom Date Range...</option>
          </select>

          {dateFilterMode === 'select_month' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none font-mono"
              id="attendance-month-picker"
            />
          )}

          {dateFilterMode === 'custom_range' && (
            <div className="flex items-center gap-1.5" id="attendance-custom-range-inputs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
                id="attendance-range-start-date"
              />
              <span className="text-slate-500 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
                id="attendance-range-end-date"
              />
            </div>
          )}

          <button
            onClick={handleExportCSV}
            className="bg-lime-400 hover:bg-lime-500 text-black px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-lime-400/5 ml-auto md:ml-0"
            id="export-attendance-csv-btn"
          >
            <Download className="w-3.5 h-3.5" />
            Export Attendance CSV
          </button>
        </div>
      </div>

      {/* Summary Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="attendance-summary-cards">
        <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wider block">Period Total Check-Ins</span>
            <h3 className="text-2xl font-bold text-white font-display mt-0.5">{totalPeriodCheckIns} Entries</h3>
            <span className="text-slate-400 text-[11px]">Recorded in selected date range</span>
          </div>
        </div>

        <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wider block">Unique Visited Athletes</span>
            <h3 className="text-2xl font-bold text-white font-display mt-0.5">{uniqueActiveAthletes} Members</h3>
            <span className="text-slate-400 text-[11px]">Active floor visitors in this period</span>
          </div>
        </div>

        <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 text-xs font-medium uppercase tracking-wider block">Top Frequent Athlete</span>
            <h3 className="text-base font-bold text-white font-display truncate mt-0.5">
              {topAthlete ? topAthlete.member.name : 'No Entries Yet'}
            </h3>
            <span className="text-lime-400 text-[11px] font-semibold">
              {topAthlete ? `${topAthlete.periodCheckIns} check-ins in selected period` : 'Check-ins will appear here'}
            </span>
          </div>
        </div>
      </div>

      {/* Athlete Total Check-In Breakdown Table */}
      <div className="bg-[#161B22] border border-slate-800 rounded-3xl overflow-hidden shadow-sm" id="athlete-attendance-breakdown">
        <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4" id="breakdown-header">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-lime-400" />
            <div>
              <h3 className="text-white font-semibold font-display text-base">Athlete Check-In Record & Package Usage</h3>
              <p className="text-slate-400 text-xs">Optional daily tracking: Monitor total check-ins per athlete for the selected period</p>
            </div>
          </div>

          <div className="relative w-full md:w-64" id="breakdown-search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search athlete name..."
              value={memberSearchTerm}
              onChange={(e) => setMemberSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse" id="attendance-summary-table">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-5">Athlete Name</th>
                <th className="p-3.5">Assigned Package</th>
                <th className="p-3.5 text-center">Period Check-Ins</th>
                <th className="p-3.5 text-center">All-Time Check-Ins</th>
                <th className="p-3.5">Last Checked In</th>
                <th className="p-3.5 text-right pr-5">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {athleteCheckInCounts.map(({ member, planName, periodCheckIns, allTimeCheckIns, lastCheckInDate, lastCheckInTime }) => (
                <tr key={member.id} className="hover:bg-slate-800/30 transition-colors" id={`athlete-row-${member.id}`}>
                  <td className="p-3.5 pl-5 font-medium text-white flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-lime-400 font-bold text-xs flex items-center justify-center border border-slate-700">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <span className="block font-semibold">{member.name}</span>
                      <span className="block text-[10px] text-slate-500 font-mono">{member.phone}</span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-medium text-[11px]">
                      {planName}
                    </span>
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 font-bold text-xs">
                      {periodCheckIns} visits
                    </span>
                  </td>
                  <td className="p-3.5 text-center font-mono font-medium text-slate-400">
                    {allTimeCheckIns} total
                  </td>
                  <td className="p-3.5 text-slate-400">
                    {lastCheckInDate !== 'Never' ? (
                      <div>
                        <span className="block text-white text-[11px] font-medium">{lastCheckInDate}</span>
                        <span className="block text-[10px] text-slate-500 font-mono">{lastCheckInTime}</span>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-[11px] italic">No logs yet</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right pr-5">
                    <button
                      onClick={() => handleSimulateScan(member)}
                      className="bg-slate-800 hover:bg-slate-700 text-lime-400 px-3 py-1 rounded-lg text-[11px] font-bold border border-slate-700 transition-all cursor-pointer inline-flex items-center gap-1"
                      id={`checkin-btn-${member.id}`}
                    >
                      <CheckCircle2 className="w-3 h-3 text-lime-400" />
                      Check In Now
                    </button>
                  </td>
                </tr>
              ))}
              {athleteCheckInCounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                    No athletes found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upper scanning dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="attendance-upper-grid">
        
        {/* Left 2 Columns: Front Desk Console (Simulator) */}
        <div className="lg:col-span-2 bg-[#161B22] border border-slate-800 rounded-3xl p-5 space-y-5 shadow-sm" id="front-desk-console">
          <div>
            <h3 className="text-white font-semibold font-display text-lg flex items-center gap-2">
              <Scan className="w-5 h-5 text-lime-400" />
              Front Desk Check-In Scanner
            </h3>
            <p className="text-slate-400 text-xs">Search member name or phone to trigger access gate check-in</p>
          </div>

          <div className="relative" id="scanner-search-box">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Type athlete's name or contact number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lime-400"
            />

            {/* Float Search Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-[#161B22] border border-slate-800 rounded-xl overflow-hidden shadow-2xl z-20 divide-y divide-slate-800/65" id="scanner-search-dropdown">
                {searchResults.map(member => {
                  const plan = plans.find(p => p.id === member.planId);
                  return (
                    <div 
                      key={member.id}
                      onClick={() => handleSimulateScan(member)}
                      className="p-3.5 hover:bg-slate-900 flex justify-between items-center cursor-pointer transition-colors"
                      id={`search-result-${member.id}`}
                    >
                      <div>
                        <span className="block text-white text-sm font-semibold">{member.name}</span>
                        <span className="block text-slate-400 text-xs mt-0.5">{member.phone} • {plan?.name || 'Basic'}</span>
                      </div>
                      <div>
                        {member.status === 'active' ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">Active</span>
                        ) : (
                          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded uppercase">Expired</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Scanner Visualizer Display */}
          <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-6 flex flex-col items-center justify-center min-h-[220px] text-center" id="scanner-visualizer">
            {scanStatus === 'idle' && (
              <div className="space-y-3" id="scan-idle-state">
                <div className="w-14 h-14 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center animate-pulse mx-auto">
                  <Scan className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-slate-300 font-semibold text-sm">Scanner Standby Mode</h4>
                  <p className="text-slate-500 text-xs mt-1">Waiting for RFID keycard signal or receptionist input</p>
                </div>
              </div>
            )}

            {scanStatus === 'granted' && scannedMember && (
              <div className="space-y-4 animate-scaleUp" id="scan-granted-state">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500 text-black mb-2">ACCESS GRANTED</span>
                  <h4 className="text-white font-extrabold font-display text-xl">{scannedMember.name}</h4>
                  <p className="text-slate-400 text-xs mt-1">
                    Check-in logged at {new Date().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}

            {scanStatus === 'expired' && scannedMember && (
              <div className="space-y-4 animate-scaleUp text-center" id="scan-expired-state">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-red-500 text-white mb-2">ACCESS LOCKED</span>
                  <h4 className="text-white font-extrabold font-display text-xl">{scannedMember.name}</h4>
                  <p className="text-red-400/80 text-xs mt-1 font-medium">
                    This member's plan expired on his join anniversary! Process renewal payment first.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Peak Attendance stats */}
        <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 flex flex-col justify-between shadow-sm" id="attendance-peak-hours">
          <div className="space-y-1">
            <h4 className="text-white font-semibold font-display text-base flex items-center gap-1.5">
              <BarChart className="w-4 h-4 text-lime-400" />
              Check-In Peak Hours
            </h4>
            <p className="text-slate-400 text-xs">Simulated statistical peak hours for floor space tracking</p>
          </div>

          <div className="space-y-3.5 my-6" id="peak-stats-progress">
            <div className="space-y-1" id="peak-early-morning">
              <div className="flex justify-between text-xs text-slate-300">
                <span>06:00 AM - 09:00 AM (Morning rush)</span>
                <span className="font-bold text-white font-mono">75% capacity</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-lime-400 rounded-full" style={{ width: '75%' }} />
              </div>
            </div>

            <div className="space-y-1" id="peak-mid-day">
              <div className="flex justify-between text-xs text-slate-300">
                <span>12:00 PM - 03:00 PM (Lunch session)</span>
                <span className="font-bold text-white font-mono">35% capacity</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '35%' }} />
              </div>
            </div>

            <div className="space-y-1" id="peak-evening">
              <div className="flex justify-between text-xs text-slate-300">
                <span>05:00 PM - 08:00 PM (After-work peak)</span>
                <span className="font-bold text-white font-mono">92% capacity</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: '92%' }} />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3 text-xs text-slate-300" id="peak-tip">
            <Users className="w-4 h-4 text-purple-400 shrink-0" />
            <p>Check-ins are highest on <strong>Mondays</strong> and <strong>Wednesdays</strong>. Suggest off-peak hours to members!</p>
          </div>
        </div>
      </div>

      {/* Audit Log list */}
      <div className="bg-[#161B22] border border-slate-800 rounded-3xl overflow-hidden shadow-sm" id="attendance-ledger-card">
        <div className="p-5 border-b border-slate-800 flex items-center gap-2" id="ledger-header">
          <History className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="text-white font-semibold font-display text-base">Check-In Entry Log</h3>
            <p className="text-slate-400 text-xs">Real-time audit trail of floor entries</p>
          </div>
        </div>

        <div className="divide-y divide-slate-800/80" id="attendance-rows-list">
          {sortedAttendance.map((a, idx) => {
            const member = members.find(m => m.id === a.memberId);
            return (
              <div key={a.id || idx} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors" id={`attendance-row-${a.id || idx}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-400 font-display font-semibold text-xs flex items-center justify-center">
                    {member ? member.name.split(' ').map(n => n[0]).join('') : '??'}
                  </div>
                  <div>
                    <span className="block text-white text-sm font-semibold">{member ? member.name : 'Unknown Athlete'}</span>
                    <span className="block text-[11px] text-slate-500">Device Lock Checkpoint #1</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs" id="attendance-row-meta">
                  <div className="flex items-center gap-1 text-slate-400" id="attendance-row-date">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {a.date}
                  </div>
                  <div className="flex items-center gap-1 text-white font-mono font-medium" id="attendance-row-time">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {a.checkInTime}
                  </div>
                </div>
              </div>
            );
          })}
          {sortedAttendance.length === 0 && (
            <div className="py-12 text-center text-slate-500 font-sans" id="attendance-empty">
              No entries logged for today yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
