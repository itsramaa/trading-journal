/**
 * Import Trades Page - On-chain Solana trade import
 * Allows users to scan their wallet and import DEX trades
 */
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SolanaTradeImport } from "@/components/wallet/SolanaTradeImport";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Zap, Shield, Globe } from "lucide-react";

const SUPPORTED_DEXS = [
  { name: 'Deriverse', status: 'Primary', color: 'text-primary' },
  { name: 'Drift', status: 'Supported', color: 'text-muted-foreground' },
  { name: 'Zeta Markets', status: 'Supported', color: 'text-muted-foreground' },
  { name: 'Mango Markets', status: 'Supported', color: 'text-muted-foreground' },
];

export default function ImportTrades() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Download className="h-6 w-6 text-primary" />
            Import On-Chain Trades
          </h1>
          <p className="text-muted-foreground mt-1">
            Scan your Solana wallet and auto-import trades from supported DEXs
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="border-border/50">
            <CardContent className="flex items-start gap-3 pt-5">
              <Zap className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Auto-Detection</p>
                <p className="text-xs text-muted-foreground">
                  Automatically identifies DEX trades from your transaction history
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="flex items-start gap-3 pt-5">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Duplicate Protection</p>
                <p className="text-xs text-muted-foreground">
                  Already imported trades are automatically skipped
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="flex items-start gap-3 pt-5">
              <Globe className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Multi-DEX Support</p>
                <p className="text-xs text-muted-foreground">
                  Supports Deriverse, Drift, Zeta, and more Solana DEXs
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Import Component */}
        <SolanaTradeImport />

        {/* Supported DEXs */}
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-medium mb-3">Supported Protocols</h3>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_DEXS.map(dex => (
                <Badge key={dex.name} variant="outline" className="gap-1.5">
                  <span className={dex.color}>●</span>
                  {dex.name}
                  <span className="text-[10px] text-muted-foreground">{dex.status}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
