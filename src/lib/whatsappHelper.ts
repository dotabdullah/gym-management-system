export interface WhatsAppMessageParams {
  athleteName: string;
  phone: string;
  countryCode: string; // e.g. '+92' or '92'
  daysLeft: number;
  planName: string;
  gymName: string;
  availablePlans?: { name: string; price: number; durationMonths: number }[];
  customText?: string;
}

/**
 * Format local or international phone numbers cleanly for WhatsApp wa.me API
 * Example (Pakistan): 03001234567 with +92 -> 923001234567
 * Example: +92 300-1234567 -> 923001234567
 */
export function formatPhoneNumberForWhatsApp(phone: string, countryCode: string = '+92'): string {
  if (!phone) return '';
  
  // Clean raw country code (e.g., '+92' -> '92')
  const cleanCode = countryCode.replace(/\D/g, '') || '92';
  
  // Remove all non-numeric characters from phone
  let cleanPhone = phone.replace(/\D/g, '');

  if (!cleanPhone) return '';

  // If number starts with international 00
  if (cleanPhone.startsWith('00')) {
    cleanPhone = cleanPhone.substring(2);
  }

  // If number starts with leading 0 (e.g. 03001234567 in Pakistan)
  if (cleanPhone.startsWith('0')) {
    cleanPhone = cleanCode + cleanPhone.substring(1);
  } else if (!cleanPhone.startsWith(cleanCode) && cleanPhone.length <= 10) {
    // If user entered local number without leading 0 (e.g. 3001234567)
    cleanPhone = cleanCode + cleanPhone;
  }

  return cleanPhone;
}

/**
 * Generates standard polite WhatsApp message template for membership fee / plan renewal
 */
export function generateWhatsAppReminderMessage(params: WhatsAppMessageParams): string {
  const { athleteName, daysLeft, planName, gymName, availablePlans } = params;

  let urgencyText = '';
  if (daysLeft < 0) {
    urgencyText = `Your membership expired ${Math.abs(daysLeft)} day(s) ago.`;
  } else if (daysLeft === 0) {
    urgencyText = `Your membership plan expires TODAY.`;
  } else if (daysLeft === 1) {
    urgencyText = `There is ONLY 1 DAY LEFT before your membership plan completes.`;
  } else {
    urgencyText = `Your membership plan will complete in ${daysLeft} days.`;
  }

  let plansText = '';
  if (availablePlans && availablePlans.length > 0) {
    plansText = `\n\n💡 *Available Membership Tiers:*`;
    availablePlans.forEach(p => {
      plansText += `\n• *${p.name}*: Rs. ${p.price.toLocaleString()} (${p.durationMonths} Mo)`;
    });
  }

  return `Dear *${athleteName}*,\n\nGreetings from *${gymName || 'Gym Center'}*! 🏋️\n\nThis is a friendly reminder regarding your membership:\n• *Current Package:* ${planName || 'Standard'}\n• *Status:* ${urgencyText}\n\nPlease pay your fee at the front desk as soon as possible to ensure uninterrupted workout access.${plansText}\n\nThank you for choosing us!\nBest regards,\n*${gymName || 'Gym Management'}*`;
}

/**
 * Get formatted WhatsApp Web URL (web.whatsapp.com)
 */
export function getWhatsAppWebUrl(phone: string, countryCode: string, message: string): string {
  const formattedPhone = formatPhoneNumberForWhatsApp(phone, countryCode);
  if (!formattedPhone) return '';
  const encodedText = encodeURIComponent(message);
  return `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;
}

/**
 * Get WhatsApp Desktop Protocol URI (whatsapp://)
 */
export function getWhatsAppAppUri(phone: string, countryCode: string, message: string): string {
  const formattedPhone = formatPhoneNumberForWhatsApp(phone, countryCode);
  if (!formattedPhone) return '';
  const encodedText = encodeURIComponent(message);
  return `whatsapp://send?phone=${formattedPhone}&text=${encodedText}`;
}

/**
 * Get wa.me universal redirect URL
 */
export function getWaMeUrl(phone: string, countryCode: string, message: string): string {
  const formattedPhone = formatPhoneNumberForWhatsApp(phone, countryCode);
  if (!formattedPhone) return '';
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
}

export function getWhatsAppDirectUrl(
  phone: string, 
  countryCode: string, 
  message: string, 
  targetMode: 'api' | 'wame' | 'web' | 'app' = 'api'
): string {
  const formattedPhone = formatPhoneNumberForWhatsApp(phone, countryCode);
  if (!formattedPhone) return '';
  const encodedText = encodeURIComponent(message);

  if (targetMode === 'web') {
    return `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;
  }
  if (targetMode === 'app') {
    return `whatsapp://send?phone=${formattedPhone}&text=${encodedText}`;
  }
  if (targetMode === 'wame') {
    return `https://wa.me/${formattedPhone}?text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;
}

export const openWhatsApp = (
  phone: string, 
  message: string, 
  mode: 'app' | 'web' | 'api' = 'app',
  countryCode: string = '+92'
) => {
  const formattedPhone = formatPhoneNumberForWhatsApp(phone, countryCode);
  const cleanPhone = formattedPhone || phone.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message);

  // Copy message text to clipboard automatically as fallback
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(message).catch(() => {});
  }

  if (mode === 'app') {
    // 1. WhatsApp Desktop Protocol (Triggers Windows OS Shell directly from .exe wrapper)
    const appUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
    
    // Create hidden anchor and click it to bypass WebView window.open blocks
    const link = document.createElement('a');
    link.href = appUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Fallback: If desktop app protocol fails to launch within 1.5s, direct to Web WhatsApp
    setTimeout(() => {
      const fallbackUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
      const fLink = document.createElement('a');
      fLink.href = fallbackUrl;
      fLink.target = '_blank';
      fLink.rel = 'noopener noreferrer';
      document.body.appendChild(fLink);
      fLink.click();
      document.body.removeChild(fLink);
    }, 1500);
  } else {
    // 2. Direct Web / API Fallbacks
    const webUrl = mode === 'web' 
      ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    
    const link = document.createElement('a');
    link.href = webUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Directly launches WhatsApp web/desktop link in browser or desktop .exe environment
 */
export function openWhatsAppLink(
  phone: string, 
  countryCode: string, 
  message: string, 
  targetMode: 'api' | 'wame' | 'web' | 'app' = 'app'
) {
  const formattedPhone = formatPhoneNumberForWhatsApp(phone, countryCode);
  if (!formattedPhone) {
    alert("Invalid phone number provided for WhatsApp messaging.");
    return false;
  }
  const mode = targetMode === 'wame' ? 'api' : targetMode;
  openWhatsApp(formattedPhone, message, mode, countryCode);
  return true;
}

export const POPULAR_COUNTRY_CODES = [
  { code: '+92', name: 'Pakistan (+92)', flag: '🇵🇰' },
  { code: '+91', name: 'India (+91)', flag: '🇮🇳' },
  { code: '+1', name: 'United States / Canada (+1)', flag: '🇺🇸' },
  { code: '+44', name: 'United Kingdom (+44)', flag: '🇬🇧' },
  { code: '+971', name: 'United Arab Emirates (+971)', flag: '🇦🇪' },
  { code: '+966', name: 'Saudi Arabia (+966)', flag: '🇸🇦' },
  { code: '+965', name: 'Kuwait (+965)', flag: '🇰🇼' },
  { code: '+974', name: 'Qatar (+974)', flag: '🇶🇦' },
  { code: '+968', name: 'Oman (+968)', flag: '🇴🇲' },
  { code: '+973', name: 'Bahrain (+973)', flag: '🇧🇭' },
  { code: '+90', name: 'Turkey (+90)', flag: '🇹🇷' },
  { code: '+61', name: 'Australia (+61)', flag: '🇦🇺' },
  { code: '+60', name: 'Malaysia (+60)', flag: '🇲🇾' },
  { code: '+65', name: 'Singapore (+65)', flag: '🇸🇬' },
  { code: '+63', name: 'Philippines (+63)', flag: '🇵🇭' },
  { code: '+880', name: 'Bangladesh (+880)', flag: '🇧🇩' },
  { code: '+94', name: 'Sri Lanka (+94)', flag: '🇱🇰' },
  { code: '+977', name: 'Nepal (+977)', flag: '🇳🇵' },
  { code: '+20', name: 'Egypt (+20)', flag: '🇪🇬' },
  { code: '+27', name: 'South Africa (+27)', flag: '🇿🇦' },
  { code: '+234', name: 'Nigeria (+234)', flag: '🇳🇬' },
  { code: '+49', name: 'Germany (+49)', flag: '🇩🇪' },
  { code: '+33', name: 'France (+33)', flag: '🇫🇷' },
  { code: '+39', name: 'Italy (+39)', flag: '🇮🇹' },
  { code: '+34', name: 'Spain (+34)', flag: '🇪🇸' },
  { code: '+31', name: 'Netherlands (+31)', flag: '🇳🇱' },
  { code: '+55', name: 'Brazil (+55)', flag: '🇧🇷' },
  { code: '+52', name: 'Mexico (+52)', flag: '🇲🇽' },
  { code: '+86', name: 'China (+86)', flag: '🇨🇳' },
  { code: '+81', name: 'Japan (+81)', flag: '🇯🇵' },
  { code: '+82', name: 'South Korea (+82)', flag: '🇰🇷' },
  { code: '+62', name: 'Indonesia (+62)', flag: '🇮🇩' },
];

export const POPULAR_CURRENCIES = [
  { code: 'PKR', symbol: 'Rs.', name: 'Pakistani Rupee (PKR - Default)', flag: '🇵🇰' },
  { code: 'USD', symbol: '$', name: 'US Dollar ($)', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)', flag: '🇬🇧' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)', flag: '🇮🇳' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)', flag: '🇦🇪' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal (SAR)', flag: '🇸🇦' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CA$)', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)', flag: '🇦🇺' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit (RM)', flag: '🇲🇾' },
  { code: 'EGP', symbol: 'EGP', name: 'Egyptian Pound (EGP)', flag: '🇪🇬' },
  { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal (QAR)', flag: '🇶🇦' },
  { code: 'KWD', symbol: 'KWD', name: 'Kuwaiti Dinar (KWD)', flag: '🇰🇼' },
];

export function getCurrencySymbol(currency: string = 'PKR'): string {
  if (!currency) return 'Rs.';
  const match = POPULAR_CURRENCIES.find(c => c.code.toLowerCase() === currency.trim().toLowerCase() || c.symbol.toLowerCase() === currency.trim().toLowerCase());
  if (match) return match.symbol;
  return currency.trim();
}

