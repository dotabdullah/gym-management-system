import React, { useState, useRef, DragEvent, FormEvent } from 'react';
import { 
  Database, 
  Upload, 
  Download, 
  Trash2, 
  FileSpreadsheet, 
  Check, 
  AlertTriangle,
  Info,
  Sparkles,
  Clipboard,
  ShieldCheck
} from 'lucide-react';
import { Member, Payment, Plan, AttendanceRecord } from '../types';

interface DataManagerTabProps {
  members: Member[];
  payments: Payment[];
  plans: Plan[];
  attendance: AttendanceRecord[];
  onImportData: (importedMembers: Member[], importedPayments: Payment[]) => void;
  onClearDatabase: (clearMembers: boolean, clearPayments: boolean, clearAttendance: boolean) => void;
  onRestoreBackup?: (data: { members: Member[]; payments: Payment[]; plans: Plan[]; attendance: AttendanceRecord[] }) => void;
  backupStatus?: {
    folderName: string | null;
    lastBackupAt: string | null;
    error: string | null;
    isConfigured: boolean;
  };
  onSelectBackupDirectory?: () => Promise<void>;
  onDisconnectBackupDirectory?: () => Promise<void>;
}

export default function DataManagerTab({
  members,
  payments,
  plans,
  attendance,
  onImportData,
  onClearDatabase,
  onRestoreBackup,
  backupStatus = { folderName: null, lastBackupAt: null, error: null, isConfigured: false },
  onSelectBackupDirectory,
  onDisconnectBackupDirectory
}: DataManagerTabProps) {
  // Import states
  const [csvPasteData, setCsvPasteData] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    success: boolean;
    count: number;
    errors: string[];
    logs: string[];
  } | null>(null);

  // Restore states
  const [restoreSummary, setRestoreSummary] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        // Basic verification that the uploaded JSON has our backup structure
        const hasMembers = Array.isArray(data.members);
        const hasPayments = Array.isArray(data.payments);
        
        if (!hasMembers && !hasPayments) {
          throw new Error("Invalid backup file format. The JSON file must contain 'members' or 'payments' arrays.");
        }

        const memberCount = data.members?.length || 0;
        const paymentCount = data.payments?.length || 0;
        const attendanceCount = data.attendance?.length || 0;
        const planCount = data.plans?.length || 0;

        const confirmRestore = window.confirm(
          `Are you sure you want to restore this backup?\n\nThis will load:\n- ${memberCount} Athletes\n- ${paymentCount} Payments\n- ${attendanceCount} Attendance Logs\n- ${planCount} Rate Tiers\n\nWarning: Your current active database will be completely replaced!`
        );

        if (!confirmRestore) {
          setRestoreSummary({
            success: false,
            message: "Restore canceled by user."
          });
          return;
        }

        if (onRestoreBackup) {
          onRestoreBackup({
            members: data.members || [],
            payments: data.payments || [],
            plans: data.plans || [],
            attendance: data.attendance || []
          });
          setRestoreSummary({
            success: true,
            message: `Successfully restored ${memberCount} athletes, ${paymentCount} payments, ${attendanceCount} logs, and ${planCount} rate tiers.`
          });
        }
      } catch (err: any) {
        console.error("JSON restore failed:", err);
        setRestoreSummary({
          success: false,
          message: err.message || "Failed to parse backup JSON file. Ensure it is a valid backup file."
        });
      }
    };
    reader.readAsText(file);
  };
  
  // Wipe states
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmation, setWipeConfirmation] = useState('');
  const [wipeMembers, setWipeMembers] = useState(true);
  const [wipePayments, setWipePayments] = useState(true);
  const [wipeAttendance, setWipeAttendance] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Convert array of objects to CSV string
  const convertToCSV = (data: any[], headers: string[]) => {
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header] !== undefined && row[header] !== null ? row[header] : '';
        // Escape quotes
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  };

  // Helper: Trigger standard file download
  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Action: Export Athletes
  const handleExportMembers = () => {
    if (members.length === 0) {
      alert("There are no athletes to export.");
      return;
    }

    const headers = [
      'id', 'name', 'email', 'phone', 'status', 'planId', 
      'notes', 'emergencyContactName', 'emergencyContactPhone', 'joinDate'
    ];
    
    // Add plan name for context
    const enrichedData = members.map(m => {
      const plan = plans.find(p => p.id === m.planId);
      return {
        ...m,
        planName: plan ? plan.name : 'Unknown Plan'
      };
    });

    const exportHeaders = [...headers, 'planName'];
    const csv = convertToCSV(enrichedData, exportHeaders);
    downloadFile(csv, `athletes_export_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  };

  // Action: Export Payments Ledger
  const handleExportPayments = () => {
    if (payments.length === 0) {
      alert("There are no payments to export.");
      return;
    }

    const headers = ['id', 'memberId', 'amount', 'date', 'paymentMethod', 'notes'];
    
    // Enrich with names
    const enrichedData = payments.map(p => {
      const m = members.find(mem => mem.id === p.memberId);
      const plan = plans.find(pl => pl.id === p.planId);
      return {
        ...p,
        memberName: m ? m.name : 'Unknown Athlete',
        planName: plan ? plan.name : 'N/A'
      };
    });

    const exportHeaders = ['id', 'memberName', 'amount', 'date', 'paymentMethod', 'planName', 'notes'];
    const csv = convertToCSV(enrichedData, exportHeaders);
    downloadFile(csv, `revenue_ledger_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  };

  // Parsing CSV implementation
  const parseCSVString = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];

    // Parse headers
    const rawHeaders = lines[0].split(',');
    const headers = rawHeaders.map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

    const results: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quotes correctly (comma separated, but ignoring commas inside quotes)
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
      const values = matches.map(v => v.trim().replace(/^["']|["']$/g, ''));

      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      results.push(obj);
    }
    return results;
  };

  // Process Imported Datasets
  const processImports = (parsedRows: any[]) => {
    const errors: string[] = [];
    const logs: string[] = [];
    const newMembers: Member[] = [];
    const newPayments: Payment[] = [];

    if (parsedRows.length === 0) {
      setImportSummary({
        success: false,
        count: 0,
        errors: ['No valid data rows found in spreadsheet.'],
        logs: []
      });
      return;
    }

    parsedRows.forEach((row, idx) => {
      // Find name (alias name/athlete name/athlete)
      const name = row.name || row['athlete name'] || row.athlete || row['full name'] || '';
      if (!name.trim()) {
        errors.push(`Row ${idx + 2}: Skipped (Name column is blank or missing)`);
        return;
      }

      // Find plan ID matching planName or default
      const planNameVal = (row.planname || row.plan || row['locker plan'] || '').toLowerCase();
      let matchedPlanId = plans[0]?.id || '';
      
      if (planNameVal) {
        const matched = plans.find(p => p.name.toLowerCase().includes(planNameVal) || p.id.toLowerCase() === planNameVal);
        if (matched) {
          matchedPlanId = matched.id;
        }
      }

      // Determine Status
      const statusVal = (row.status || 'active').toLowerCase().trim();
      const status: 'active' | 'expired' | 'pending' = 
        ['active', 'expired', 'pending'].includes(statusVal) ? (statusVal as any) : 'active';

      // Assemble Member Object
      const memberId = row.id || `mem_${Math.random().toString(36).substr(2, 9)}`;
      const memberObj: Member = {
        id: memberId,
        name: name.trim(),
        email: (row.email || row['email address'] || '').trim(),
        phone: (row.phone || row['phone number'] || row.contact || '').trim(),
        status,
        planId: matchedPlanId,
        notes: (row.notes || row.remark || row.remarks || '').trim(),
        emergencyContactName: (row.emergencycontactname || row['emergency name'] || row.emergency_name || '').trim(),
        emergencyContactPhone: (row.emergencycontactphone || row['emergency phone'] || row.emergency_phone || '').trim(),
        joinDate: row.joindate || row.join_date || row['join date'] || new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      };

      newMembers.push(memberObj);
      logs.push(`Successfully prepared: "${memberObj.name}"`);

      // If there is an amount column, log an initial payment as well!
      const amountVal = Number(row.amount || row.payment || row['amount paid'] || 0);
      if (amountVal > 0) {
        newPayments.push({
          id: `pay_${Math.random().toString(36).substr(2, 9)}`,
          memberId: memberId,
          planId: matchedPlanId,
          amount: amountVal,
          date: row.date || row.paymentdate || row['payment date'] || new Date().toISOString().split('T')[0],
          paymentMethod: (row.paymentmethod || row.method || 'Cash'),
          notes: 'Imported initial dues from sheets',
          updatedAt: new Date().toISOString()
        });
      }
    });

    if (newMembers.length > 0) {
      onImportData(newMembers, newPayments);
      setImportSummary({
        success: true,
        count: newMembers.length,
        errors,
        logs: [`Added ${newMembers.length} athletes.`, `Recorded ${newPayments.length} associated payments.`, ...logs]
      });
      setCsvPasteData('');
    } else {
      setImportSummary({
        success: false,
        count: 0,
        errors: ['Could not import any rows. Please check headers.', ...errors],
        logs: []
      });
    }
  };

  // Handle manual paste import submit
  const handlePasteSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!csvPasteData.trim()) return;
    const parsed = parseCSVString(csvPasteData);
    processImports(parsed);
  };

  // Handle file select upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSVString(text);
      processImports(parsed);
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSVString(text);
      processImports(parsed);
    };
    reader.readAsText(file);
  };

  // Action: Wipe confirmation handler
  const handleWipeSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (wipeConfirmation.trim().toUpperCase() !== 'RESET') {
      alert("Verification word incorrect. Database wipe canceled.");
      return;
    }

    onClearDatabase(wipeMembers, wipePayments, wipeAttendance);
    setShowWipeModal(false);
    setWipeConfirmation('');
    setImportSummary(null);
    alert("Database successfully wiped and reset!");
  };

  return (
    <div className="space-y-6" id="data-manager-tab">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#161B22] border border-slate-800 rounded-3xl p-6 shadow-sm" id="dm-header">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-lime-400">
            <Database className="w-5 h-5" />
            <h2 className="text-xl font-bold font-display text-white">Database Backups & Import / Export</h2>
          </div>
          <p className="text-slate-400 text-xs max-w-xl">
            Import records directly from your old Excel or Google Sheets, export backups for offline storage, or reset your local station database safely.
          </p>
        </div>

        <button
          onClick={() => setShowWipeModal(true)}
          className="bg-red-950/20 hover:bg-red-950 text-red-400 border border-red-900/40 hover:border-red-500 rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-2 w-fit cursor-pointer"
          id="trigger-wipe-btn"
        >
          <Trash2 className="w-4 h-4" />
          <span>Empty Database</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Import section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-6 space-y-4" id="import-box">
            <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
              <Upload className="w-4 h-4 text-lime-400" />
              <h3 className="text-white font-bold text-sm uppercase tracking-wider font-sans">Import Old Records from Sheets</h3>
            </div>

            {/* Instruction Banner */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-2.5" id="csv-instructions">
              <div className="flex items-center gap-1.5 text-lime-400 font-bold">
                <Info className="w-4 h-4" />
                <span>How to import from Google Sheets / Excel:</span>
              </div>
              <p className="leading-relaxed">
                Ensure your Excel sheet or Google Sheet has columns with these headers on the very first row. The order of columns does not matter:
              </p>
              <div className="bg-[#0A0C10] p-3 rounded-xl border border-slate-850 font-mono text-[11px] grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-300">
                <div><span className="text-lime-400">name</span> * (Athlete)</div>
                <div><span>phone</span> (Optional)</div>
                <div><span>email</span> (Optional)</div>
                <div><span>plan</span> (Rate tier name)</div>
                <div><span>status</span> (active/expired)</div>
                <div><span>emergency_name</span></div>
                <div><span>emergency_phone</span></div>
                <div><span>amount</span> (Log payments)</div>
              </div>
              <p className="text-[10px] text-slate-500">
                * Note: The <code className="text-white font-mono bg-slate-950 px-1 py-0.5 rounded">name</code> column is mandatory. All other columns will fallback to default values if empty or missing.
              </p>
            </div>

            {/* Drag & Drop File Upload */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                isDragging 
                  ? 'border-lime-400 bg-lime-400/5' 
                  : 'border-slate-800 hover:border-lime-400/50 bg-[#0A0C10]/40 hover:bg-[#0A0C10]/80'
              }`}
              id="drop-zone"
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
                id="csv-file-input"
              />
              <FileSpreadsheet className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">Drag & drop your exported `.csv` file here</p>
              <p className="text-xs text-slate-500 mt-1">Or click to browse your computer files</p>
            </div>

            {/* Copy / Paste Box Alternative */}
            <form onSubmit={handlePasteSubmit} className="space-y-3" id="paste-form">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Clipboard className="w-3.5 h-3.5 text-slate-500" /> Or paste your spreadsheet rows directly:
                </label>
                <span className="text-slate-500">Separated by commas, includes header</span>
              </div>
              <textarea
                placeholder="name,phone,email,plan,status&#10;Zahid Ali,03001112222,zahid@example.com,Standard,active&#10;Amna Bibi,03114445555,amna@example.com,Premium,active"
                value={csvPasteData}
                onChange={(e) => setCsvPasteData(e.target.value)}
                rows={4}
                className="w-full bg-slate-900 border border-slate-800 focus:border-lime-400 rounded-2xl p-3 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-lime-400"
                id="csv-paste-textarea"
              />
              <button
                type="submit"
                disabled={!csvPasteData.trim()}
                className="w-full bg-lime-400 hover:bg-lime-500 disabled:opacity-40 text-black text-xs font-extrabold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-lime-400/5"
                id="submit-pasted-data"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Parse & Import Pasted Data</span>
              </button>
            </form>

            {/* Import Status Summary */}
            {importSummary && (
              <div className={`border rounded-2xl p-4 space-y-3 ${importSummary.success ? 'border-lime-500/20 bg-lime-950/10' : 'border-red-500/20 bg-red-950/10'}`} id="import-summary-box">
                <div className="flex items-center gap-2">
                  {importSummary.success ? (
                    <Check className="w-5 h-5 text-lime-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-white font-bold text-xs uppercase">
                      {importSummary.success ? 'Import Completed Successfully!' : 'Import Failed'}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {importSummary.count > 0 ? `Successfully imported ${importSummary.count} records.` : 'Zero records were imported.'}
                    </p>
                  </div>
                </div>

                {importSummary.logs.length > 0 && (
                  <div className="space-y-1 bg-[#0A0C10]/80 p-2.5 rounded-xl border border-slate-850 max-h-32 overflow-y-auto" id="import-logs">
                    {importSummary.logs.slice(0, 30).map((log, lidx) => (
                      <div key={lidx} className="text-[10px] text-slate-300 font-mono flex items-start gap-1.5">
                        <span className="text-lime-500">✓</span> {log}
                      </div>
                    ))}
                    {importSummary.logs.length > 30 && (
                      <div className="text-[10px] text-slate-500 font-mono italic pl-4">...and {importSummary.logs.length - 30} more rows</div>
                    )}
                  </div>
                )}

                {importSummary.errors.length > 0 && (
                  <div className="space-y-1 bg-red-950/20 p-2.5 rounded-xl border border-red-900/20 max-h-24 overflow-y-auto" id="import-errors">
                    <p className="text-[10px] text-red-400 font-bold">Errors & Warnings:</p>
                    {importSummary.errors.map((err, eidx) => (
                      <div key={eidx} className="text-[10px] text-red-300 font-mono">
                        ⚠ {err}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Restore Database from JSON Backup */}
          <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-6 space-y-4" id="restore-backup-box">
            <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
              <Database className="w-4 h-4 text-emerald-400" />
              <h3 className="text-white font-bold text-sm uppercase tracking-wider font-sans">Restore Database from JSON Backup</h3>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              If you have an offline `.json` backup file (such as the files automatically saved to your PC backup folder or exported), you can upload it here to restore your entire database. 
              <span className="text-amber-400 font-semibold"> Warning: This will completely replace your current athletes, payments, plans, and attendance data.</span>
            </p>

            {/* JSON File Upload */}
            <div
              onClick={() => jsonFileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-800 hover:border-emerald-400/50 bg-[#0A0C10]/40 hover:bg-[#0A0C10]/80 rounded-2xl p-6 text-center cursor-pointer transition-all duration-200"
              id="json-drop-zone"
            >
              <input 
                type="file" 
                ref={jsonFileInputRef}
                onChange={handleJsonFileChange}
                accept=".json"
                className="hidden"
                id="json-file-input"
              />
              <Upload className="w-10 h-10 text-emerald-500/80 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">Click to select or drag your `.json` backup file here</p>
              <p className="text-xs text-slate-500 mt-1">Accepts only valid `.json` backup files</p>
            </div>

            {restoreSummary && (
              <div className={`border rounded-2xl p-4 space-y-2 ${restoreSummary.success ? 'border-emerald-500/20 bg-emerald-950/10' : 'border-red-500/20 bg-red-950/10'}`} id="restore-summary-box">
                <div className="flex items-center gap-2">
                  {restoreSummary.success ? (
                    <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-white font-bold text-xs uppercase">
                      {restoreSummary.success ? 'Database Restored Successfully!' : 'Restore Failed'}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {restoreSummary.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Export backups */}
        <div className="space-y-6">
          <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-6 space-y-4" id="export-box">
            <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
              <Download className="w-4 h-4 text-lime-400" />
              <h3 className="text-white font-bold text-sm uppercase tracking-wider font-sans">Export Spreadsheet Backups</h3>
            </div>
            
            <p className="text-slate-400 text-xs leading-relaxed">
              Generate offline backups of your local gym datasets instantly. These files open directly in Google Sheets, Microsoft Excel, LibreOffice, or Numbers.
            </p>

            <div className="space-y-3 pt-2" id="export-buttons-stack">
              <button
                onClick={handleExportMembers}
                className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-lime-400 text-slate-200 hover:text-white px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all group cursor-pointer"
                id="export-athletes-csv-btn"
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-lime-400 group-hover:scale-110 transition-transform" />
                  <span className="text-left font-display">Athletes Database</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-[#0A0C10] border border-slate-850 px-2 py-0.5 rounded-md group-hover:text-lime-400 transition-colors">
                  {members.length} rows
                </span>
              </button>

              <button
                onClick={handleExportPayments}
                className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-lime-400 text-slate-200 hover:text-white px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all group cursor-pointer"
                id="export-revenue-csv-btn"
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-left font-display">Revenue Ledger</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-[#0A0C10] border border-slate-850 px-2 py-0.5 rounded-md group-hover:text-blue-400 transition-colors">
                  {payments.length} rows
                </span>
              </button>
            </div>

            <div className="bg-slate-900/40 p-3.5 rounded-2xl border border-slate-850 space-y-2 text-xs text-slate-500" id="offline-assurance">
              <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-lime-400" />
                <span>100% Secure & Offline</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                All imports and exports occur client-side inside your computer app sandbox. Your client names, phones, and revenue numbers are never sent to external servers or third-party platforms.
              </p>
            </div>
          </div>

          {/* Automated Local Backup Config Card */}
          <div className="bg-[#161B22] border border-slate-800 rounded-3xl p-6 space-y-4" id="local-folder-backup-box">
            <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
              <Database className="w-4 h-4 text-lime-400" />
              <h3 className="text-white font-bold text-sm uppercase tracking-wider font-sans">Automated PC Folder Backup</h3>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              Connect a real physical directory folder on your computer's hard drive. The application will automatically write a full JSON database backup file into that folder in real-time on any changes (such as registering athletes or payments), even when completely offline!
            </p>

            {backupStatus.isConfigured ? (
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 space-y-3.5" id="backup-folder-status-panel">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="block text-[10px] uppercase font-bold text-slate-500">Linked Folder Name:</span>
                    <span className="font-semibold text-white text-xs flex items-center gap-1.5 font-mono">
                      📁 {backupStatus.folderName}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                    ● Active Offline-Auto
                  </span>
                </div>

                {backupStatus.lastBackupAt && (
                  <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 flex justify-between">
                    <span>Last live backup:</span>
                    <strong className="text-slate-200">{backupStatus.lastBackupAt.split(', ')[1]} ({backupStatus.lastBackupAt.split(', ')[0]})</strong>
                  </div>
                )}

                {backupStatus.error && (
                  <p className="text-[10px] text-red-400 font-mono bg-red-400/5 p-2 rounded-lg border border-red-500/10">
                    ⚠️ {backupStatus.error}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={onSelectBackupDirectory}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-1.5 px-3 rounded-lg text-[11px] font-semibold transition-all border border-slate-750 cursor-pointer"
                  >
                    Change Folder
                  </button>
                  <button
                    onClick={onDisconnectBackupDirectory}
                    className="flex-1 bg-red-950/20 hover:bg-red-950 text-red-400 py-1.5 px-3 rounded-lg text-[11px] font-semibold transition-all border border-red-900/40 hover:border-red-500/30 cursor-pointer"
                  >
                    Unlink Folder
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3" id="backup-folder-setup-panel">
                {'showDirectoryPicker' in window ? (
                  <button
                    onClick={onSelectBackupDirectory}
                    className="w-full bg-lime-400 hover:bg-lime-500 text-black px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-lime-400/5 cursor-pointer"
                    id="select-local-folder-btn"
                  >
                    <Database className="w-4 h-4" />
                    <span>Configure Local Backup Folder</span>
                  </button>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-xs text-amber-300">
                    ⚠️ Direct local directory access is not supported by your current browser profile (Safari/Firefox). Please use Google Chrome or Microsoft Edge to link a local folder handle.
                  </div>
                )}
                <p className="text-[10px] text-slate-500 text-center italic">
                  Note: Your browser's built-in secure database sandbox (LocalStorage) is active automatically to protect your offline data at all times.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wipe Database Modal */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" id="wipe-modal">
          <div className="bg-[#161B22] border border-slate-800 rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4" id="wipe-modal-content">
            <div className="text-center space-y-2 pb-2" id="wipe-modal-header">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
              <h3 className="text-white font-bold text-lg font-display">Are you absolutely sure?</h3>
              <p className="text-slate-400 text-xs">This action will erase local datasets permanently. It cannot be undone.</p>
            </div>

            <div className="bg-red-950/20 border border-red-900/30 rounded-2xl p-3.5 space-y-3" id="wipe-dataset-selectors">
              <p className="text-xs text-red-400 font-bold uppercase tracking-wider">Select datasets to delete:</p>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer hover:text-white" id="cb-label-members">
                  <input
                    type="checkbox"
                    checked={wipeMembers}
                    onChange={(e) => setWipeMembers(e.target.checked)}
                    className="rounded text-red-500 focus:ring-red-500 bg-slate-900 border-slate-800 w-4 h-4"
                  />
                  <span>Delete all Athletes ({members.length})</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer hover:text-white" id="cb-label-payments">
                  <input
                    type="checkbox"
                    checked={wipePayments}
                    onChange={(e) => setWipePayments(e.target.checked)}
                    className="rounded text-red-500 focus:ring-red-500 bg-slate-900 border-slate-800 w-4 h-4"
                  />
                  <span>Delete all Payments ({payments.length})</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer hover:text-white" id="cb-label-attendance">
                  <input
                    type="checkbox"
                    checked={wipeAttendance}
                    onChange={(e) => setWipeAttendance(e.target.checked)}
                    className="rounded text-red-500 focus:ring-red-500 bg-slate-900 border-slate-800 w-4 h-4"
                  />
                  <span>Delete all Attendance Logs ({attendance.length})</span>
                </label>
              </div>
            </div>

            <form onSubmit={handleWipeSubmit} className="space-y-4" id="wipe-confirmation-form">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                  Type <span className="text-red-400 font-mono">RESET</span> below to authorize:
                </label>
                <input
                  type="text"
                  required
                  placeholder="RESET"
                  value={wipeConfirmation}
                  onChange={(e) => setWipeConfirmation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-red-500 rounded-xl px-4 py-2.5 text-center text-white font-mono text-sm uppercase focus:outline-none focus:ring-1 focus:ring-red-500"
                  id="wipe-text-confirmation"
                />
              </div>

              <div className="flex gap-3 pt-2" id="wipe-actions">
                <button
                  type="button"
                  onClick={() => { setShowWipeModal(false); setWipeConfirmation(''); }}
                  className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer"
                  id="cancel-wipe-btn"
                >
                  Keep Data
                </button>
                <button
                  type="submit"
                  disabled={wipeConfirmation.trim().toUpperCase() !== 'RESET' || (!wipeMembers && !wipePayments && !wipeAttendance)}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-red-600/10"
                  id="confirm-wipe-btn"
                >
                  Erase Datasets
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
