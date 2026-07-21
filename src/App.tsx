import { useState, useEffect } from 'react';
import { Member, Payment, Plan, AttendanceRecord, License, SyncStatus } from './types';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken 
} from './lib/firebase';
import { 
  findSpreadsheet, 
  createSpreadsheet, 
  readSpreadsheetData, 
  writeSpreadsheetData, 
  mergeData 
} from './lib/sheets';
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
import { User } from 'firebase/auth';

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
  Database
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

  // OAuth & Sync State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncedAt: null,
    isSyncing: false,
    spreadsheetId: null,
    spreadsheetUrl: null,
    error: null
  });

  // Local Folder Auto-Backup State
  const [authDomainError, setAuthDomainError] = useState<boolean>(false);
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

    // Initialize Firebase Auth
    initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        // Load sync status
        const savedSpreadsheetId = localStorage.getItem('google_spreadsheet_id');
        const savedUrl = localStorage.getItem('google_spreadsheet_url');
        const savedLastSync = localStorage.getItem('google_last_sync');
        setSyncStatus(prev => ({
          ...prev,
          spreadsheetId: savedSpreadsheetId,
          spreadsheetUrl: savedUrl,
          lastSyncedAt: savedLastSync
        }));
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
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

  // 2. Synchronization engine
  const handleSyncWithSheets = async (tokenOverride?: string) => {
    const token = tokenOverride || accessToken;
    if (!token) {
      alert("Please link your Google account to sync databases.");
      return;
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      let spreadsheetId = syncStatus.spreadsheetId;
      let spreadsheetUrl = syncStatus.spreadsheetUrl;

      // 1. Find or create the Google Spreadsheet database file in Google Drive
      if (!spreadsheetId) {
        spreadsheetId = await findSpreadsheet(token);
        if (!spreadsheetId) {
          const newSheet = await createSpreadsheet(token);
          spreadsheetId = newSheet.id;
          spreadsheetUrl = newSheet.url;
        } else {
          spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
        }

        localStorage.setItem('google_spreadsheet_id', spreadsheetId);
        localStorage.setItem('google_spreadsheet_url', spreadsheetUrl);
        setSyncStatus(prev => ({ ...prev, spreadsheetId, spreadsheetUrl }));
      }

      // 2. Fetch remote spreadsheet records
      const remoteData = await readSpreadsheetData(token, spreadsheetId);

      // 3. Merge Local & Remote datasets using updatedAt timestamps
      const localData = { members, payments, plans, attendance, licenses: [] };
      const merged = mergeData(localData, remoteData);

      // 4. Overwrite/Write back synchronized unified state
      await writeSpreadsheetData(token, spreadsheetId, {
        members: merged.members,
        payments: merged.payments,
        plans: merged.plans,
        attendance: merged.attendance,
        licenses: merged.licenses
      });

      // 5. Update Local React State and LocalStorage
      setMembers(merged.members);
      setPayments(merged.payments);
      setPlans(merged.plans);
      setAttendance(merged.attendance);
      saveStateToLocalStorage(merged.members, merged.payments, merged.plans, merged.attendance);

      // Save sync marker
      const nowStr = new Date().toLocaleString();
      localStorage.setItem('google_last_sync', nowStr);
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: nowStr,
        error: null
      }));

    } catch (err: any) {
      console.error('Sync failure:', err);
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: err.message || 'Synchronization failed'
      }));
    }
  };

  // Google Login linkage handler
  const handleConnectGoogle = async () => {
    try {
      setAuthDomainError(false);
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        // Start initial auto-sync
        await handleSyncWithSheets(result.accessToken);
      }
    } catch (err: any) {
      console.error('Google authorization failed:', err);
      // Catch unauthorized-domain error specifically
      if (err?.code === 'auth/unauthorized-domain' || (err?.message && err.message.includes('unauthorized-domain'))) {
        setAuthDomainError(true);
      } else {
        alert(`Google sign-in error: ${err.message || err}`);
      }
    }
  };

  const handleDisconnectGoogle = async () => {
    if (window.confirm("Disconnect Google Account? Local database will remain active offline.")) {
      await logout();
      setUser(null);
      setAccessToken(null);
      setSyncStatus({
        lastSyncedAt: null,
        isSyncing: false,
        spreadsheetId: null,
        spreadsheetUrl: null,
        error: null
      });
      localStorage.removeItem('google_spreadsheet_id');
      localStorage.removeItem('google_spreadsheet_url');
      localStorage.removeItem('google_last_sync');
    }
  };

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

  // 3. Local Mutation Handlers (Auto-sync to Cloud is triggered if connected!)
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

    if (user && accessToken) {
      handleSyncWithSheets();
    }
  };

  // Member CRUD
  const handleAddMember = (m: Omit<Member, 'id' | 'updatedAt'>) => {
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
    const updated = members.map(item => item.id === m.id ? m : item);
    setMembers(updated);
    triggerAutoSyncIfOnline(updated, payments, plans, attendance);
  };

  const handleDeleteMember = (id: string) => {
    const updatedMembers = members.filter(item => item.id !== id);
    const updatedAttendance = attendance.filter(item => item.memberId !== id);
    setMembers(updatedMembers);
    setAttendance(updatedAttendance);
    triggerAutoSyncIfOnline(updatedMembers, payments, plans, updatedAttendance);
  };

  // Payments Ledger Mutator
  const handleRecordPayment = (p: Omit<Payment, 'id' | 'updatedAt'>) => {
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
    const updated = plans.map(item => item.id === p.id ? p : item);
    setPlans(updated);
    triggerAutoSyncIfOnline(members, payments, updated, attendance);
  };

  const handleDeletePlan = (id: string) => {
    const updated = plans.filter(item => item.id !== id);
    setPlans(updated);
    triggerAutoSyncIfOnline(members, payments, updated, attendance);
  };

  // Bulk Data Manager Handlers
  const handleImportData = (importedMembers: Member[], importedPayments: Payment[]) => {
    const updatedMembers = [...importedMembers, ...members];
    const updatedPayments = [...importedPayments, ...payments];
    setMembers(updatedMembers);
    setPayments(updatedPayments);
    triggerAutoSyncIfOnline(updatedMembers, updatedPayments, plans, attendance);
  };

  const handleClearDatabase = (clearMembers: boolean, clearPayments: boolean, clearAttendance: boolean) => {
    const updatedMembers = clearMembers ? [] : members;
    const updatedPayments = clearPayments ? [] : payments;
    const updatedAttendance = clearAttendance ? [] : attendance;

    if (clearMembers) setMembers([]);
    if (clearPayments) setPayments([]);
    if (clearAttendance) setAttendance([]);

    triggerAutoSyncIfOnline(updatedMembers, updatedPayments, plans, updatedAttendance);
  };

  // 4. Station License Bind Handlers
  const handleActivateLicense = (key: string, ownerName: string): boolean => {
    const isValid = validateLicenseKey(key);
    if (isValid) {
      const activeLicense: License = {
        key,
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
      
      {/* 1. Trial Top Warning Banner */}
      {license.status === 'trial' && !isExpiredTrial && (
        <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-center py-2 px-4 text-xs font-semibold flex items-center justify-center gap-2 relative z-30" id="trial-banner">
          <span>⚠️ Running on 14-day Free Workstation Trial. Activate subscription key to bind this device permanently.</span>
          <button 
            onClick={() => setActiveTab('licensing')}
            className="bg-black/35 hover:bg-black/50 text-white px-2.5 py-0.5 rounded-lg transition-all border border-white/10"
          >
            Activate Station
          </button>
        </div>
      )}

      {/* 2. Device Locked Full Screen Barrier Simulation */}
      {isExpiredTrial && (
        <div className="fixed inset-0 bg-[#0A0C10]/95 backdrop-blur-md z-50 flex items-center justify-center p-4" id="locked-node-screen">
          <div className="bg-[#161B22] border border-slate-800 rounded-3xl max-w-md w-full p-6 text-center space-y-5" id="locked-node-card">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto shadow-lg">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold font-display text-white">Workstation Activation Required</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Your 14-day local trial on device <code className="text-yellow-400 font-mono">{hardwareId}</code> has expired. Please insert an authorized key to unlock the database registry.
              </p>
            </div>
            
            {/* Embedded key form inside blocker */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left">
              <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Simulation Bypass</span>
              <p className="text-[11px] text-slate-400 leading-normal mb-3">
                Since this is a creator demonstration, navigate to the **Licenses** panel, click **Show Admin Panel** to generate a key, and insert it here to unlock!
              </p>
              <button 
                onClick={() => {
                  // Bypass expired trial for simulation testing
                  const fakeActive: License = {
                    key: 'GYM-ACTV-ABCD-1234',
                    status: 'activated',
                    activatedAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    hwId: hardwareId,
                    ownerName: 'Demo Center'
                  };
                  setLicense(fakeActive);
                  localStorage.setItem('gym_license', JSON.stringify(fakeActive));
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white py-1.5 rounded-lg text-xs font-bold border border-slate-700"
              >
                Bypass Lock (Demo Key Autoload)
              </button>
            </div>
          </div>
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

            {/* Right Header Cloud Sync Widget */}
            <div className="flex items-center gap-3" id="header-sync-widget">
              {user ? (
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5" id="sync-widget-active">
                  <Cloud className="w-4 h-4 text-lime-400 shrink-0" />
                  <div className="hidden lg:block text-left">
                    <span className="block text-[10px] text-slate-400 font-semibold truncate max-w-[120px]">{user.email}</span>
                    <span className="block text-[8px] text-slate-500 mt-0.5">
                      {syncStatus.lastSyncedAt ? `Synced ${syncStatus.lastSyncedAt.split(', ')[1]}` : 'Unsynced'}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleSyncWithSheets()}
                    disabled={syncStatus.isSyncing}
                    title="Manual Google Sheet Sync"
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                    id="trigger-sync-btn"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    onClick={handleDisconnectGoogle}
                    title="Sign Out Google Sheets"
                    className="p-1 rounded bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 transition-all cursor-pointer"
                    id="disconnect-g-btn"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectGoogle}
                  className="bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 hover:border-lime-400/40 transition-all cursor-pointer shadow-sm"
                  id="link-google-btn"
                >
                  <CloudOff className="w-4 h-4 text-slate-500" />
                  <span>Link Google Sheets</span>
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
              />
            )}
          </main>
        </div>
      </div>

      {/* 4. Firebase Authorized Domain Error Helpful Troubleshooting Modal */}
      {authDomainError && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" id="unauthorized-domain-modal">
          <div className="bg-[#161B22] border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl" id="domain-modal-content">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900" id="domain-header">
              <div className="flex items-center gap-2 text-amber-400">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <h3 className="text-white font-semibold font-display text-base">Firebase: Unauthorized Domain Error</h3>
              </div>
              <button 
                onClick={() => setAuthDomainError(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm leading-relaxed text-slate-300" id="domain-instructions">
              <p className="text-xs text-slate-400">
                You received an <code className="text-red-400 font-mono text-[11px] bg-red-400/5 px-1 rounded">auth/unauthorized-domain</code> error because Firebase Authentication blocks Google Sign-In requests originating from unrecognized addresses for client security.
              </p>

              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4.5 space-y-2.5">
                <span className="block text-xs font-bold text-white uppercase tracking-wider">How to Fix This in 60 Seconds:</span>
                <ol className="list-decimal list-inside text-xs space-y-2 text-slate-300">
                  <li>Open your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:underline inline-flex items-center gap-0.5 font-semibold">Firebase Console ↗</a></li>
                  <li>Go to <strong className="text-white">Authentication</strong> &rarr; click the <strong className="text-white">Settings</strong> tab.</li>
                  <li>On the left sidebar, click <strong className="text-white">Authorized domains</strong>.</li>
                  <li>Click <strong className="text-white">Add domain</strong>.</li>
                  <li>Enter the host domain or local network IP you are running on (e.g. <code className="text-lime-400 font-mono">localhost</code>, <code className="text-lime-400 font-mono">127.0.0.1</code>, or your specific PC's local IP address).</li>
                  <li>Click <strong className="text-white">Add</strong>. Changes are effective instantly!</li>
                </ol>
              </div>

              <div className="text-xs text-slate-400 flex items-start gap-2.5 bg-lime-400/5 border border-lime-400/10 p-3.5 rounded-xl">
                <span className="text-lg">💡</span>
                <span>
                  <strong>Tip:</strong> If you or your clients run this software locally on offline-first PCs, you can configure domain-level whitelists once, or run fully offline using the **Automated Local Backups** without linking any Google accounts.
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
              <button
                onClick={() => setAuthDomainError(false)}
                className="bg-lime-400 hover:bg-lime-500 text-black px-5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Got It, Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
