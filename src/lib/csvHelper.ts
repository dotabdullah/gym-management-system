import { Member, Payment, Plan, AttendanceRecord } from '../types';

export const convertToCSV = (data: any[], headers: { key: string; label: string }[]) => {
  const headerRow = headers.map(h => `"${h.label.replace(/"/g, '""')}"`).join(',');
  const rows = data.map(row => {
    return headers.map(h => {
      const val = row[h.key] !== undefined && row[h.key] !== null ? row[h.key] : '';
      const escaped = ('' + val).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');
  });
  return [headerRow, ...rows].join('\n');
};

export const downloadCSV = (csvContent: string, fileName: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportMembersToCSV = (members: Member[], plans: Plan[], fileNamePrefix = 'athletes_export') => {
  const data = members.map(m => {
    const plan = plans.find(p => p.id === m.planId);
    return {
      id: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      joinDate: m.joinDate,
      status: m.status,
      planName: plan ? plan.name : 'Unassigned',
      emergencyContactName: m.emergencyContactName || '',
      emergencyContactPhone: m.emergencyContactPhone || '',
      notes: m.notes || ''
    };
  });

  const headers = [
    { key: 'id', label: 'Member ID' },
    { key: 'name', label: 'Full Name' },
    { key: 'email', label: 'Email Address' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'joinDate', label: 'Joining Date' },
    { key: 'status', label: 'Account Status' },
    { key: 'planName', label: 'Subscription Plan' },
    { key: 'emergencyContactName', label: 'Emergency Contact Name' },
    { key: 'emergencyContactPhone', label: 'Emergency Contact Phone' },
    { key: 'notes', label: 'Notes / Memo' }
  ];

  const csv = convertToCSV(data, headers);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `${fileNamePrefix}_${dateStr}.csv`);
};

export const exportPaymentsToCSV = (payments: Payment[], members: Member[], plans: Plan[], fileNamePrefix = 'revenue_ledger') => {
  const data = payments.map((p, idx) => {
    const member = members.find(m => m.id === p.memberId);
    const plan = plans.find(pl => pl.id === p.planId);
    return {
      receiptNo: `TXN-${(payments.length - idx).toString().padStart(4, '0')}`,
      id: p.id,
      memberName: member ? member.name : 'Unknown Athlete',
      memberPhone: member ? member.phone : '',
      planName: plan ? plan.name : 'Basic Plan',
      amount: p.amount,
      date: p.date,
      paymentMethod: p.paymentMethod,
      notes: p.notes || ''
    };
  });

  const headers = [
    { key: 'receiptNo', label: 'Receipt No' },
    { key: 'id', label: 'Transaction ID' },
    { key: 'memberName', label: 'Athlete Name' },
    { key: 'memberPhone', label: 'Athlete Phone' },
    { key: 'planName', label: 'Plan Name' },
    { key: 'amount', label: 'Gross Amount (Rs)' },
    { key: 'date', label: 'Payment Date' },
    { key: 'paymentMethod', label: 'Payment Channel' },
    { key: 'notes', label: 'Memo / Notes' }
  ];

  const csv = convertToCSV(data, headers);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `${fileNamePrefix}_${dateStr}.csv`);
};

export const exportAttendanceToCSV = (attendance: AttendanceRecord[], members: Member[], fileNamePrefix = 'attendance_logs') => {
  const data = attendance.map(a => {
    const member = members.find(m => m.id === a.memberId);
    return {
      id: a.id,
      memberName: member ? member.name : 'Unknown Member',
      date: a.date,
      checkInTime: a.checkInTime
    };
  });

  const headers = [
    { key: 'id', label: 'Log ID' },
    { key: 'memberName', label: 'Athlete Name' },
    { key: 'date', label: 'Check-in Date' },
    { key: 'checkInTime', label: 'Check-in Time' }
  ];

  const csv = convertToCSV(data, headers);
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(csv, `${fileNamePrefix}_${dateStr}.csv`);
};
