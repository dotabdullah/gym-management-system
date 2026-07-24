![Gym Management System](iron_ledger_app_banner_img.png)
# 🏋️ Gym Management System 

A high-performance, desktop-ready Gym Management Application built with **React 18**, **TypeScript**, **Tailwind CSS**, **Lucide Icons**, **Recharts**, and optimized for **Tauri** desktop executable distribution (`.exe` / `.app`).

Designed for gym owners, fitness clubs, martial arts academies, and sports complexes to streamline athlete memberships, attendance tracking, 1-click WhatsApp renewal reminders, payment billing, plan management, local directory PC auto-backups, and offline security licensing.

---

## 🌟 Comprehensive Feature Highlights

### 📱 1. 1-Click WhatsApp Expiry & Renewal Messages
- **1-Day Impending Expiration Alerts**: Automatic banner and notification badges for athletes whose selected membership plan has **1 day left** or has expired.
- **Pre-filled Personalized Reminders**: 1-click button generates polite, customized WhatsApp reminder messages containing:
  - Athlete Name & Phone Number
  - Current Membership Plan Name & Expiration Status
  - Gym Name & Available Membership Renewal Plans with Rates
- **Regional Country Code Selector**: Default pre-configured for **Pakistan (+92)** with instant dropdown selection for India (+91), UAE (+971), Saudi Arabia (+966), UK (+44), USA/Canada (+1), and global international prefixes.
- **Seamless Desktop/Web Launch**: Uses official WhatsApp deep-linking (`wa.me`) to open WhatsApp Desktop App or `web.whatsapp.com` directly without manual contact saving.

### 🌐 2. Internet Connection & Offline Mode Indicator
- **Real-time Connectivity Badge**: Top-right header widget dynamically detects internet availability:
  - 🟢 **Internet Active**: Highlights that web features (WhatsApp web launch, cloud sync) are ready.
  - 🟡 **Offline Mode**: Confirms that software continues working 100% seamlessly on local station database without internet interruption.

### ⏱️ 3. Advanced Attendance Management & Back-Dated Check-In
- **Express Daily Check-In**: Instant 1-click check-in search by Athlete ID, Name, or barcode/phone number.
- **Custom Date & Time Check-In (Back-Dating)**: Gym owners can log past attendance dates for athletes who missed scanning on prior workout days.
- **Date-Wise Attendance Filter & Viewer**: View detailed attendance history per athlete with customizable filters:
  - All Check-Ins
  - This Month
  - Specific Month Selection (YYYY-MM)
  - Custom Date Range (Start Date to End Date)
- **Attendance Log Deletion**: Option to delete incorrect attendance logs.
- **CSV Attendance History Export**: Download complete attendance logs for any athlete or time period into formatted CSV spreadsheets.

### 🏋️ 4. Member / Athlete Lifecycle Management
- **Complete Membership Control**: Add, edit, renew, or remove gym members.
- **Photo Uploads & Profiles**: Support for profile photos, emergency contact info, trainer notes, membership join dates, and status badges (**Active**, **Expiring Soon**, **Expired**, **Suspended**).
- **Subscription Tracker**: Accurate calculation of remaining days, expiration dates, and last payment records.

### 💳 5. Payment & Financial Revenue Ledger
- **Flexible Billing**: Record cash, card, mobile bank transfer, or online payments.
- **Receipt Generator**: View and print digitized payment receipts with gym branding, tax breakdown, and payment method details.
- **Financial Analytics**: Total revenue overview, current month earnings, active subscriptions count, and historical payment ledger.

### 📋 6. Membership Plans Manager
- **Customizable Tiers**: Create, update, or remove plans (e.g. Monthly Fitness, Quarterly Strength, Annual VIP, Student Pass, Personal Training).
- **Duration & Pricing Control**: Set pricing in local currency (PKR Rs., USD, EUR, etc.) and plan validity durations.

### 📁 7. Database Backups, Excel/CSV Imports & Data Safety
- **Local Folder Auto-Backup**: Bind a folder on the local PC (using Web System Directory Access) for automatic database backups every 5 minutes.
- **Excel / CSV Bulk Import**: Import thousands of existing athlete records or payment logs directly from Excel or Google Sheets using drag-and-drop or copy-paste.
- **Full Database Export & Import**: Single-click JSON backup export and restore.
- **Database Reset Protection**: Secure data reset with passcode confirmation (`RESET`).

### 🔒 8. Hardware-Locked License Security Engine
- **Hardware ID (HWID) Binding**: Binds software instances to the station's Hardware ID (e.g., `HW-8492`).
- **Master Developer / Creator Panel**:
  - Unlocked via Developer Passcode (`GYM-DEV-9988` or `ADMIN2026`).
  - Generate 1-Year activation keys formatted as `GYM-1YR-[HW_SUFFIX]-[XXXX]-[XXXX]`.
  - Machine activation validates Hardware ID suffix match before unlocking full station access.

---

## 🛠️ Tech Stack & Prerequisites

- **Frontend Core**: React 18, TypeScript, Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Build System**: Vite
- **Desktop Runtime**: Tauri (Rust-powered native desktop container)
- **Node.js Environment**: v18.0 or higher recommended

---

## Developed by 
- **Abdullah Shahzad**
- Founder of **[XpertsWP](https://xpertswp.com)**
- Website: https://xpertswp.com/
- Contact No.: [+92 311 1765486](+923111765486)

---

## 📄 License
This project is open-source and released under the **MIT License**.
