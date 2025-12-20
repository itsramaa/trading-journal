/**
 * i18n configuration with react-i18next
 * Supports English (en) and Indonesian (id)
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
    portfolio: 'Portfolio',
    transactions: 'Transactions',
    analytics: 'Analytics',
    accounts: 'Accounts',
    settings: 'Settings',
    upgrade: 'Upgrade',
    notifications: 'Notifications',
    admin: 'Admin',
    // Dashboard tabs
    portfolioOverview: 'Portfolio',
    financialFreedom: 'Financial Freedom',
    tradingJourney: 'Trading',
    // Financial Freedom
    fireCalculator: 'FIRE Calculator',
    budget: 'Budget',
    debtPayoff: 'Debt Payoff',
    emergencyFund: 'Emergency Fund',
    goals: 'Goals',
    progress: 'Progress',
    // Trading
    tradingSummary: 'Summary',
    tradingJournal: 'Journal',
    tradingSessions: 'Sessions',
    tradingPerformance: 'Performance',
    tradingStrategies: 'Strategies',
    tradingInsights: 'AI Insights',
  },

  // Dashboard
  dashboard: {
    title: 'Dashboard',
    welcome: 'Welcome back! Here\'s an overview of your portfolio.',
    totalValue: 'Total Value',
    totalGainLoss: 'Total Gain/Loss',
    todayChange: 'Today\'s Change',
    cagr: 'CAGR',
    performance: 'Performance',
    allocation: 'Allocation',
    holdings: 'Holdings',
    recentTransactions: 'Recent Transactions',
    noHoldings: 'No holdings yet',
    addFirstAsset: 'Add your first asset to get started',
  },

  // Portfolio
  portfolio: {
    title: 'Portfolio',
    subtitle: 'Manage your investment assets',
    addAsset: 'Add Asset',
    assets: 'Assets',
    value: 'Value',
    quantity: 'Quantity',
    avgCost: 'Avg Cost',
    currentPrice: 'Current Price',
    gainLoss: 'Gain/Loss',
    percentage: 'Percentage',
    actions: 'Actions',
  },

  // Transactions
  transactions: {
    title: 'Transactions',
    subtitle: 'View and manage your transaction history',
    addTransaction: 'Add Transaction',
    buy: 'Buy',
    sell: 'Sell',
    date: 'Date',
    asset: 'Asset',
    type: 'Type',
    price: 'Price',
    total: 'Total',
    fee: 'Fee',
    notes: 'Notes',
  },

  // Accounts
  accounts: {
    title: 'Accounts',
    subtitle: 'Manage your financial accounts',
    addAccount: 'Add Account',
    balance: 'Balance',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    transfer: 'Transfer',
    accountType: 'Account Type',
    bank: 'Bank',
    ewallet: 'E-Wallet',
    broker: 'Broker',
    cash: 'Cash',
    softWallet: 'Soft Wallet',
  },

  // Financial Freedom
  ff: {
    title: 'Financial Freedom',
    subtitle: 'Track your journey to financial independence',
    level: 'Level',
    survival: 'Survival',
    stability: 'Stability',
    independence: 'Independence',
    freedom: 'Freedom',
    purpose: 'Purpose',
    savingsRate: 'Savings Rate',
    emergencyFundMonths: 'Emergency Fund',
    debtToIncome: 'Debt-to-Income',
    totalAssets: 'Total Assets',
    monthlyExpenses: 'Monthly Expenses',
    monthlyIncome: 'Monthly Income',
    fireNumber: 'FIRE Number',
    yearsToFire: 'Years to FIRE',
  },

  // Trading
  trading: {
    title: 'Trading Journey',
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
    priceAlert: 'Price Alert',
    transaction: 'Transaction',
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
    portfolio: 'Portofolio',
    transactions: 'Transaksi',
    analytics: 'Analitik',
    accounts: 'Akun',
    settings: 'Pengaturan',
    upgrade: 'Upgrade',
    notifications: 'Notifikasi',
    admin: 'Admin',
    // Dashboard tabs
    portfolioOverview: 'Portofolio',
    financialFreedom: 'Kebebasan Finansial',
    tradingJourney: 'Trading',
    // Financial Freedom
    fireCalculator: 'Kalkulator FIRE',
    budget: 'Anggaran',
    debtPayoff: 'Pelunasan Hutang',
    emergencyFund: 'Dana Darurat',
    goals: 'Target',
    progress: 'Progres',
    // Trading
    tradingSummary: 'Ringkasan',
    tradingJournal: 'Jurnal',
    tradingSessions: 'Sesi',
    tradingPerformance: 'Performa',
    tradingStrategies: 'Strategi',
    tradingInsights: 'Analisis AI',
  },

  // Dashboard
  dashboard: {
    title: 'Dasbor',
    welcome: 'Selamat datang! Berikut ringkasan portofolio Anda.',
    totalValue: 'Total Nilai',
    totalGainLoss: 'Total Untung/Rugi',
    todayChange: 'Perubahan Hari Ini',
    cagr: 'CAGR',
    performance: 'Performa',
    allocation: 'Alokasi',
    holdings: 'Kepemilikan',
    recentTransactions: 'Transaksi Terbaru',
    noHoldings: 'Belum ada kepemilikan',
    addFirstAsset: 'Tambah aset pertama Anda untuk memulai',
  },

  // Portfolio
  portfolio: {
    title: 'Portofolio',
    subtitle: 'Kelola aset investasi Anda',
    addAsset: 'Tambah Aset',
    assets: 'Aset',
    value: 'Nilai',
    quantity: 'Jumlah',
    avgCost: 'Biaya Rata-rata',
    currentPrice: 'Harga Sekarang',
    gainLoss: 'Untung/Rugi',
    percentage: 'Persentase',
    actions: 'Aksi',
  },

  // Transactions
  transactions: {
    title: 'Transaksi',
    subtitle: 'Lihat dan kelola riwayat transaksi',
    addTransaction: 'Tambah Transaksi',
    buy: 'Beli',
    sell: 'Jual',
    date: 'Tanggal',
    asset: 'Aset',
    type: 'Tipe',
    price: 'Harga',
    total: 'Total',
    fee: 'Biaya',
    notes: 'Catatan',
  },

  // Accounts
  accounts: {
    title: 'Akun',
    subtitle: 'Kelola akun keuangan Anda',
    addAccount: 'Tambah Akun',
    balance: 'Saldo',
    deposit: 'Setor',
    withdraw: 'Tarik',
    transfer: 'Transfer',
    accountType: 'Tipe Akun',
    bank: 'Bank',
    ewallet: 'E-Wallet',
    broker: 'Broker',
    cash: 'Tunai',
    softWallet: 'Dompet Digital',
  },

  // Financial Freedom
  ff: {
    title: 'Kebebasan Finansial',
    subtitle: 'Lacak perjalanan menuju kemandirian finansial',
    level: 'Level',
    survival: 'Bertahan',
    stability: 'Stabilitas',
    independence: 'Kemandirian',
    freedom: 'Kebebasan',
    purpose: 'Tujuan Hidup',
    savingsRate: 'Tingkat Tabungan',
    emergencyFundMonths: 'Dana Darurat',
    debtToIncome: 'Rasio Hutang',
    totalAssets: 'Total Aset',
    monthlyExpenses: 'Pengeluaran Bulanan',
    monthlyIncome: 'Pendapatan Bulanan',
    fireNumber: 'Angka FIRE',
    yearsToFire: 'Tahun ke FIRE',
  },

  // Trading
  trading: {
    title: 'Perjalanan Trading',
    subtitle: 'Lacak dan analisis performa trading Anda',
    totalTrades: 'Total Trade',
    winRate: 'Win Rate',
    totalPnl: 'Total P&L',
    avgRR: 'Rata-rata R:R',
    profitFactor: 'Profit Factor',
    maxDrawdown: 'Max Drawdown',
    sharpeRatio: 'Sharpe Ratio',
    wins: 'Menang',
    losses: 'Kalah',
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
    priceAlert: 'Peringatan Harga',
    transaction: 'Transaksi',
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
