/**
 * i18n configuration with react-i18next
 * Supports English (en) and Indonesian (id)
 * Focused on Trading Journey functionality
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
const enTranslations = {
  // Common
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    confirm: 'Confirm',
    close: 'Close',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    refresh: 'Refresh',
    viewAll: 'View All',
    noData: 'No data available',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
  },
  
  // Navigation
  nav: {
    dashboard: 'Dashboard',
    accounts: 'Accounts',
    settings: 'Settings',
    upgrade: 'Upgrade',
    notifications: 'Notifications',
    admin: 'Admin',
    // Trading
    tradingSummary: 'Summary',
    tradingJournal: 'Journal',
    tradingSessions: 'Sessions',
    tradingPerformance: 'Performance',
    tradingStrategies: 'Strategies',
    tradingInsights: 'AI Insights',
    riskManagement: 'Risk Management',
    aiAssistant: 'AI Assistant',
    marketCalendar: 'Market Calendar',
    tradingJourney: 'Deriverse',
  },

  // Dashboard
  dashboard: {
    title: 'Dashboard',
    welcome: 'Welcome back! Here\'s your trading overview.',
    totalValue: 'Total Value',
    totalGainLoss: 'Total Gain/Loss',
    todayChange: 'Today\'s Change',
    performance: 'Performance',
  },

  // Accounts
  accounts: {
    title: 'Trading Accounts',
    subtitle: 'Manage your trading accounts',
    addAccount: 'Add Account',
    balance: 'Balance',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    transfer: 'Transfer',
    accountType: 'Account Type',
    trading: 'Trading',
    backtest: 'Backtest',
    funding: 'Funding',
  },

  // Trading
  trading: {
    title: 'Trading Analytics',
    subtitle: 'Track and analyze your trading performance',
    totalTrades: 'Total Trades',
    winRate: 'Win Rate',
    totalPnl: 'Total P&L',
    avgRR: 'Avg R:R',
    profitFactor: 'Profit Factor',
    maxDrawdown: 'Max Drawdown',
    sharpeRatio: 'Sharpe Ratio',
    wins: 'Wins',
    losses: 'Losses',
    openTrades: 'Open Trades',
    closedTrades: 'Closed Trades',
    strategies: 'Strategies',
    sessions: 'Sessions',
  },

  // Risk Management
  risk: {
    title: 'Risk Management',
    subtitle: 'Monitor and control your trading risk',
    dailyLimit: 'Daily Loss Limit',
    weeklyDrawdown: 'Weekly Drawdown',
    positionSize: 'Position Size',
    riskPerTrade: 'Risk Per Trade',
    maxPositions: 'Max Positions',
    correlation: 'Correlation',
  },

  // Settings
  settings: {
    title: 'Settings',
    subtitle: 'Manage your account and preferences',
    profile: 'Profile',
    preferences: 'Preferences',
    security: 'Security',
    notifications: 'Notifications',
    language: 'Language',
    currency: 'Currency',
    theme: 'Theme',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    systemMode: 'System',
    ai: 'AI Settings',
  },

  // Subscription
  subscription: {
    title: 'Subscription',
    currentPlan: 'Current Plan',
    upgrade: 'Upgrade',
    downgrade: 'Downgrade',
    free: 'Free',
    pro: 'Pro',
    business: 'Business',
    perMonth: '/month',
    features: 'Features',
    mostPopular: 'Most Popular',
    getStarted: 'Get Started',
    trialInfo: 'Pro plans come with a 14-day free trial',
  },

  // Currency
  currency: {
    usd: 'US Dollar',
    idr: 'Indonesian Rupiah',
    exchangeRate: 'Exchange Rate',
  },

  // Time
  time: {
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    thisYear: 'This Year',
    allTime: 'All Time',
  },

  // Notifications
  notifications: {
    title: 'Notifications',
    markAllRead: 'Mark all read',
    noNotifications: 'No notifications',
    riskAlert: 'Risk Alert',
    tradeUpdate: 'Trade Update',
    system: 'System',
  },
};

// Indonesian translations
const idTranslations = {
  // Common
  common: {
    loading: 'Memuat...',
    save: 'Simpan',
    cancel: 'Batal',
    delete: 'Hapus',
    edit: 'Edit',
    add: 'Tambah',
    confirm: 'Konfirmasi',
    close: 'Tutup',
    search: 'Cari',
    filter: 'Filter',
    export: 'Ekspor',
    refresh: 'Refresh',
    viewAll: 'Lihat Semua',
    noData: 'Tidak ada data',
    success: 'Berhasil',
    error: 'Kesalahan',
    warning: 'Peringatan',
    info: 'Info',
  },
  
  // Navigation
  nav: {
    dashboard: 'Dasbor',
    accounts: 'Akun',
    settings: 'Pengaturan',
    upgrade: 'Upgrade',
    notifications: 'Notifikasi',
    admin: 'Admin',
    // Trading
    tradingSummary: 'Ringkasan',
    tradingJournal: 'Jurnal',
    tradingSessions: 'Sesi',
    tradingPerformance: 'Performa',
    tradingStrategies: 'Strategi',
    tradingInsights: 'Analisis AI',
    riskManagement: 'Manajemen Risiko',
    aiAssistant: 'Asisten AI',
    marketCalendar: 'Kalender Pasar',
    tradingJourney: 'Deriverse',
  },

  // Dashboard
  dashboard: {
    title: 'Dasbor',
    welcome: 'Selamat datang! Berikut ringkasan trading Anda.',
    totalValue: 'Total Nilai',
    totalGainLoss: 'Total Untung/Rugi',
    todayChange: 'Perubahan Hari Ini',
    performance: 'Performa',
  },

  // Accounts
  accounts: {
    title: 'Akun Trading',
    subtitle: 'Kelola akun trading Anda',
    addAccount: 'Tambah Akun',
    balance: 'Saldo',
    deposit: 'Setor',
    withdraw: 'Tarik',
    transfer: 'Transfer',
    accountType: 'Tipe Akun',
    trading: 'Trading',
    backtest: 'Backtest',
    funding: 'Pendanaan',
  },

  // Trading
  trading: {
    title: 'Trading Analytics',
    subtitle: 'Track and analyze your trading performance',
    totalTrades: 'Total Trade',
    winRate: 'Win Rate',
    totalPnl: 'Total P&L',
    avgRR: 'Rata-rata R:R',
    profitFactor: 'Profit Factor',
    maxDrawdown: 'Max Drawdown',
    sharpeRatio: 'Sharpe Ratio',
    wins: 'Menang',
    losses: 'Kalah',
    openTrades: 'Trade Terbuka',
    closedTrades: 'Trade Tertutup',
    strategies: 'Strategi',
    sessions: 'Sesi',
  },

  // Risk Management
  risk: {
    title: 'Manajemen Risiko',
    subtitle: 'Monitor dan kontrol risiko trading Anda',
    dailyLimit: 'Batas Kerugian Harian',
    weeklyDrawdown: 'Drawdown Mingguan',
    positionSize: 'Ukuran Posisi',
    riskPerTrade: 'Risiko Per Trade',
    maxPositions: 'Posisi Maksimal',
    correlation: 'Korelasi',
  },

  // Settings
  settings: {
    title: 'Pengaturan',
    subtitle: 'Kelola akun dan preferensi Anda',
    profile: 'Profil',
    preferences: 'Preferensi',
    security: 'Keamanan',
    notifications: 'Notifikasi',
    language: 'Bahasa',
    currency: 'Mata Uang',
    theme: 'Tema',
    darkMode: 'Mode Gelap',
    lightMode: 'Mode Terang',
    systemMode: 'Sistem',
    ai: 'Pengaturan AI',
  },

  // Subscription
  subscription: {
    title: 'Langganan',
    currentPlan: 'Paket Saat Ini',
    upgrade: 'Upgrade',
    downgrade: 'Downgrade',
    free: 'Gratis',
    pro: 'Pro',
    business: 'Bisnis',
    perMonth: '/bulan',
    features: 'Fitur',
    mostPopular: 'Paling Populer',
    getStarted: 'Mulai',
    trialInfo: 'Paket Pro dengan uji coba gratis 14 hari',
  },

  // Currency
  currency: {
    usd: 'Dolar AS',
    idr: 'Rupiah Indonesia',
    exchangeRate: 'Kurs',
  },

  // Time
  time: {
    today: 'Hari Ini',
    yesterday: 'Kemarin',
    thisWeek: 'Minggu Ini',
    thisMonth: 'Bulan Ini',
    thisYear: 'Tahun Ini',
    allTime: 'Semua Waktu',
  },

  // Notifications
  notifications: {
    title: 'Notifikasi',
    markAllRead: 'Tandai semua dibaca',
    noNotifications: 'Tidak ada notifikasi',
    riskAlert: 'Peringatan Risiko',
    tradeUpdate: 'Update Trade',
    system: 'Sistem',
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      id: { translation: idTranslations },
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
