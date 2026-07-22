export interface Plan {
  id: string;
  name: string;
  price: number;
  durationMonths: number;
  features: string[];
  updatedAt: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  planId: string;
  status: 'active' | 'expired' | 'pending';
  notes: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  photoUrl?: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  memberId: string;
  planId: string;
  amount: number;
  date: string;
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'Other';
  notes: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // HH:MM:SS
}

export interface License {
  key: string;
  status: 'activated' | 'trial' | 'unactivated';
  activatedAt: string | null;
  expiresAt: string | null;
  hwId: string;
  ownerName: string;
  gymName?: string;
  phone?: string;
  address?: string;
}

export interface SyncStatus {
  lastSyncedAt: string | null;
  isSyncing: boolean;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  error: string | null;
}
