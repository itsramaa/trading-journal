/**
 * API Key Form Component
 * Secure input form for Binance API credentials
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Eye, EyeOff, Shield, Loader2 } from 'lucide-react';
import { useSaveCredentials, useTestConnection } from '@/hooks/use-exchange-credentials';
import { toast } from 'sonner';

interface ApiKeyFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ApiKeyForm({ onSuccess, onCancel }: ApiKeyFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [label, setLabel] = useState('Main Account');
  const [showSecret, setShowSecret] = useState(false);
  
  const saveCredentials = useSaveCredentials();
  const testConnection = useTestConnection();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim() || !apiSecret.trim()) {
      toast.error('API Key and Secret are required');
      return;
    }
    
    try {
      // Save credentials first
      await saveCredentials.mutateAsync({
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        label: label.trim() || 'Main Account',
      });
      
      // Then test the connection
      await testConnection.mutateAsync();
      
      toast.success('API credentials saved and validated!');
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save credentials');
    }
  };
  
  const isSubmitting = saveCredentials.isPending || testConnection.isPending;
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Security Notice</AlertTitle>
        <AlertDescription>
          Your API credentials are encrypted before storage and never logged.
          Use read-only keys without withdrawal permissions for maximum security.
        </AlertDescription>
      </Alert>
      
      <div className="space-y-2">
        <Label htmlFor="apiKey">API Key</Label>
        <Input
          id="apiKey"
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your Binance API key"
          autoComplete="off"
          disabled={isSubmitting}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="apiSecret">API Secret</Label>
        <div className="relative">
          <Input
            id="apiSecret"
            type={showSecret ? 'text' : 'password'}
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="Enter your Binance API secret"
            autoComplete="off"
            disabled={isSubmitting}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setShowSecret(!showSecret)}
            tabIndex={-1}
          >
            {showSecret ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="label">Label (optional)</Label>
        <Input
          id="label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g., Main Account"
          disabled={isSubmitting}
        />
      </div>
      
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save & Test Connection'
          )}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
