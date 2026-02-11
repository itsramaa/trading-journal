/**
 * Landing / Showcase Page
 * Public-facing page that highlights all analytics features
 * for competition judges and prospective users.
 */
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

const HERO_STATS = [
  { label: 'Analytics Metrics', value: '50+' },
  { label: 'Supported DEXs', value: '6' },
  { label: 'Risk Models', value: '5' },
  { label: 'AI Models', value: '3' },
];

const CORE_FEATURES = [
  {
    icon: TrendingUp,
    title: 'Total P&L Tracking',
    description: 'Real-time gross & net P&L with visual performance indicators, drawdown visualization, and equity curve charting.',
    badge: 'Core',
  },
  {
    icon: BarChart3,
    title: 'Volume & Fee Analysis',
    description: 'Complete trading volume breakdown, fee composition (commission vs funding), and cumulative fee tracking over time.',
    badge: 'Core',
  },
  {
    icon: Target,
    title: 'Win Rate & Trade Metrics',
    description: 'Win/loss/breakeven ratios, profit factor, average win/loss amounts, largest gain/loss tracking for risk management.',
    badge: 'Core',
  },
  {
    icon: Clock,
    title: 'Duration & Time Analysis',
    description: 'Average trade duration, time-of-day performance heatmap, session-based analysis (Asia/London/NY), and daily streaks.',
    badge: 'Analytics',
  },
  {
    icon: Activity,
    title: 'Long/Short Ratio',
    description: 'Directional bias tracking with per-direction win rates, P&L breakdown, and visual ratio indicators.',
    badge: 'Analytics',
  },
  {
    icon: LineChart,
    title: 'Historical P&L Charts',
    description: 'Interactive equity curves with drawdown overlay, daily/weekly/monthly aggregation, and benchmark comparison.',
    badge: 'Analytics',
  },
  {
    icon: PieChart,
    title: 'Symbol Filtering',
    description: 'Per-symbol performance breakdown, date range selection, multi-filter combinations for granular analysis.',
    badge: 'Filters',
  },
  {
    icon: Layers,
    title: 'Order Type Analysis',
    description: 'Performance breakdown by order type (Market vs Limit), maker/taker ratio, and execution quality scoring.',
    badge: 'Advanced',
  },
];

const ADVANCED_FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    description: 'Pattern recognition, trade quality scoring, and personalized improvement suggestions using machine learning.',
  },
  {
    icon: Shield,
    title: 'Risk Management Suite',
    description: 'Sharpe, Sortino, Calmar ratios, Value-at-Risk (VaR), Kelly Criterion, max drawdown tracking, and daily loss limits.',
  },
  {
    icon: Wallet,
    title: 'On-Chain Import',
    description: 'Auto-import trades from Deriverse, Drift, Zeta Markets, and Mango Markets directly from your Solana wallet.',
  },
  {
    icon: Zap,
    title: 'Backtest Engine',
    description: 'Simulate strategies against historical data with configurable capital, leverage, and fee assumptions.',
  },
];

const SECURITY_FEATURES = [
  'Row-Level Security (RLS) on all tables',
  'Encrypted API credential storage',
  'Data isolation between Paper & Live modes',
  'No private keys stored — read-only wallet access',
  'Duplicate trade prevention via signature tracking',
  'Audit logging for all data modifications',
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
              <div className="p-2 rounded-xl bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
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
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm">
            Built on Solana • Fully On-Chain
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Professional Trading Analytics
            <br />
            <span className="text-primary">for Deriverse</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
            A comprehensive trading journal and portfolio analysis platform.
            Track P&L, analyze patterns, manage risk, and improve your edge
            with AI-powered insights — all from your on-chain data.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button size="lg" onClick={() => navigate('/auth')} className="px-8">
              Launch App <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Explore Features <ChevronRight className="ml-1 h-5 w-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <Badge variant="secondary" className="mb-4">Competition Criteria</Badge>
          <h2 className="text-3xl font-bold mb-4">
            Every Analytics Feature You Need
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            All requested competition features are implemented and production-ready —
            from basic P&L tracking to advanced time-based performance analysis.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CORE_FEATURES.map((feature) => (
            <Card key={feature.title} className="group border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="pt-6 pb-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {feature.badge}
                  </Badge>
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Innovation / Advanced Features */}
      <section className="bg-card/50 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4">Innovation</Badge>
            <h2 className="text-3xl font-bold mb-4">
              Beyond the Basics
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Unique features that go beyond standard requirements — AI analysis,
              advanced risk models, on-chain wallet import, and strategy backtesting.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {ADVANCED_FEATURES.map((feature) => (
              <div key={feature.title} className="flex gap-4 p-6 rounded-xl border border-border/50 bg-background/50">
                <div className="p-3 rounded-lg bg-primary/10 text-primary h-fit shrink-0">
                  <feature.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture & Security */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Architecture */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Globe className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Architecture</h2>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Frontend', value: 'React 18 + Vite + TypeScript + Tailwind CSS' },
                { label: 'Backend', value: 'Supabase Edge Functions (Deno)' },
                { label: 'Database', value: 'PostgreSQL with RLS policies' },
                { label: 'Blockchain', value: 'Solana Web3.js + Wallet Adapter' },
                { label: 'AI Engine', value: 'Multi-model (Gemini, GPT) via Edge Functions' },
                { label: 'State', value: 'TanStack Query + Zustand + Context API' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg border border-border/50">
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded shrink-0 min-w-[80px] text-center">
                    {item.label}
                  </span>
                  <span className="text-sm text-muted-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Lock className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Security</h2>
            </div>
            <div className="space-y-3">
              {SECURITY_FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                  <div className="h-2 w-2 rounded-full bg-profit shrink-0" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 bg-card/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Level Up Your Trading?
          </h2>
          <p className="text-muted-foreground mb-8">
            Connect your Solana wallet, import your Deriverse trades, and start gaining insights in minutes.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')} className="px-10">
            Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
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
            Built for the Deriverse Trading Analytics Competition
          </p>
        </div>
      </footer>
    </div>
  );
}
