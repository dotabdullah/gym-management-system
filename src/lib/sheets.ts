import { Member, Payment, Plan, AttendanceRecord, License } from '../types';

interface SheetData {
  members: Member[];
  payments: Payment[];
  plans: Plan[];
  attendance: AttendanceRecord[];
  licenses: License[];
}

// REST endpoints for Google Sheets and Drive
const DRIVE_SEARCH_URL = "https://www.googleapis.com/drive/v3/files";
const SHEETS_BASE_URL = "https://sheets.googleapis.com/v4/spreadsheets";

// Helper to make Google API requests
async function googleFetch(url: string, accessToken: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errText = await response.text();
    console.error(`Google API Error on ${url}:`, errText);
    throw new Error(`Google API Error: ${response.status} ${response.statusText} - ${errText}`);
  }
  return response.json();
}

/**
 * Searches Google Drive for a spreadsheet named "Gym Management Software Database"
 */
export async function findSpreadsheet(accessToken: string): Promise<string | null> {
  const q = encodeURIComponent("name = 'Gym Management Software Database' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const data = await googleFetch(`${DRIVE_SEARCH_URL}?q=${q}&fields=files(id,name,webViewLink)`, accessToken);
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Creates a new Google Sheet database with the necessary tabs
 */
export async function createSpreadsheet(accessToken: string): Promise<{ id: string; url: string }> {
  const body = {
    properties: {
      title: "Gym Management Software Database"
    },
    sheets: [
      { properties: { title: "Members", index: 0 } },
      { properties: { title: "Payments", index: 1 } },
      { properties: { title: "Plans", index: 2 } },
      { properties: { title: "Attendance", index: 3 } },
      { properties: { title: "DeviceLicenses", index: 4 } }
    ]
  };

  const response = await googleFetch(SHEETS_BASE_URL, accessToken, {
    method: 'POST',
    body: JSON.stringify(body)
  });

  return {
    id: response.spreadsheetId,
    url: response.spreadsheetUrl
  };
}

/**
 * Fetches data from all sheets in the database
 */
export async function readSpreadsheetData(accessToken: string, spreadsheetId: string): Promise<SheetData> {
  const ranges = [
    "Members!A:K",
    "Payments!A:H",
    "Plans!A:F",
    "Attendance!A:D",
    "DeviceLicenses!A:F"
  ];
  const queryRanges = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `${SHEETS_BASE_URL}/${spreadsheetId}/values:batchGet?${queryRanges}&valueRenderOption=UNFORMATTED_VALUE`;
  
  const data = await googleFetch(url, accessToken);
  const valueRanges = data.valueRanges || [];

  const members: Member[] = [];
  const payments: Payment[] = [];
  const plans: Plan[] = [];
  const attendance: AttendanceRecord[] = [];
  const licenses: License[] = [];

  // 1. Parse Members
  const memberRows = valueRanges.find((vr: any) => vr.range.startsWith('Members!'))?.values || [];
  if (memberRows.length > 1) { // Skip headers
    for (let i = 1; i < memberRows.length; i++) {
      const row = memberRows[i];
      if (!row[0]) continue; // Skip if ID is missing
      members.push({
        id: String(row[0]),
        name: String(row[1] || ''),
        email: String(row[2] || ''),
        phone: String(row[3] || ''),
        joinDate: String(row[4] || ''),
        planId: String(row[5] || ''),
        status: (row[6] || 'active') as 'active' | 'expired' | 'pending',
        notes: String(row[7] || ''),
        emergencyContactName: String(row[8] || ''),
        emergencyContactPhone: String(row[9] || ''),
        updatedAt: String(row[10] || new Date().toISOString())
      });
    }
  }

  // 2. Parse Payments
  const paymentRows = valueRanges.find((vr: any) => vr.range.startsWith('Payments!'))?.values || [];
  if (paymentRows.length > 1) {
    for (let i = 1; i < paymentRows.length; i++) {
      const row = paymentRows[i];
      if (!row[0]) continue;
      payments.push({
        id: String(row[0]),
        memberId: String(row[1] || ''),
        planId: String(row[2] || ''),
        amount: Number(row[3] || 0),
        date: String(row[4] || ''),
        paymentMethod: (row[5] || 'Cash') as any,
        notes: String(row[6] || ''),
        updatedAt: String(row[7] || new Date().toISOString())
      });
    }
  }

  // 3. Parse Plans
  const planRows = valueRanges.find((vr: any) => vr.range.startsWith('Plans!'))?.values || [];
  if (planRows.length > 1) {
    for (let i = 1; i < planRows.length; i++) {
      const row = planRows[i];
      if (!row[0]) continue;
      plans.push({
        id: String(row[0]),
        name: String(row[1] || ''),
        price: Number(row[2] || 0),
        durationMonths: Number(row[3] || 1),
        features: String(row[4] || '').split(';').filter(Boolean),
        updatedAt: String(row[5] || new Date().toISOString())
      });
    }
  }

  // 4. Parse Attendance
  const attendanceRows = valueRanges.find((vr: any) => vr.range.startsWith('Attendance!'))?.values || [];
  if (attendanceRows.length > 1) {
    for (let i = 1; i < attendanceRows.length; i++) {
      const row = attendanceRows[i];
      if (!row[0]) continue;
      attendance.push({
        id: String(row[0]),
        memberId: String(row[1] || ''),
        date: String(row[2] || ''),
        checkInTime: String(row[3] || '')
      });
    }
  }

  // 5. Parse Licenses
  const licenseRows = valueRanges.find((vr: any) => vr.range.startsWith('DeviceLicenses!'))?.values || [];
  if (licenseRows.length > 1) {
    for (let i = 1; i < licenseRows.length; i++) {
      const row = licenseRows[i];
      if (!row[0]) continue;
      licenses.push({
        key: String(row[0]),
        status: (row[1] || 'unactivated') as any,
        activatedAt: row[2] ? String(row[2]) : null,
        expiresAt: row[3] ? String(row[3]) : null,
        hwId: String(row[4] || ''),
        ownerName: String(row[5] || '')
      });
    }
  }

  return { members, payments, plans, attendance, licenses };
}

/**
 * Overwrites spreadsheets with merged local data
 */
export async function writeSpreadsheetData(
  accessToken: string,
  spreadsheetId: string,
  data: SheetData
): Promise<void> {
  // First, batch clear existing values so we don't leave stale data
  const clearRanges = ["Members!A2:K10000", "Payments!A2:H10000", "Plans!A2:F1000", "Attendance!A2:D50000", "DeviceLicenses!A2:F1000"];
  await googleFetch(`${SHEETS_BASE_URL}/${spreadsheetId}/values:batchClear`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ ranges: clearRanges })
  });

  // Prepare data values with headers
  const memberValues = [
    ["ID", "Name", "Email", "Phone", "Join Date", "Plan ID", "Status", "Notes", "Emergency Contact Name", "Emergency Contact Phone", "Updated At"],
    ...data.members.map(m => [
      m.id, m.name, m.email, m.phone, m.joinDate, m.planId, m.status, m.notes, m.emergencyContactName, m.emergencyContactPhone, m.updatedAt
    ])
  ];

  const paymentValues = [
    ["ID", "Member ID", "Plan ID", "Amount", "Date", "Payment Method", "Notes", "Updated At"],
    ...data.payments.map(p => [
      p.id, p.memberId, p.planId, p.amount, p.date, p.paymentMethod, p.notes, p.updatedAt
    ])
  ];

  const planValues = [
    ["ID", "Name", "Price", "Duration Months", "Features", "Updated At"],
    ...data.plans.map(p => [
      p.id, p.name, p.price, p.durationMonths, p.features.join(';'), p.updatedAt
    ])
  ];

  const attendanceValues = [
    ["ID", "Member ID", "Date", "Check-In Time"],
    ...data.attendance.map(a => [
      a.id, a.memberId, a.date, a.checkInTime
    ])
  ];

  const licenseValues = [
    ["License Key", "Status", "Activated At", "Expires At", "Hardware ID", "Owner Name"],
    ...data.licenses.map(l => [
      l.key, l.status, l.activatedAt || '', l.expiresAt || '', l.hwId, l.ownerName
    ])
  ];

  const updateBody = {
    valueInputOption: "USER_ENTERED",
    data: [
      { range: "Members!A1", values: memberValues },
      { range: "Payments!A1", values: paymentValues },
      { range: "Plans!A1", values: planValues },
      { range: "Attendance!A1", values: attendanceValues },
      { range: "DeviceLicenses!A1", values: licenseValues }
    ]
  };

  await googleFetch(`${SHEETS_BASE_URL}/${spreadsheetId}/values:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify(updateBody)
  });
}

/**
 * Intelligent Merging: Merges local and remote data using the "updatedAt" field
 */
export function mergeData(local: SheetData, remote: SheetData): SheetData {
  const mergeCollection = <T extends { id: string; updatedAt: string }>(localList: T[], remoteList: T[]): T[] => {
    const mergedMap = new Map<string, T>();

    // Put remote first
    remoteList.forEach(item => mergedMap.set(item.id, item));

    // Overlay local if newer or not exists in remote
    localList.forEach(item => {
      const existing = mergedMap.get(item.id);
      if (!existing) {
        mergedMap.set(item.id, item);
      } else {
        const localTime = new Date(item.updatedAt).getTime();
        const remoteTime = new Date(existing.updatedAt).getTime();
        if (localTime > remoteTime) {
          mergedMap.set(item.id, item);
        }
      }
    });

    return Array.from(mergedMap.values());
  };

  const mergeLicenses = (localList: License[], remoteList: License[]): License[] => {
    const mergedMap = new Map<string, License>();
    remoteList.forEach(item => mergedMap.set(item.key, item));
    localList.forEach(item => {
      const existing = mergedMap.get(item.key);
      if (!existing) {
        mergedMap.set(item.key, item);
      } else if (item.status === 'activated' && existing.status !== 'activated') {
        mergedMap.set(item.key, item);
      }
    });
    return Array.from(mergedMap.values());
  };

  // For attendance, we can just deduplicate by ID since attendance checks are write-once
  const mergeAttendance = (localList: AttendanceRecord[], remoteList: AttendanceRecord[]): AttendanceRecord[] => {
    const mergedMap = new Map<string, AttendanceRecord>();
    remoteList.forEach(item => mergedMap.set(item.id, item));
    localList.forEach(item => mergedMap.set(item.id, item));
    return Array.from(mergedMap.values());
  };

  return {
    members: mergeCollection(local.members, remote.members),
    payments: mergeCollection(local.payments, remote.payments),
    plans: mergeCollection(local.plans, remote.plans),
    attendance: mergeAttendance(local.attendance, remote.attendance),
    licenses: mergeLicenses(local.licenses, remote.licenses)
  };
}
