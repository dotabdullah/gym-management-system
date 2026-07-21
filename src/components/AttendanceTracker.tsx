import { useState } from 'react';
import { Member, AttendanceRecord, Plan } from '../types';
import { 
  Scan, 
  Search, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  ShieldAlert, 
  History, 
  BarChart, 
  Users 
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

  // Filter members list based on quick search
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

  // Recent attendance records sorted by time
  const sortedAttendance = [...attendance].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.checkInTime.localeCompare(a.checkInTime);
  }).slice(0, 10);

  return (
    <div className="space-y-6" id="attendance-tracker-container">
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
