/**
 * Binance API Settings Component
 * Configure and test Binance Futures API connection with full CRUD
 */

import { useState } from 'react';
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
  AlertTriangle,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  Key
} from "lucide-react";
import { useExchangeCredentials } from "@/hooks/use-exchange-credentials";
import { toast } from "sonner";
import { BinanceAccountConfigCard } from "./BinanceAccountConfigCard";
import { BinanceAutoSyncToggle } from "./BinanceAutoSyncToggle";
import { BinanceDataSourceToggle } from "./BinanceDataSourceToggle";
import { RetentionPeriodSetting } from "./RetentionPeriodSetting";
import { ApiKeyForm } from "./ApiKeyForm";
import { RateLimitDisplay } from "./RateLimitDisplay";
import { SyncMonitoringPanel } from "@/components/trading/SyncMonitoringPanel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDistanceToNow } from "date-fns";

export function BinanceApiSettings() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const {
    credential,
    isLoading,
    save,
    isSaving,
    delete: deleteCredential,
    isDeleting,
    test,
    isTesting,
    refetch,
  } = useExchangeCredentials('binance');
  
  const handleTestConnection = async () => {
    try {
      await test();
      toast.success("Binance API connected successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection failed");
    }
  };
  
  const handleDelete = async () => {
    if (!credential?.id) return;
    
    try {
      await deleteCredential(credential.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      // Error handled in hook
    }
  };
  
  const hasCredential = !!credential;
  const isConnected = credential?.is_valid === true;
  const isPending = credential?.is_valid === null;
  
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
            <Badge 
              variant={isConnected ? "default" : hasCredential ? "secondary" : "outline"} 
              className="gap-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading
                </>
              ) : isConnected ? (
                <>
                  <CheckCircle className="h-3 w-3" />
                  Connected
                </>
              ) : hasCredential ? (
                <>
                  <AlertTriangle className="h-3 w-3" />
                  {isPending ? 'Not Verified' : 'Invalid'}
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3" />
                  Not Configured
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show existing credential info or add form */}
          {hasCredential && !showAddForm ? (
            <div className="space-y-4">
              {/* Credential Info */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{credential.label || 'API Key'}</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {credential.api_key_masked}
                  </Badge>
                </div>
                
                {credential.last_validated_at && (
                  <p className="text-xs text-muted-foreground">
                    Last validated: {formatDistanceToNow(new Date(credential.last_validated_at), { addSuffix: true })}
                  </p>
                )}
                
                {credential.permissions && Object.keys(credential.permissions).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(credential.permissions).map(([key, value]) => (
                      value && (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {key}
                        </Badge>
                      )
                    ))}
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button 
                  onClick={handleTestConnection}
                  disabled={isTesting || isDeleting}
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddForm(true)}
                  disabled={isTesting || isDeleting}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Update Keys
                </Button>
                
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isTesting || isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Remove
                </Button>
              </div>
            </div>
          ) : showAddForm ? (
            <ApiKeyForm 
              onSuccess={() => {
                setShowAddForm(false);
                refetch();
              }}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <div className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>API Key Required</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    Add your Binance API credentials to sync your trading data.
                    Your keys are encrypted and stored securely.
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
              
              <div className="flex items-center gap-3">
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add API Key
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
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Rate Limit Display */}
      {hasCredential && <RateLimitDisplay />}
      
      {/* Data Source Toggle (show if connected) */}
      {isConnected && <BinanceDataSourceToggle isConnected={isConnected} />}
      
      {/* Retention Period Setting (show if connected) */}
      {isConnected && <RetentionPeriodSetting />}
      
      {/* Auto-Sync Toggle (only show if connected) */}
      {isConnected && <BinanceAutoSyncToggle isConnected={isConnected} />}
      
      {/* Sync Monitoring Panel (only show if connected) */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sync Health Monitoring</CardTitle>
            <CardDescription>
              Monitor data quality, reconciliation status, and sync failures
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SyncMonitoringPanel />
          </CardContent>
        </Card>
      )}
      
      {/* Account Configuration Card (only show if connected) */}
      {isConnected && (
        <>
          <Separator />
          <BinanceAccountConfigCard />
        </>
      )}
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Remove API Credentials"
        description="Are you sure you want to remove your Binance API credentials? You will need to add them again to sync your trading data."
        confirmLabel="Remove"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
