/**
 * Landing / Showcase Page
 * Public-facing page that highlights all analytics features
 * for competition judges and prospective users.
 */
import { useNavigate } from 'react-router-dom';
import deriverseLogo from '@/assets/deriverse-logo.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  BarChart3,
  Shield,
  Brain,
  Wallet,
  Clock,
  Target,
  Zap,
  LineChart,
  ArrowRight,
  ChevronRight,
  Activity,
  PieChart,
  Layers,
  Globe,
  Lock,
  CheckCircle,
  Gauge,
  CalendarDays,
  Network,
  Star,
  Sparkles,
} from 'lucide-react';

const HERO_STATS = [
  { label: 'Analytics Metrics', value: '50+', icon: BarChart3 },
  { label: 'AI Models Integrated', value: '4', icon: Brain },
  { label: 'Risk Models', value: '6', icon: Shield },
  { label: 'Edge Functions', value: '12+', icon: Zap },
];

const COMPETITION_FEATURES = [
  {
    icon: TrendingUp,
    title: 'Total P&L Tracking',
    description: 'Real-time gross & net P&L with visual performance indicators, equity curve, and drawdown visualization.',
    status: 'implemented',
  },
  {
    icon: BarChart3,
    title: 'Volume & Fee Analysis',
    description: 'Complete fee composition (commission vs funding), cumulative fee tracking, and cost-efficiency analysis.',
    status: 'implemented',
  },
  {
    icon: Target,
    title: 'Win Rate & Trade Count',
    description: 'Win/loss/breakeven ratios, profit factor, average win/loss amounts, and largest gain/loss tracking.',
    status: 'implemented',
  },
  {
    icon: Clock,
    title: 'Average Trade Duration',
    description: 'Mean, median, shortest and longest trade durations with distribution analysis.',
    status: 'implemented',
  },
  {
    icon: Activity,
    title: 'Long/Short Ratio',
    description: 'Directional bias tracking with per-direction win rates, P&L breakdown, and visual indicators.',
    status: 'implemented',
  },
  {
    icon: Gauge,
    title: 'Largest Gain/Loss',
    description: 'Track extreme outcomes for risk management. Identify best and worst trades with full context.',
    status: 'implemented',
  },
  {
    icon: PieChart,
    title: 'Average Win/Loss Analysis',
    description: 'Per-trade averages with strategy-level breakdowns and expectancy calculations.',
    status: 'implemented',
  },
  {
    icon: Layers,
    title: 'Symbol & Date Filtering',
    description: 'Multi-filter combinations: symbol, direction, session, strategy, and date range selection.',
    status: 'implemented',
  },
  {
    icon: LineChart,
    title: 'Historical P&L Charts',
    description: 'Interactive equity curves with drawdown overlay, daily/weekly/monthly views, and benchmark comparison.',
    status: 'implemented',
  },
  {
    icon: CalendarDays,
    title: 'Time-Based Metrics',
    description: 'Session-based analysis (Asia/London/NY), time-of-day heatmap, daily streaks, and weekly comparison.',
    status: 'implemented',
  },
  {
    icon: Layers,
    title: 'Trade History Table',
    description: 'Detailed trade table with enrichment drawer, AI post-mortem, annotations, and sorting capabilities.',
    status: 'implemented',
  },
  {
    icon: BarChart3,
    title: 'Fee Breakdown',
    description: 'Commission, funding fees, and rebate tracking with cumulative charts and cost-per-trade analysis.',
    status: 'implemented',
  },
  {
    icon: PieChart,
    title: 'Order Type Analysis',
    description: 'Performance breakdown by order type (Market/Limit/Stop), maker/taker ratio, and execution quality.',
    status: 'implemented',
  },
];

const INNOVATION_FEATURES = [
  {
    icon: Brain,
    title: 'Multi-Mode AI Assistant',
    description: 'Four specialized AI modes: Trading Analyst, Market Analyst, Setup Validator, and Post-Trade Coach — each with deep context awareness and tool-calling capabilities.',
    highlight: true,
  },
  {
    icon: Shield,
    title: 'Advanced Risk Suite',
    description: 'Sharpe Ratio, Sortino Ratio, Calmar Ratio, Value-at-Risk (VaR 95%), Kelly Criterion, Max Drawdown, and composite Trading Health Score.',
    highlight: true,
  },
  {
    icon: Gauge,
    title: 'Trading Health Score',
    description: 'Single composite 0-100 score combining Sharpe, drawdown, win rate, consistency, and risk metrics into one actionable gauge.',
    highlight: true,
  },
  {
    icon: Network,
    title: 'Portfolio Correlation Heatmap',
    description: 'Visual correlation matrix between traded pairs showing portfolio concentration risk and diversification opportunities.',
    highlight: true,
  },
  {
    icon: Wallet,
    title: 'On-Chain Trade Import',
    description: 'Auto-import from Deriverse, Drift, Zeta Markets, and Mango Markets directly from Solana wallet signatures.',
    highlight: false,
  },
  {
    icon: Zap,
    title: 'Strategy Backtesting',
    description: 'Simulate strategies against historical Binance data with configurable capital, leverage, fees, and equity curve output.',
    highlight: false,
  },
  {
    icon: Globe,
    title: 'Market Insight Engine',
    description: 'Real-time Fear & Greed Index, whale detection, technical signals, macro analysis, and economic calendar with AI predictions.',
    highlight: false,
  },
  {
    icon: CalendarDays,
    title: 'Economic Calendar',
    description: 'Live high-impact economic events with AI-generated crypto market impact predictions and risk adjustment suggestions.',
    highlight: false,
  },
];

const TECH_STACK = [
  { label: 'Frontend', value: 'React 18 + Vite + TypeScript + Tailwind CSS', color: 'text-blue-400' },
  { label: 'Backend', value: 'Serverless Edge Functions (Deno Runtime)', color: 'text-green-400' },
  { label: 'Database', value: 'PostgreSQL with Row-Level Security (17 tables)', color: 'text-purple-400' },
  { label: 'Blockchain', value: 'Solana Web3.js + Wallet Adapter', color: 'text-orange-400' },
  { label: 'AI Engine', value: 'Multi-model (Gemini 3, GPT-5) via AI Gateway', color: 'text-pink-400' },
  { label: 'State Mgmt', value: 'TanStack Query + Zustand + Context API', color: 'text-cyan-400' },
];

const SECURITY_FEATURES = [
  { text: 'Row-Level Security (RLS) on all 17 tables', icon: Lock },
  { text: 'JWT authentication with secure edge functions', icon: Shield },
  { text: 'AES-256 encrypted credentials via pgcrypto + Vault', icon: Lock },
  { text: 'Strict data isolation between Paper & Live modes', icon: Shield },
  { text: 'No private keys stored — read-only wallet access', icon: Lock },
  { text: 'Input sanitization & rate limiting on all endpoints', icon: Shield },
  { text: 'Audit logging for all data modifications', icon: Lock },
  { text: 'Duplicate trade prevention via signature tracking', icon: Shield },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-xl bg-primary/10 overflow-hidden">
                <img src={deriverseLogo} alt="Deriverse" className="h-6 w-6 object-cover" />
              </div>
              <span className="text-xl font-bold">Deriverse Analytics</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
              <Button size="sm" onClick={() => navigate('/auth')}>
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-primary/2 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-primary/20 bg-primary/5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Built on Solana • AI-Powered • Production-Ready</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
            Professional Trading
            <br />
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              Analytics Platform
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
            The most comprehensive trading journal for Deriverse. Track P&L, analyze patterns, 
            manage risk with advanced metrics, and improve your edge with a multi-mode AI assistant — 
            all powered by your on-chain data.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Button size="lg" onClick={() => navigate('/auth')} className="px-8 h-12 text-base">
              Launch App <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 text-base" onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Explore All Features <ChevronRight className="ml-1 h-5 w-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="relative group">
                <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border/50 bg-card/50 group-hover:border-primary/30 transition-colors">
                  <stat.icon className="h-5 w-5 text-primary mb-1" />
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Competition Checklist - All 13 Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5">
            <CheckCircle className="h-3 w-3 mr-1.5" />
            Competition Requirements
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            All 13 Features — Fully Implemented
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Every requested feature from the competition criteria is production-ready,
            server-side calculated, and battle-tested.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COMPETITION_FEATURES.map((feature, i) => (
            <Card key={feature.title} className="group border-border/50 hover:border-primary/30 transition-all hover:shadow-md">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{feature.title}</h3>
                      <CheckCircle className="h-3.5 w-3.5 text-profit shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Innovation Features */}
      <section className="bg-card/50 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-4 py-1.5">
              <Star className="h-3 w-3 mr-1.5" />
              Innovation Showcase
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Beyond the Requirements
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Unique features that push the boundaries — multi-mode AI assistant, 
              advanced risk models, and real-time market intelligence.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 max-w-5xl mx-auto">
            {INNOVATION_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className={`flex gap-4 p-6 rounded-xl border transition-all hover:shadow-md ${
                  feature.highlight 
                    ? 'border-primary/30 bg-primary/5 hover:border-primary/50' 
                    : 'border-border/50 bg-background/50 hover:border-primary/20'
                }`}
              >
                <div className={`p-3 rounded-lg h-fit shrink-0 ${
                  feature.highlight ? 'bg-primary/15 text-primary' : 'bg-primary/10 text-primary'
                }`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-semibold">{feature.title}</h3>
                    {feature.highlight && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                        NEW
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack & Security */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Architecture */}
          <div>
            <div className="flex items-center gap-2 mb-8">
              <Globe className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Tech Stack</h2>
            </div>
            <div className="space-y-3">
              {TECH_STACK.map((item) => (
                <div key={item.label} className="flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:border-primary/20 transition-colors">
                  <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-lg shrink-0 min-w-[90px] text-center">
                    {item.label}
                  </span>
                  <span className="text-sm text-muted-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security */}
          <div>
            <div className="flex items-center gap-2 mb-8">
              <Lock className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Security & Data Safety</h2>
            </div>
            <div className="space-y-2.5">
              {SECURITY_FEATURES.map((feature) => (
                <div key={feature.text} className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 hover:border-primary/20 transition-colors">
                  <feature.icon className="h-4 w-4 text-profit shrink-0" />
                  <span className="text-sm text-muted-foreground">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-12 sm:p-16 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.06),transparent_70%)]" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Ready to Level Up Your Trading?
              </h2>
              <p className="text-muted-foreground mb-8 text-lg max-w-xl mx-auto">
                Connect your Solana wallet, import your Deriverse trades, and start gaining actionable insights in minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" onClick={() => navigate('/auth')} className="px-10 h-12 text-base">
                  Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Deriverse Analytics</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built for the Deriverse Trading Analytics Competition • 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
