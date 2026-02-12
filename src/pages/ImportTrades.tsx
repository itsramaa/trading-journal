/**
 * Import Trades Page - On-chain Solana trade import
 * Allows users to scan their wallet and import DEX trades
 */
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { SolanaTradeImport } from "@/components/wallet/SolanaTradeImport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Zap, Shield, Globe, Layers } from "lucide-react";

const SUPPORTED_DEXS = [
  { name: 'Deriverse', status: 'Primary' },
  { name: 'Deriverse Perps', status: 'Primary' },
  { name: 'Drift', status: 'Supported' },
  { name: 'Zeta Markets', status: 'Supported' },
  { name: 'Mango Markets', status: 'Supported' },
];

export default function ImportTrades() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          icon={Download}
          title="Import On-Chain Trades"
          description="Scan your Solana wallet and auto-import trades from supported DEXs"
        />

        {/* Feature cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border/50">
            <CardContent className="flex items-start gap-3 pt-5 pb-4">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Auto-Detection</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Identifies DEX trades from your transaction history automatically
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="flex items-start gap-3 pt-5 pb-4">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Duplicate Protection</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Already imported trades are automatically skipped
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="flex items-start gap-3 pt-5 pb-4">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Multi-DEX Support</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Supports Deriverse, Drift, Zeta, and more Solana DEXs
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Import Component */}
        <SolanaTradeImport />

        {/* Supported DEXs */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Supported Protocols
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_DEXS.map(dex => (
                <Badge
                  key={dex.name}
                  variant={dex.status === 'Primary' ? 'default' : 'outline'}
                  className="gap-1.5"
                >
                  {dex.name}
                  {dex.status === 'Supported' && (
                    <span className="text-[10px] opacity-70">{dex.status}</span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
