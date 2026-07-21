import { Member, Payment, Plan, AttendanceRecord, License } from '../types';

// Generate a pseudo-stable Hardware ID for the browser/PC
export function getOrCreateHardwareId(): string {
  let hwId = localStorage.getItem('gym_hw_id');
  if (!hwId) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    hwId = `GYM-HW-${randomPart}`;
    localStorage.setItem('gym_hw_id', hwId);
  }
  return hwId;
}

export const DEFAULT_PLANS: Plan[] = [
  {
    id: "plan-basic",
    name: "Standard Monthly",
    price: 49,
    durationMonths: 1,
    features: ["Access to Cardio Room", "Locker Room Access", "1 Fitness Assessment"],
    updatedAt: new Date().toISOString()
  },
  {
    id: "plan-quarterly",
    name: "Quarterly Premium",
    price: 129,
    durationMonths: 3,
    features: ["All Basic Access", "Group Fitness Classes", "Free Towel Service", "Guest Passes (2/mo)"],
    updatedAt: new Date().toISOString()
  },
  {
    id: "plan-annual",
    name: "Annual Elite",
    price: 449,
    durationMonths: 12,
    features: ["All Premium Access", "Private Locker", "10% Gym Shop Discount", "1 Private Coach Session/mo", "Unlimited Guest Passes"],
    updatedAt: new Date().toISOString()
  },
  {
    id: "plan-vip",
    name: "VIP Personal Coaching",
    price: 199,
    durationMonths: 1,
    features: ["All Access Included", "Dedicated Personal Trainer", "Custom Diet/Workout Plan", "24/7 Trainer Consultations", "Free Energy Drinks & Snacks"],
    updatedAt: new Date().toISOString()
  }
];

export const DEFAULT_MEMBERS: Member[] = [
  {
    id: "mem-1",
    name: "Marcus Aurelius",
    email: "marcus.philosophy@stoic.org",
    phone: "+1 (555) 111-2222",
    joinDate: "2026-01-15",
    planId: "plan-annual",
    status: "active",
    notes: "Prefers morning workouts. Focuses on heavy compound lifts.",
    emergencyContactName: "Faustina Aurelius",
    emergencyContactPhone: "+1 (555) 111-3333",
    updatedAt: new Date().toISOString()
  },
  {
    id: "mem-2",
    name: "Serena Williams",
    email: "serena.tennis@champion.com",
    phone: "+1 (555) 987-6543",
    joinDate: "2026-03-10",
    planId: "plan-vip",
    status: "active",
    notes: "Elite athlete. High intensity interval training and agility work.",
    emergencyContactName: "Alexis Ohanian",
    emergencyContactPhone: "+1 (555) 987-0000",
    updatedAt: new Date().toISOString()
  },
  {
    id: "mem-3",
    name: "Bruce Wayne",
    email: "bruce@waynecorp.com",
    phone: "+1 (555) 000-1939",
    joinDate: "2026-02-01",
    planId: "plan-annual",
    status: "active",
    notes: "Prefers late-night workouts (often past midnight). Elite conditioning. Many bruises, do not ask.",
    emergencyContactName: "Alfred Pennyworth",
    emergencyContactPhone: "+1 (555) 000-1943",
    updatedAt: new Date().toISOString()
  },
  {
    id: "mem-4",
    name: "Diana Prince",
    email: "diana.museum@olympus.org",
    phone: "+1 (555) 300-8400",
    joinDate: "2026-04-05",
    planId: "plan-quarterly",
    status: "active",
    notes: "Superhuman stamina. Prefers kettlebell routines and battle ropes.",
    emergencyContactName: "Steve Trevor",
    emergencyContactPhone: "+1 (555) 300-9000",
    updatedAt: new Date().toISOString()
  },
  {
    id: "mem-5",
    name: "Peter Parker",
    email: "web@dailybugle.net",
    phone: "+1 (555) 831-7731",
    joinDate: "2026-05-12",
    planId: "plan-basic",
    status: "expired",
    notes: "Consistently late, says he got caught up in traffic. Outstanding balance for past month.",
    emergencyContactName: "May Parker",
    emergencyContactPhone: "+1 (555) 831-1000",
    updatedAt: new Date().toISOString()
  },
  {
    id: "mem-6",
    name: "Tony Stark",
    email: "tony@starkindustries.com",
    phone: "+1 (555) 300-3000",
    joinDate: "2026-06-01",
    planId: "plan-vip",
    status: "active",
    notes: "Needs extra hydration near cardio machines. Keeps trying to upgrade the treadmill motor.",
    emergencyContactName: "Pepper Potts",
    emergencyContactPhone: "+1 (555) 300-4000",
    updatedAt: new Date().toISOString()
  }
];

export const DEFAULT_PAYMENTS: Payment[] = [
  {
    id: "pay-1",
    memberId: "mem-1",
    planId: "plan-annual",
    amount: 449,
    date: "2026-01-15",
    paymentMethod: "Card",
    notes: "Full annual membership payment.",
    updatedAt: new Date().toISOString()
  },
  {
    id: "pay-2",
    memberId: "mem-2",
    planId: "plan-vip",
    amount: 199,
    date: "2026-03-10",
    paymentMethod: "Bank Transfer",
    notes: "First month Personal Coaching.",
    updatedAt: new Date().toISOString()
  },
  {
    id: "pay-3",
    memberId: "mem-2",
    planId: "plan-vip",
    amount: 199,
    date: "2026-04-10",
    paymentMethod: "Bank Transfer",
    notes: "Second month Personal Coaching.",
    updatedAt: new Date().toISOString()
  },
  {
    id: "pay-4",
    memberId: "mem-3",
    planId: "plan-annual",
    amount: 449,
    date: "2026-02-01",
    paymentMethod: "Card",
    notes: "WayneCorp corporate payment.",
    updatedAt: new Date().toISOString()
  },
  {
    id: "pay-5",
    memberId: "mem-4",
    planId: "plan-quarterly",
    amount: 129,
    date: "2026-04-05",
    paymentMethod: "Cash",
    notes: "Paid in cash on signup.",
    updatedAt: new Date().toISOString()
  },
  {
    id: "pay-6",
    memberId: "mem-5",
    planId: "plan-basic",
    amount: 49,
    date: "2026-05-12",
    paymentMethod: "Cash",
    notes: "First month signup.",
    updatedAt: new Date().toISOString()
  },
  {
    id: "pay-7",
    memberId: "mem-6",
    planId: "plan-vip",
    amount: 199,
    date: "2026-06-01",
    paymentMethod: "Card",
    notes: "Automatic payment confirmation.",
    updatedAt: new Date().toISOString()
  },
  {
    id: "pay-8",
    memberId: "mem-2",
    planId: "plan-vip",
    amount: 199,
    date: "2026-05-10",
    paymentMethod: "Bank Transfer",
    notes: "Third month Personal Coaching.",
    updatedAt: new Date().toISOString()
  },
  {
    id: "pay-9",
    memberId: "mem-2",
    planId: "plan-vip",
    amount: 199,
    date: "2026-06-10",
    paymentMethod: "Bank Transfer",
    notes: "Fourth month Personal Coaching.",
    updatedAt: new Date().toISOString()
  }
];

export const DEFAULT_ATTENDANCE: AttendanceRecord[] = [
  // Marcus Aurelius
  { id: "att-1", memberId: "mem-1", date: "2026-07-10", checkInTime: "06:30:12" },
  { id: "att-2", memberId: "mem-1", date: "2026-07-12", checkInTime: "06:15:45" },
  { id: "att-3", memberId: "mem-1", date: "2026-07-13", checkInTime: "06:40:02" },
  { id: "att-4", memberId: "mem-1", date: "2026-07-15", checkInTime: "06:22:11" },
  { id: "att-5", memberId: "mem-1", date: "2026-07-16", checkInTime: "06:18:30" },

  // Serena Williams
  { id: "att-6", memberId: "mem-2", date: "2026-07-11", checkInTime: "10:15:00" },
  { id: "att-7", memberId: "mem-2", date: "2026-07-12", checkInTime: "09:45:22" },
  { id: "att-8", memberId: "mem-2", date: "2026-07-14", checkInTime: "10:05:14" },
  { id: "att-9", memberId: "mem-2", date: "2026-07-15", checkInTime: "09:50:35" },

  // Bruce Wayne
  { id: "att-10", memberId: "mem-3", date: "2026-07-10", checkInTime: "23:45:11" },
  { id: "att-11", memberId: "mem-3", date: "2026-07-12", checkInTime: "01:10:05" },
  { id: "att-12", memberId: "mem-3", date: "2026-07-14", checkInTime: "23:59:44" },
  { id: "att-13", memberId: "mem-3", date: "2026-07-15", checkInTime: "02:05:30" },

  // Diana Prince
  { id: "att-14", memberId: "mem-4", date: "2026-07-12", checkInTime: "14:20:15" },
  { id: "att-15", memberId: "mem-4", date: "2026-07-13", checkInTime: "15:10:45" },
  { id: "att-16", memberId: "mem-4", date: "2026-07-15", checkInTime: "14:40:12" },

  // Tony Stark
  { id: "att-17", memberId: "mem-6", date: "2026-07-14", checkInTime: "08:15:12" },
  { id: "att-18", memberId: "mem-6", date: "2026-07-15", checkInTime: "08:30:55" },
  { id: "att-19", memberId: "mem-6", date: "2026-07-16", checkInTime: "08:10:20" }
];

export const DEFAULT_LICENSES: License[] = [
  {
    key: "GYM-ACTV-ABCD-1234",
    status: "activated",
    activatedAt: "2026-06-15T10:30:00Z",
    expiresAt: "2027-06-15T10:30:00Z",
    hwId: "GYM-HW-DEMOPC",
    ownerName: "Alpha Gym Center"
  },
  {
    key: "GYM-ACTV-EFGH-5678",
    status: "unactivated",
    activatedAt: null,
    expiresAt: null,
    hwId: "",
    ownerName: "Iron Works Studio"
  }
];

// Helper to check license activation status
export function validateLicenseKey(key: string): boolean {
  // We simulate that any key following GYM-ACTV-XXXX-XXXX is valid
  const regex = /^GYM-ACTV-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return regex.test(key);
}
