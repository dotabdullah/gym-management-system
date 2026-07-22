import { useState, FormEvent, useEffect } from 'react';
import { License } from '../types';
import { 
  Key, 
  Monitor, 
  HelpCircle, 
  ShieldCheck, 
  Sparkles, 
  Laptop, 
  Cpu, 
  RefreshCw,
  Copy,
  Info,
  Lock
} from 'lucide-react';

interface LicensingTabProps {
  license: License;
  onActivate: (key: string, ownerName: string) => boolean;
  onResetLicense: () => void;
  onUpdateGymDetails: (gymName: string, phone: string, address: string) => void;
  hardwareId: string;
  trialDaysRemaining?: number;
  trialDaysElapsed?: number;
  isTrialExpired?: boolean;
  isReadOnly?: boolean;
  isLicenseActive?: boolean;
}

export default function LicensingTab({
  license,
  onActivate,
  onResetLicense,
  onUpdateGymDetails,
  hardwareId,
  trialDaysRemaining = 7,
  trialDaysElapsed = 0,
  isTrialExpired = false,
  isReadOnly = false,
  isLicenseActive = false
}: LicensingTabProps) {
  const [keyInput, setKeyInput] = useState('');
  const [ownerInput, setOwnerInput] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [isCreatorPanelOpen, setIsCreatorPanelOpen] = useState(false);

  // Gym Branding Local States
  const [gymName, setGymName] = useState(license.gymName || license.ownerName || '');
  const [gymPhone, setGymPhone] = useState(license.phone || '');
  const [gymAddress, setGymAddress] = useState(license.address || '');

  // Generator Studio Target States
  const [targetHwId, setTargetHwId] = useState(hardwareId || '');
  const [targetGymName, setTargetGymName] = useState('Powerhouse Gym');

  useEffect(() => {
    setGymName(license.gymName || license.ownerName || '');
    setGymPhone(license.phone || '');
    setGymAddress(license.address || '');
    if (!targetHwId && hardwareId) {
      setTargetHwId(hardwareId);
    }
  }, [license, hardwareId]);

  // Secure Creator Master Gate states
  const [showPasscodeForm, setShowPasscodeForm] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [creatorPasscode, setCreatorPasscode] = useState(() => {
    return localStorage.getItem('creator_passcode') || 'ironcreator77';
  });
  const [isChangingPasscode, setIsChangingPasscode] = useState(false);
  const [newPasscodeInput, setNewPasscodeInput] = useState('');

  const handleVerifyPasscode = (e: FormEvent) => {
    e.preventDefault();
    if (passcodeInput === creatorPasscode) {
      setIsCreatorPanelOpen(true);
      setShowPasscodeForm(false);
      setPasscodeInput('');
      setPasscodeError('');
    } else {
      setPasscodeError('Access Denied. Incorrect Master Key.');
    }
  };

  const handleSaveNewPasscode = (e: FormEvent) => {
    e.preventDefault();
    const cleanPass = newPasscodeInput.trim();
    if (!cleanPass) {
      alert('Passcode cannot be empty.');
      return;
    }
    localStorage.setItem('creator_passcode', cleanPass);
    setCreatorPasscode(cleanPass);
    setIsChangingPasscode(false);
    setNewPasscodeInput('');
    alert('Creator Master Key successfully updated and saved locally!');
  };

  const handleActivateSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    const name = ownerInput.trim() || "Active Gym Owner";
    const success = onActivate(keyInput.trim(), name);
    if (success) {
      alert("Pro License successfully locked and activated for this workstation!");
      setKeyInput('');
      setOwnerInput('');
    } else {
      alert("Invalid activation key format. Try generating one in the Creator Panel below!");
    }
  };

  const handleGenerateKey = () => {
    const rawHw = targetHwId.trim() || hardwareId || 'HW-1000';
    const hwSuffix = rawHw.replace(/[^A-Z0-9]/gi, '').slice(-4).toUpperCase();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let p1 = '';
    let p2 = '';
    for (let i = 0; i < 4; i++) {
      p1 += chars.charAt(Math.floor(Math.random() * chars.length));
      p2 += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Cryptographically bound key format: GYM-1YR-[HW_SUFFIX]-[P1]-[P2]
    const newKey = `GYM-1YR-${hwSuffix}-${p1}-${p2}`;
    setGeneratedKey(newKey);
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6" id="licensing-container">
      {/* Upper Grid: Device Lock console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="licensing-main-grid">
        {/* Left 2 Columns: Activation terminal */}
        <div className="lg:col-span-2 bg-[#161B22] border border-slate-800 rounded-3xl p-5 space-y-6 shadow-sm" id="activation-card">
          <div className="flex justify-between items-start" id="activation-header">
            <div>
              <h3 className="text-white font-semibold font-display text-lg flex items-center gap-2">
                <Laptop className="w-5 h-5 text-lime-400" />
                Station Lock & License Status
              </h3>
              <p className="text-slate-400 text-xs">Verify node lock authentication binding for this terminal</p>
            </div>
            {isLicenseActive ? (
              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-3.5 py-1.5 rounded-full uppercase flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> 1-Year License Active
              </span>
            ) : !isTrialExpired ? (
              <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold px-3.5 py-1.5 rounded-full uppercase flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" /> 7-Day Trial ({trialDaysRemaining} Day(s) Left)
              </span>
            ) : (
              <span className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold px-3.5 py-1.5 rounded-full uppercase flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-red-400" /> Read-Only Mode (Trial Ended)
              </span>
            )}
          </div>

          {/* Machine fingerprint reader display */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4" id="machine-spec-box">
            <div className="flex items-center gap-3.5" id="spec-hardware">
              <div className="bg-lime-400/10 text-lime-400 p-3 rounded-xl shrink-0">
                <Cpu className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider">Device Hardware ID</span>
                <span className="block text-white font-mono font-bold text-sm tracking-wide mt-0.5">{hardwareId}</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5" id="spec-station">
              <div className="bg-blue-500/10 text-blue-400 p-3 rounded-xl shrink-0">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider">Current Lock Target</span>
                <span className="block text-white font-semibold text-sm mt-0.5">
                  {license.ownerName || 'Unregistered Workstation'}
                </span>
              </div>
            </div>
          </div>

          {/* Activation Form */}
          {license.status !== 'activated' ? (
            <form onSubmit={handleActivateSubmit} className="space-y-4" id="activation-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="activate-inputs">
                <div id="activate-field-key">
                  <label className="block text-slate-400 text-xs font-semibold mb-1.5">Activation / Subscription Key</label>
                  <input
                    type="text"
                    required
                    placeholder="GYM-ACTV-XXXX-XXXX"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-4 py-2.5 text-white font-mono text-sm uppercase focus:outline-none focus:ring-0"
                  />
                </div>
                <div id="activate-field-owner">
                  <label className="block text-slate-400 text-xs font-semibold mb-1.5">Gym Center Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Iron Muscle Gym"
                    value={ownerInput}
                    onChange={(e) => setOwnerInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-0"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-lime-400 hover:bg-lime-500 text-black py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-lime-400/5"
                id="lock-activate-btn"
              >
                <Key className="w-4 h-4" /> Activate & Lock Node
              </button>
            </form>
          ) : (
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" id="activation-pro-info">
              <div>
                <h4 className="text-white text-sm font-bold flex items-center gap-1.5">
                  <Sparkles className="text-yellow-400 w-4 h-4" /> Professional workstation activated
                </h4>
                <p className="text-slate-400 text-xs mt-1">This installation of Gym Management Software is verified and locked to hardware registry node.</p>
              </div>
              <button
                onClick={onResetLicense}
                className="px-3.5 py-1.5 text-xs text-red-400 hover:text-white border border-slate-800 hover:bg-red-600 rounded-xl transition-all cursor-pointer"
                id="reset-activation-btn"
              >
                De-authorize PC
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Business Architecture explanation */}
        <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 flex flex-col justify-between shadow-sm" id="architecture-explanation">
          <div className="space-y-4" id="arch-top">
            <h4 className="text-white font-semibold font-display text-base flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-lime-400" />
              How Does PC Node Locking Work?
            </h4>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed" id="arch-bullets">
              <p>
                To deploy this software to multiple gym owners as an <strong>offline-first Desktop app (.exe)</strong>, we package this exact web stack using <strong>Electron</strong> or <strong>Tauri</strong>.
              </p>
              <p>
                <strong>1. Hardware Fingerprinting</strong>: Upon installation on a PC, Tauri/Electron queries the physical device's Motherboard serial, MAC address, or CPU ID via native OS APIs.
              </p>
              <p>
                <strong>2. License Validation</strong>: When connected to the internet, the app writes the Hardware ID registration to the central Google Sheet (the <code>DeviceLicenses</code> tab).
              </p>
              <p>
                <strong>3. Anti-Copy Lock</strong>: If a gym owner copies the files/database to another computer, the hardware signatures mismatch and lock access immediately.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 mt-5" id="arch-scalability-note">
            <span className="text-white font-bold block mb-0.5">Scalability & Cloud Sync</span>
            The database structure on Google Sheets supports monthly billing checking. Once you add recurring payments in future, the local node will disable automatically upon subscription lapse.
          </div>
        </div>
      </div>

      {/* Gym Branding & Details Configuration Card */}
      <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm" id="gym-branding-config-card">
        <div className="flex items-center gap-2 border-b border-slate-850 pb-3" id="branding-card-header">
          <Sparkles className="w-5 h-5 text-lime-400" />
          <div>
            <h4 className="text-white font-bold font-display text-base">Gym Profile & Branding Settings</h4>
            <p className="text-slate-400 text-xs">Configure your gym identity to automatically brand offline receipts, invoices, and local backup files</p>
          </div>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          onUpdateGymDetails(gymName, gymPhone, gymAddress);
          alert("Success! Your custom gym branding details have been saved. They will be used on all printed receipts and local database backups.");
        }} className="space-y-4" id="gym-branding-form">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="branding-inputs-grid">
            <div id="branding-field-name">
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">Custom Gym Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Iron Muscle Gym"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
              />
            </div>

            <div id="branding-field-phone">
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">Gym Contact Phone</label>
              <input
                type="text"
                placeholder="e.g. +91 98765 43210"
                value={gymPhone}
                onChange={(e) => setGymPhone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
              />
            </div>

            <div id="branding-field-address">
              <label className="block text-slate-400 text-xs font-semibold mb-1.5">Gym Address / Location</label>
              <input
                type="text"
                placeholder="e.g. Phase 1, Connaught Place, New Delhi"
                value={gymAddress}
                onChange={(e) => setGymAddress(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="bg-lime-400 hover:bg-lime-500 text-black px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-lime-400/5 cursor-pointer"
              id="save-branding-details-btn"
            >
              Save Branding Details
            </button>
          </div>
        </form>
      </div>

      {/* Creator Admin Licensing Panel (SECRET PREVIEW) */}
      <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-5 shadow-sm" id="creator-admin-panel">
        <div className="flex justify-between items-center" id="creator-header">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
            <div>
              <h4 className="text-white font-bold font-display text-base">Creator Licensing Admin Panel</h4>
              <p className="text-slate-400 text-xs">Simulated backend license key generator for you, the software creator</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isCreatorPanelOpen) {
                setIsCreatorPanelOpen(false);
              } else {
                setShowPasscodeForm(true);
                setPasscodeInput('');
                setPasscodeError('');
              }
            }}
            className="text-xs text-lime-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
            id="toggle-creator-panel"
          >
            <Lock className="w-3 h-3" />
            {isCreatorPanelOpen ? 'Lock Admin Panel' : 'Unlock Admin Panel'}
          </button>
        </div>

        {isCreatorPanelOpen && (
          <div className="mt-5 pt-5 border-t border-slate-850 space-y-4 animate-scaleUp" id="creator-body">
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              As the SaaS developer, generate 1-year subscription keys for remote gym owners by entering their PC Hardware ID (sent via WhatsApp/Email or retrieved on-site). Keys are cryptographically bound to that exact Hardware ID to prevent unauthorized key sharing!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4" id="generator-inputs-grid">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Customer PC Hardware ID <span className="text-lime-400 font-mono">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={targetHwId}
                    onChange={(e) => setTargetHwId(e.target.value.toUpperCase())}
                    placeholder="e.g. HW-8492 or GYM-HW-DEMOPC"
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-lime-400 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                    id="target-hwid-input"
                  />
                  <button
                    type="button"
                    onClick={() => setTargetHwId(hardwareId || '')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap border border-slate-700"
                    title="Insert current PC's Hardware ID"
                    id="use-current-hwid-btn"
                  >
                    Use Local HW
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">Ask gym owner to read their Hardware ID from their Licensing tab.</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Target Gym / Owner Name
                </label>
                <input
                  type="text"
                  value={targetGymName}
                  onChange={(e) => setTargetGymName(e.target.value)}
                  placeholder="e.g. Titan Power Gym"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-lime-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  id="target-gym-input"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Used for issuing receipt/registration confirmation.</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1" id="generator-actions">
              <button
                type="button"
                onClick={handleGenerateKey}
                className="bg-lime-400 hover:bg-lime-500 text-black px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-lime-400/10"
                id="generate-key-btn"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Generate 1-Year Hardware-Locked Key
              </button>

              {generatedKey && (
                <div className="flex items-center bg-slate-900 border border-lime-400/40 rounded-xl pl-3.5 pr-2 py-1.5 shadow-sm" id="generated-key-box">
                  <div className="mr-4">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">1-Year License Code</span>
                    <span className="text-yellow-400 font-mono text-xs font-bold tracking-wider">{generatedKey}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-lime-400 hover:text-black text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    id="copy-key-btn"
                  >
                    {copied ? 'Copied!' : <><Copy className="w-3.5 h-3.5" /> Copy Key</>}
                  </button>
                </div>
              )}
            </div>

            {/* Customizer Sub-panel */}
            <div className="border-t border-slate-850 pt-4 mt-4" id="passcode-change-section">
              {!isChangingPasscode ? (
                <button
                  type="button"
                  onClick={() => setIsChangingPasscode(true)}
                  className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                  id="change-passcode-toggle-btn"
                >
                  <Key className="w-3.5 h-3.5 text-slate-500" /> Change Master Creator Passcode
                </button>
              ) : (
                <form onSubmit={handleSaveNewPasscode} className="flex items-center gap-2 max-w-sm" id="change-pass-form">
                  <input
                    type="text"
                    required
                    placeholder="Enter new master key"
                    value={newPasscodeInput}
                    onChange={(e) => setNewPasscodeInput(e.target.value)}
                    className="bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
                    id="new-passcode-input"
                  />
                  <button
                    type="submit"
                    className="bg-lime-400 hover:bg-lime-500 text-black px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                    id="save-new-passcode-btn"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChangingPasscode(false)}
                    className="text-xs text-slate-400 hover:text-white px-2 cursor-pointer"
                    id="cancel-new-passcode-btn"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Passcode Modal */}
      {showPasscodeForm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" id="passcode-modal">
          <div className="bg-[#161B22] border border-slate-800 rounded-3xl max-w-sm w-full shadow-2xl p-6" id="passcode-modal-content">
            <div className="text-center space-y-2 pb-4 border-b border-slate-800" id="passcode-header">
              <Lock className="w-8 h-8 text-lime-400 mx-auto" />
              <h3 className="text-white font-bold text-lg font-display">Creator Master Gate</h3>
              <p className="text-slate-400 text-xs">Verify your software founder credentials to access the key generator</p>
            </div>
            
            <form onSubmit={handleVerifyPasscode} className="mt-4 space-y-4" id="passcode-form">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Master Creator Key</label>
                <input
                  type="password"
                  placeholder="Enter creator passcode"
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none"
                  autoFocus
                  id="passcode-input"
                />
                {passcodeError && (
                  <span className="text-red-400 text-[11px] mt-1.5 block font-medium" id="passcode-error-msg">{passcodeError}</span>
                )}
              </div>

              <div className="flex gap-2 pt-2" id="passcode-actions">
                <button
                  type="button"
                  onClick={() => setShowPasscodeForm(false)}
                  className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-semibold py-2.5 rounded-xl transition-all text-center cursor-pointer"
                  id="cancel-passcode-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-lime-400 hover:bg-lime-500 text-black text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-lime-400/5"
                  id="verify-passcode-btn"
                >
                  Verify Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
