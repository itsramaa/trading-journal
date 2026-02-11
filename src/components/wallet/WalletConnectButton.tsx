/**
 * Custom Wallet Connect Button
 * Shows wallet status and connect/disconnect actions
 */
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, LogOut, Copy, ExternalLink, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WalletConnectButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function WalletConnectButton({ className, variant = 'outline', size = 'sm' }: WalletConnectButtonProps) {
  const { publicKey, wallet, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const truncatedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : '';

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      toast.success('Wallet address copied');
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    toast.info('Wallet disconnected');
  };

  if (!connected) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn('gap-2', className)}
        onClick={() => setVisible(true)}
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={cn('gap-2', className)}>
          {wallet?.adapter.icon && (
            <img 
              src={wallet.adapter.icon} 
              alt={wallet.adapter.name}
              className="h-4 w-4 rounded-sm"
            />
          )}
          <span className="font-mono text-xs">{truncatedAddress}</span>
          <Badge variant="outline" className="text-[10px] px-1 py-0 border-profit/30 text-profit">
            <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
            Connected
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2">
          <p className="text-xs text-muted-foreground">Connected via {wallet?.adapter.name}</p>
          <p className="text-xs font-mono mt-1">{truncatedAddress}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyAddress}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a 
            href={`https://solscan.io/account/${publicKey?.toBase58()}`} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Solscan
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDisconnect} className="text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
