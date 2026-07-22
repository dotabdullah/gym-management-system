import { useState, useEffect } from 'react';
import { Member, Payment, Plan, AttendanceRecord, License } from './types';
import {
  saveDirectoryHandle,
  loadDirectoryHandle,
  removeDirectoryHandle,
  writeBackupFile
} from './lib/backup';
import { 
  getOrCreateHardwareId, 
  DEFAULT_PLANS, 
  DEFAULT_MEMBERS, 
  DEFAULT_PAYMENTS, 
  DEFAULT_ATTENDANCE, 
  validateLicenseKey 
} from './lib/mockData';

// Icons
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Settings, 
  Clock, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  LogOut, 
  ShieldCheck, 
  Sparkles,
  ChevronRight,
  Menu,
  X,
  Lock,
  Database,
  Key
} from 'lucide-react';

// Components
import Dashboard from './components/Dashboard';
import MembersList from './components/MembersList';
import PaymentsList from './components/PaymentsList';
import PlansManager from './components/PlansManager';
import AttendanceTracker from './components/AttendanceTracker';
import LicensingTab from './components/LicensingTab';
import DataManagerTab from './components/DataManagerTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Data State
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [license, setLicense] = useState<License>({
    key: '',
    status: 'trial',
    activatedAt: null,
    expiresAt: null,
    hwId: '',
    ownerName: ''
  });

  // Client workstation variables
  const [hardwareId, setHardwareId] = useState<string>('');

  // Local Folder Auto-Backup State
  const [backupDirectory, setBackupDirectory] = useState<FileSystemDirectoryHandle | null>(null);
  const [backupStatus, setBackupStatus] = useState<{
    folderName: string | null;
    lastBackupAt: string | null;
    error: string | null;
    isConfigured: boolean;
  }>({
    folderName: null,
    lastBackupAt: null,
    error: null,
    isConfigured: false
  });

  // 1. Initial Load - Local-First Storage fallback
  useEffect(() => {
    const hwId = getOrCreateHardwareId();
    setHardwareId(hwId);

    // Recover automated local folder backup handle if supported
    if ('showDirectoryPicker' in window) {
      loadDirectoryHandle()
        .then(async (handle) => {
          if (handle) {
            setBackupDirectory(handle);
            const lastBackup = localStorage.getItem('local_folder_last_backup');
            setBackupStatus({
              folderName: handle.name,
              lastBackupAt: lastBackup,
              error: null,
              isConfigured: true
            });
          }
        })
        .catch((err) => {
          console.error("Failed to restore local backup handle:", err);
        });
    }

    // Load Local Plans
    const localPlans = localStorage.getItem('gym_plans');
    if (localPlans) {
      setPlans(JSON.parse(localPlans));
    } else {
      setPlans(DEFAULT_PLANS);
      localStorage.setItem('gym_plans', JSON.stringify(DEFAULT_PLANS));
    }

    // Load Local Members
    const localMembers = localStorage.getItem('gym_members');
    if (localMembers) {
      setMembers(JSON.parse(localMembers));
    } else {
      setMembers(DEFAULT_MEMBERS);
      localStorage.setItem('gym_members', JSON.stringify(DEFAULT_MEMBERS));
    }

    // Load Local Payments
    const localPayments = localStorage.getItem('gym_payments');
    if (localPayments) {
      setPayments(JSON.parse(localPayments));
    } else {
      setPayments(DEFAULT_PAYMENTS);
      localStorage.setItem('gym_payments', JSON.stringify(DEFAULT_PAYMENTS));
    }

    // Load Local Attendance
    const localAttendance = localStorage.getItem('gym_attendance');
    if (localAttendance) {
      setAttendance(JSON.parse(localAttendance));
    } else {
      setAttendance(DEFAULT_ATTENDANCE);
      localStorage.setItem('gym_attendance', JSON.stringify(DEFAULT_ATTENDANCE));
    }

    // Load License
    const localLicense = localStorage.getItem('gym_license');
    if (localLicense) {
      setLicense(JSON.parse(localLicense));
    } else {
      // Setup default trial
      const trialLicense: License = {
        key: '',
        status: 'trial',
        activatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        hwId: hwId,
        ownerName: 'Alpha Gym Center (Trial)'
      };
      setLicense(trialLicense);
      localStorage.setItem('gym_license', JSON.stringify(trialLicense));
    }
  }, []);

  // Save changes helper
  const saveStateToLocalStorage = (
    updatedMembers: Member[],
    updatedPayments: Payment[],
    updatedPlans: Plan[],
    updatedAttendance: AttendanceRecord[]
  ) => {
    localStorage.setItem('gym_members', JSON.stringify(updatedMembers));
    localStorage.setItem('gym_payments', JSON.stringify(updatedPayments));
    localStorage.setItem('gym_plans', JSON.stringify(updatedPlans));
    localStorage.setItem('gym_attendance', JSON.stringify(updatedAttendance));
  };

  // 2. Synchronization Engine
  // Deprecated Google Sheets synchronization - Running 100% offline-first.

  // Automated Local Folder Backup Handlers
  const handleSelectBackupDirectory = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        alert("Your web browser does not support direct local directory write access. Please use Chrome, Edge, or Opera.");
        return;
      }
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      await saveDirectoryHandle(handle);
      setBackupDirectory(handle);

      // Trigger initial backup immediately
      const fileName = await writeBackupFile(
        handle, 
        { members, payments, plans, attendance },
        license.gymName || license.ownerName
      );
      const nowStr = new Date().toLocaleString();
      localStorage.setItem('local_folder_last_backup', nowStr);

      setBackupStatus({
        folderName: handle.name,
        lastBackupAt: nowStr,
        error: null,
        isConfigured: true
      });
      alert(`Success! Automatic local backups are now linked to folder "${handle.name}". An initial backup "${fileName}" was saved.`);
    } catch (err: any) {
      console.error('Failed to configure local backup directory:', err);
      if (err.name !== 'AbortError') {
        setBackupStatus(prev => ({
          ...prev,
          error: err.message || 'Failed to configure directory'
        }));
        alert(`Error setting backup folder: ${err.message || err}`);
      }
    }
  };

  const handleDisconnectBackupDirectory = async () => {
    if (window.confirm("Disconnect automated local folder backup? The app will stop writing automatic local backup files to your PC, but your existing files will remain intact.")) {
      await removeDirectoryHandle();
      setBackupDirectory(null);
      localStorage.removeItem('local_folder_last_backup');
      setBackupStatus({
        folderName: null,
        lastBackupAt: null,
        error: null,
        isConfigured: false
      });
    }
  };

  // 3. Local Mutation Handlers (Auto-sync to PC Backup Folder is triggered if configured!)
  const triggerAutoSyncIfOnline = (
    nextMembers: Member[],
    nextPayments: Payment[],
    nextPlans: Plan[],
    nextAttendance: AttendanceRecord[]
  ) => {
    saveStateToLocalStorage(nextMembers, nextPayments, nextPlans, nextAttendance);

    // Save automatic local PC folder backup if configured
    if (backupDirectory) {
      writeBackupFile(
        backupDirectory, 
        {
          members: nextMembers,
          payments: nextPayments,
          plans: nextPlans,
          attendance: nextAttendance
        },
        license.gymName || license.ownerName
      ).then((fileName) => {
        const nowStr = new Date().toLocaleString();
        localStorage.setItem('local_folder_last_backup', nowStr);
        setBackupStatus(prev => ({
          ...prev,
          lastBackupAt: nowStr,
          error: null
        }));
      }).catch((err: any) => {
        console.error("Local PC directory auto-backup failed:", err);
        setBackupStatus(prev => ({
          ...prev,
          error: err.message || 'Auto-backup failed'
        }));
      });
    }
  };

  // 7-Day Free Trial & Read-Only State Management
  const [trialStartDate] = useState<string>(() => {
    let stored = localStorage.getItem('gym_trial_start_date');
    if (!stored) {
      stored = new Date().toISOString();
      localStorage.setItem('gym_trial_start_date', stored);
    }
    return stored;
  });

  const [showReadOnlyModal, setShowReadOnlyModal] = useState(false);

  // Trial & License calculations
  const diffMs = Date.now() - new Date(trialStartDate).getTime();
  const trialDaysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const trialDaysRemaining = Math.max(0, 7 - trialDaysElapsed);
  const isTrialExpired = trialDaysElapsed >= 7;

  const isLicenseActive = license.status === 'activated' && 
    Boolean(license.expiresAt) && 
    new Date(license.expiresAt) > new Date();

  const isReadOnly = !isLicenseActive && isTrialExpired;

  // Interceptor for write permission
  const checkWritePermission = (): boolean => {
    if (isLicenseActive) return true;
    if (!isTrialExpired) return true; // Within 7-day trial
    setShowReadOnlyModal(true);
    return false;
  };

  // Member CRUD
  const handleAddMember = (m: Omit<Member, 'id' | 'updatedAt'>) => {
    if (!checkWritePermission()) return;
    const newMember: Member = {
      ...m,
      id: `mem-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    const updated = [newMember, ...members];
    setMembers(updated);
    triggerAutoSyncIfOnline(updated, payments, plans, attendance);
  };

  const handleUpdateMember = (m: Member) => {
    if (!checkWritePermission()) return;
    const updated = members.map(item => item.id === m.id ? m : item);
    setMembers(updated);
    triggerAutoSyncIfOnline(updated, payments, plans, attendance);
  };

  const handleDeleteMember = (id: string) => {
    if (!checkWritePermission()) return;
    const updatedMembers = members.filter(item => item.id !== id);
    const updatedAttendance = attendance.filter(item => item.memberId !== id);
    setMembers(updatedMembers);
    setAttendance(updatedAttendance);
    triggerAutoSyncIfOnline(updatedMembers, payments, plans, updatedAttendance);
  };

  // Payments Ledger Mutator
  const handleRecordPayment = (p: Omit<Payment, 'id' | 'updatedAt'>) => {
    if (!checkWritePermission()) return;
    const newPayment: Payment = {
      ...p,
      id: `pay-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    const updatedPayments = [newPayment, ...payments];
    
    // Auto-extend member status if expired
    const updatedMembers = members.map(m => {
      if (m.id === p.memberId && m.status === 'expired') {
        return { ...m, status: 'active' as const, updatedAt: new Date().toISOString() };
      }
      return m;
    });

    setPayments(updatedPayments);
    setMembers(updatedMembers);
    triggerAutoSyncIfOnline(updatedMembers, updatedPayments, plans, attendance);
  };

  // Desk Check-In Attendance Tracker
  const handleCheckIn = (memberId: string) => {
    if (!checkWritePermission()) return;
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      memberId,
      date: new Date().toISOString().split('T')[0],
      checkInTime: new Date().toLocaleTimeString('en-US', { hour12: false })
    };
    const updated = [newRecord, ...attendance];
    setAttendance(updated);
    triggerAutoSyncIfOnline(members, payments, plans, updated);
  };

  // Pricing Plans Mutators
  const handleAddPlan = (p: Omit<Plan, 'id' | 'updatedAt'>) => {
    if (!checkWritePermission()) return;
    const newPlan: Plan = {
      ...p,
      id: `plan-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    const updated = [...plans, newPlan];
    setPlans(updated);
    triggerAutoSyncIfOnline(members, payments, updated, attendance);
  };

  const handleUpdatePlan = (p: Plan) => {
    if (!checkWritePermission()) return;
    const updated = plans.map(item => item.id === p.id ? p : item);
    setPlans(updated);
    triggerAutoSyncIfOnline(members, payments, updated, attendance);
  };

  const handleDeletePlan = (id: string) => {
    if (!checkWritePermission()) return;
    const updated = plans.filter(item => item.id !== id);
    setPlans(updated);
    triggerAutoSyncIfOnline(members, payments, updated, attendance);
  };

  // Bulk Data Manager Handlers
  const handleImportData = (importedMembers: Member[], importedPayments: Payment[]) => {
    if (!checkWritePermission()) return;
    const updatedMembers = [...importedMembers, ...members];
    const updatedPayments = [...importedPayments, ...payments];
    setMembers(updatedMembers);
    setPayments(updatedPayments);
    triggerAutoSyncIfOnline(updatedMembers, updatedPayments, plans, attendance);
  };

  const handleClearDatabase = (clearMembers: boolean, clearPayments: boolean, clearAttendance: boolean) => {
    if (!checkWritePermission()) return;
    const updatedMembers = clearMembers ? [] : members;
    const updatedPayments = clearPayments ? [] : payments;
    const updatedAttendance = clearAttendance ? [] : attendance;

    if (clearMembers) setMembers([]);
    if (clearPayments) setPayments([]);
    if (clearAttendance) setAttendance([]);

    triggerAutoSyncIfOnline(updatedMembers, updatedPayments, plans, updatedAttendance);
  };

  const handleRestoreBackup = (data: {
    members: Member[];
    payments: Payment[];
    plans: Plan[];
    attendance: AttendanceRecord[];
  }) => {
    const nextMembers = data.members || [];
    const nextPayments = data.payments || [];
    const nextPlans = data.plans && data.plans.length > 0 ? data.plans : DEFAULT_PLANS;
    const nextAttendance = data.attendance || [];

    setMembers(nextMembers);
    setPayments(nextPayments);
    setPlans(nextPlans);
    setAttendance(nextAttendance);

    triggerAutoSyncIfOnline(nextMembers, nextPayments, nextPlans, nextAttendance);
  };

  // 4. Station License Bind Handlers
  const handleActivateLicense = (key: string, ownerName: string): boolean => {
    const cleanKey = key.trim().toUpperCase();
    const localHwSuffix = (hardwareId || 'HW-1000').replace(/[^A-Z0-9]/gi, '').slice(-4).toUpperCase();

    // Hardware ID check for bound keys (GYM-1YR-[HW_SUFFIX]-[P1]-[P2])
    if (cleanKey.startsWith('GYM-1YR-')) {
      const parts = cleanKey.split('-');
      if (parts.length === 5) {
        const keyHwSuffix = parts[2];
        if (keyHwSuffix !== localHwSuffix) {
          alert(`Activation Failed: Hardware ID Mismatch!\n\nThis license key was generated specifically for a PC with Hardware ID ending in "${keyHwSuffix}".\n\nThis machine's Hardware ID ends in "${localHwSuffix}".\n\nPlease request a key generated for this PC's Hardware ID (${hardwareId}).`);
          return false;
        }
      }
    }

    const isValid = validateLicenseKey(cleanKey);
    if (isValid) {
      const activeLicense: License = {
        key: cleanKey,
        status: 'activated',
        activatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        hwId: hardwareId,
        ownerName,
        gymName: ownerName,
        phone: license.phone || '',
        address: license.address || ''
      };
      setLicense(activeLicense);
      localStorage.setItem('gym_license', JSON.stringify(activeLicense));
      return true;
    }
    return false;
  };

  const handleUpdateGymDetails = (gymName: string, phone: string, address: string) => {
    const updatedLicense: License = {
      ...license,
      ownerName: gymName, // sync with ownerName for consistency
      gymName,
      phone,
      address
    };
    setLicense(updatedLicense);
    localStorage.setItem('gym_license', JSON.stringify(updatedLicense));
  };

  const handleResetLicense = () => {
    if (window.confirm("Are you sure you want to de-authorize this PC workstation? The trial period will resume.")) {
      const resetLicense: License = {
        key: '',
        status: 'trial',
        activatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        hwId: hardwareId,
        ownerName: 'Alpha Gym Center (Trial)',
        gymName: '',
        phone: '',
        address: ''
      };
      setLicense(resetLicense);
      localStorage.setItem('gym_license', JSON.stringify(resetLicense));
    }
  };

  // Verify Trial Overload barrier (for demo and testing safety)
  const isExpiredTrial = license.status === 'trial' && 
    license.expiresAt && 
    new Date() > new Date(license.expiresAt);

  return (
    <div className="min-h-screen bg-[#0A0C10] text-slate-200 flex flex-col font-sans selection:bg-lime-400 selection:text-black" id="main-app-shell">
      
      {/* 1. Trial / License Status Top Banner */}
      {!isLicenseActive && !isTrialExpired && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-center py-2 px-4 text-xs font-semibold flex items-center justify-center gap-2 relative z-30 shadow-sm" id="trial-banner">
          <span>⚡ <strong>7-Day Free Trial Active:</strong> Day {Math.min(7, trialDaysElapsed + 1)} of 7 ({trialDaysRemaining} Day(s) Left). All features unlocked!</span>
          <button 
            onClick={() => setActiveTab('licensing')}
            className="bg-black/35 hover:bg-black/50 text-white px-2.5 py-0.5 rounded-lg transition-all border border-white/10 font-bold cursor-pointer ml-1"
          >
            Activate 1-Year License
          </button>
        </div>
      )}

      {!isLicenseActive && isTrialExpired && (
        <div className="bg-gradient-to-r from-red-600 to-amber-600 text-center py-2 px-4 text-xs font-semibold flex items-center justify-center gap-2 relative z-30 shadow-sm" id="readonly-banner">
          <span>🔒 <strong>7-Day Trial Completed (Read-Only Mode):</strong> You can browse and export records, but editing/creating is locked.</span>
          <button 
            onClick={() => setActiveTab('licensing')}
            className="bg-black/40 hover:bg-black/60 text-white px-3 py-0.5 rounded-lg transition-all border border-white/20 font-bold cursor-pointer ml-1"
          >
            Activate 1-Year License
          </button>
        </div>
      )}

      {/* 3. Primary Full Grid Shell */}
      <div className="flex-1 flex flex-col md:flex-row" id="app-layout-grid">
        
        {/* Left Control Sidebar */}
        <aside className={`w-full md:w-64 bg-[#161B22] border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0 z-40 transition-all duration-300 ${mobileMenuOpen ? 'block' : 'hidden md:flex'}`} id="side-bar">
          
          {/* Brand Logo & Name */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between" id="side-brand">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-lime-400 rounded-xl flex items-center justify-center text-black font-black italic shadow-lg shadow-lime-400/20">
                IR
              </div>
              <div>
                <h1 className="text-white font-extrabold font-display text-sm tracking-wide uppercase leading-tight">Iron Ledger</h1>
                <span className="text-slate-500 font-mono text-[9px] uppercase tracking-widest font-semibold block">Frontdesk SaaS</span>
              </div>
            </div>
            {/* Close button on mobile */}
            <button 
              onClick={() => setMobileMenuOpen(false)} 
              className="md:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 p-4 space-y-2" id="side-navigation">
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left border ${activeTab === 'dashboard' ? 'bg-lime-400/10 text-lime-400 border-lime-400/20 shadow-lg shadow-lime-400/5' : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-transparent'}`}
              id="nav-dashboard"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => { setActiveTab('members'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left border ${activeTab === 'members' ? 'bg-lime-400/10 text-lime-400 border-lime-400/20 shadow-lg shadow-lime-400/5' : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-transparent'}`}
              id="nav-members"
            >
              <Users className="w-4 h-4" />
              <span>Athletes</span>
            </button>

            <button
              onClick={() => { setActiveTab('payments'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left border ${activeTab === 'payments' ? 'bg-lime-400/10 text-lime-400 border-lime-400/20 shadow-lg shadow-lime-400/5' : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-transparent'}`}
              id="nav-payments"
            >
              <CreditCard className="w-4 h-4" />
              <span>Revenue Ledger</span>
            </button>

            <button
              onClick={() => { setActiveTab('plans'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left border ${activeTab === 'plans' ? 'bg-lime-400/10 text-lime-400 border-lime-400/20 shadow-lg shadow-lime-400/5' : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-transparent'}`}
              id="nav-plans"
            >
              <Sparkles className="w-4 h-4" />
              <span>Rate Tiers</span>
            </button>

            <button
              onClick={() => { setActiveTab('data-manager'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left border ${activeTab === 'data-manager' ? 'bg-lime-400/10 text-lime-400 border-lime-400/20 shadow-lg shadow-lime-400/5' : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-transparent'}`}
              id="nav-data-manager"
            >
              <Database className="w-4 h-4" />
              <span>Database Tools</span>
            </button>

            <button
              onClick={() => { setActiveTab('licensing'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left border ${activeTab === 'licensing' ? 'bg-lime-400/10 text-lime-400 border-lime-400/20 shadow-lg shadow-lime-400/5' : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-transparent'}`}
              id="nav-licensing"
            >
              <Settings className="w-4 h-4" />
              <span>Station Licensing</span>
            </button>
          </nav>

          {/* Station node footer marker */}
          <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-900/10" id="side-footer">
            <div className="flex items-center gap-2" id="node-fingerprint-box">
              <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
              <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Local Station ID:</span>
            </div>
            <span className="block font-mono font-bold text-xs text-slate-300 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-center truncate">{hardwareId}</span>
          </div>
        </aside>

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0" id="content-scroller">
          
          {/* Main Top Header */}
          <header className="h-16 border-b border-slate-800 px-5 flex items-center justify-between shrink-0 bg-[#0A0C10]/80 backdrop-blur" id="top-header">
            {/* Left Header Controls */}
            <div className="flex items-center gap-3" id="header-left">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-slate-400 hover:text-white"
                id="mobile-hamburger-btn"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="hidden md:flex items-center gap-2.5" id="gym-branding-header-info">
                <span className="bg-lime-400/10 text-lime-400 border border-lime-400/20 px-3 py-1.5 rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 shadow-sm shadow-lime-400/5">
                  🏟️ {license.gymName || license.ownerName}
                </span>
                {license.address && (
                  <span className="text-[11px] text-slate-400 truncate max-w-[200px] lg:max-w-xs hidden sm:inline" title={license.address}>
                    📍 {license.address}
                  </span>
                )}
              </div>
            </div>

            {/* Right Header PC Backup Status Widget */}
            <div className="flex items-center gap-3" id="header-backup-widget">
              {backupStatus.isConfigured ? (
                <button
                  onClick={() => setActiveTab('data-manager')}
                  className="flex items-center gap-2 bg-[#161B22] hover:bg-slate-800 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl px-3.5 py-1.5 text-left transition-all cursor-pointer shadow-sm"
                  id="header-backup-status-active"
                  title="Configure or manage PC backups"
                >
                  <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="text-left leading-tight">
                    <span className="block text-[10px] text-white font-bold truncate max-w-[120px]">
                      PC Backup Active
                    </span>
                    <span className="block text-[8px] text-emerald-400 mt-0.5">
                      📁 {backupStatus.folderName}
                    </span>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('data-manager')}
                  className="flex items-center gap-2 bg-[#161B22] hover:bg-slate-800 border border-slate-800 hover:border-lime-400/40 px-3.5 py-1.5 rounded-xl text-left transition-all cursor-pointer shadow-sm"
                  id="header-backup-status-inactive"
                  title="Configure automatic offline backups to a PC folder"
                >
                  <Database className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <div className="text-left leading-tight">
                    <span className="block text-[10px] text-slate-400 font-semibold">
                      Local DB Secure
                    </span>
                    <span className="block text-[8px] text-slate-500 mt-0.5">
                      Offline Storage Only
                    </span>
                  </div>
                </button>
              )}
            </div>
          </header>

          {/* Central Workspace Tab Stage */}
          <main className="flex-1 p-5 md:p-6 overflow-y-auto max-w-7xl w-full mx-auto" id="main-content-area">
            {activeTab === 'dashboard' && (
              <Dashboard 
                members={members}
                payments={payments}
                plans={plans}
                attendance={attendance}
                licenseStatus={license.status}
                onNavigate={(tab) => setActiveTab(tab)}
                onQuickCheckIn={() => setActiveTab('attendance')}
                onQuickAddMember={() => setActiveTab('members')}
                onQuickAddPayment={() => setActiveTab('members')}
              />
            )}

            {activeTab === 'members' && (
              <MembersList 
                members={members}
                plans={plans}
                payments={payments}
                attendance={attendance}
                onAddMember={handleAddMember}
                onUpdateMember={handleUpdateMember}
                onDeleteMember={handleDeleteMember}
                onRecordPayment={handleRecordPayment}
                onCheckIn={handleCheckIn}
              />
            )}

            {activeTab === 'payments' && (
              <PaymentsList 
                payments={payments}
                members={members}
                plans={plans}
                gymName={license.gymName || license.ownerName}
                gymPhone={license.phone}
                gymAddress={license.address}
              />
            )}

            {activeTab === 'plans' && (
              <PlansManager 
                plans={plans}
                members={members}
                onAddPlan={handleAddPlan}
                onUpdatePlan={handleUpdatePlan}
                onDeletePlan={handleDeletePlan}
              />
            )}

            {activeTab === 'attendance' && (
              <AttendanceTracker 
                attendance={attendance}
                members={members}
                plans={plans}
                onCheckIn={handleCheckIn}
              />
            )}

             {activeTab === 'data-manager' && (
              <DataManagerTab 
                members={members}
                payments={payments}
                plans={plans}
                attendance={attendance}
                onImportData={handleImportData}
                onClearDatabase={handleClearDatabase}
                onRestoreBackup={handleRestoreBackup}
                backupStatus={backupStatus}
                onSelectBackupDirectory={handleSelectBackupDirectory}
                onDisconnectBackupDirectory={handleDisconnectBackupDirectory}
              />
            )}

            {activeTab === 'licensing' && (
              <LicensingTab 
                license={license}
                onActivate={handleActivateLicense}
                onResetLicense={handleResetLicense}
                onUpdateGymDetails={handleUpdateGymDetails}
                hardwareId={hardwareId}
                trialDaysRemaining={trialDaysRemaining}
                trialDaysElapsed={trialDaysElapsed}
                isTrialExpired={isTrialExpired}
                isReadOnly={isReadOnly}
                isLicenseActive={isLicenseActive}
              />
            )}
          </main>
        </div>
      </div>

      {/* Read-Only Mode Warning Modal */}
      {showReadOnlyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" id="read-only-modal">
          <div className="bg-[#161B22] border border-amber-500/30 rounded-3xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl animate-scaleUp" id="read-only-modal-card">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold font-display text-white">7-Day Free Trial Expired</h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                Your 7-day free trial has completed. You can view, search, filter, and export all existing records in <span className="text-amber-400 font-bold">Read-Only Mode</span>.
              </p>
              <p className="text-slate-400 text-xs">
                To add, edit, or delete records, please activate a 1-Year License key.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2" id="read-only-modal-actions">
              <button
                onClick={() => {
                  setShowReadOnlyModal(false);
                  setActiveTab('licensing');
                }}
                className="w-full bg-lime-400 hover:bg-lime-500 text-black py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-lime-400/10 cursor-pointer"
                id="activate-from-readonly-btn"
              >
                <Key className="w-4 h-4" /> Activate 1-Year License
              </button>
              <button
                onClick={() => setShowReadOnlyModal(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 py-2 rounded-xl text-xs font-semibold border border-slate-800 cursor-pointer"
                id="close-readonly-modal-btn"
              >
                Close & Continue in Read-Only Mode
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
