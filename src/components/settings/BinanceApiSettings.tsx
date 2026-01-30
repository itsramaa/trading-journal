/**
 * Binance API Settings Component
 * Configure and test Binance Futures API connection
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Shield, 
  Wallet, 
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  Loader2
} from "lucide-react";
import { 
  useBinanceConnection, 
  useTestBinanceConnection, 
  useBinanceBalance,
  useBinancePositions
} from "@/features/binance";
import { toast } from "sonner";

export function BinanceApiSettings() {
  const { data: connectionStatus, isLoading: isCheckingConnection } = useBinanceConnection();
  const { data: balance, isLoading: isLoadingBalance } = useBinanceBalance();
  const { data: positions } = useBinancePositions();
  const testConnection = useTestBinanceConnection();
  
  const handleTestConnection = async () => {
    try {
      await testConnection.mutateAsync();
      toast.success("Binance API connected successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection failed");
    }
  };
  
  const isConnected = connectionStatus?.isConnected;
  
  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Binance Futures API
              </CardTitle>
              <CardDescription>
                Connect your Binance Futures account to sync positions and trade history
              </CardDescription>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
              {isConnected ? (
                <>
                  <CheckCircle className="h-3 w-3" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3" />
                  Not Connected
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Info */}
          {connectionStatus?.error && !isConnected && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription>{connectionStatus.error}</AlertDescription>
            </Alert>
          )}
          
          {/* API Key Configuration Instructions */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>API Key Configuration</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                Your Binance API keys are securely stored as environment secrets and cannot be viewed or edited directly.
                To update your API keys, please contact the system administrator.
              </p>
              <div className="mt-2 text-sm space-y-1">
                <p className="font-medium">Required Binance API permissions:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>Enable Futures trading</li>
                  <li>Enable reading (for balance, positions, trade history)</li>
                  <li>Do NOT enable withdrawals for security</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
          
          {/* Test Connection Button */}
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleTestConnection}
              disabled={testConnection.isPending || isCheckingConnection}
            >
              {testConnection.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Test Connection
            </Button>
            
            <Button variant="outline" asChild>
              <a 
                href="https://www.binance.com/en/my/settings/api-management" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage API Keys
              </a>
            </Button>
          </div>
          
          {/* Last Checked */}
          {connectionStatus?.lastChecked && (
            <p className="text-xs text-muted-foreground">
              Last checked: {new Date(connectionStatus.lastChecked).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
      
      {/* Account Overview (only show if connected) */}
      {isConnected && (
        <>
          <Separator />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Account Overview
              </CardTitle>
              <CardDescription>
                Real-time balance and position data from Binance Futures
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBalance ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : balance ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Wallet Balance</p>
                    <p className="text-xl font-bold">
                      ${balance.totalWalletBalance.toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Available</p>
                    <p className="text-xl font-bold">
                      ${balance.availableBalance.toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Unrealized P&L</p>
                    <p className={`text-xl font-bold ${balance.totalUnrealizedProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {balance.totalUnrealizedProfit >= 0 ? '+' : ''}
                      ${balance.totalUnrealizedProfit.toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Margin Balance</p>
                    <p className="text-xl font-bold">
                      ${balance.totalMarginBalance.toFixed(2)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Unable to load balance data</p>
              )}
            </CardContent>
          </Card>
          
          {/* Active Positions Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Active Positions
              </CardTitle>
              <CardDescription>
                Current open positions from Binance Futures
              </CardDescription>
            </CardHeader>
            <CardContent>
              {positions && positions.length > 0 ? (
                <div className="space-y-3">
                  {positions.map((position, index) => (
                    <div 
                      key={`${position.symbol}-${index}`}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={position.positionAmt > 0 ? "default" : "secondary"}>
                          {position.positionAmt > 0 ? 'LONG' : 'SHORT'}
                        </Badge>
                        <div>
                          <p className="font-medium">{position.symbol}</p>
                          <p className="text-xs text-muted-foreground">
                            {Math.abs(position.positionAmt)} @ ${position.entryPrice.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${position.unrealizedProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {position.unrealizedProfit >= 0 ? '+' : ''}
                          ${position.unrealizedProfit.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {position.leverage}x leverage
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No active positions
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
