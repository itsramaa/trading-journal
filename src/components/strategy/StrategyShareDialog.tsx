/**
 * StrategyShareDialog - Share strategy via link or QR code
 */
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Copy, 
  Check, 
  Link2, 
  QrCode, 
  Share2, 
  Shield, 
  Lock,
  Users,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { useStrategySharing } from "@/hooks/use-strategy-sharing";
import type { TradingStrategy } from "@/hooks/use-trading-strategies";

interface StrategyShareDialogProps {
  strategy: TradingStrategy | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StrategyShareDialog({
  strategy,
  open,
  onOpenChange,
}: StrategyShareDialogProps) {
  const [copied, setCopied] = useState(false);
  
  const {
    shareStatus,
    isLoadingStatus,
    enableSharing,
    disableSharing,
    isShared,
    shareUrl,
  } = useStrategySharing(strategy?.id);

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleToggleSharing = async () => {
    if (!strategy) return;
    
    if (isShared) {
      await disableSharing.mutateAsync(strategy.id);
    } else {
      await enableSharing.mutateAsync(strategy.id);
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('strategy-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `strategy-${strategy?.name.replace(/\s+/g, '-')}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (!strategy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share Strategy
          </DialogTitle>
          <DialogDescription>
            Share "{strategy.name}" with other traders via link or QR code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sharing Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-3">
              {isShared ? (
                <Users className="h-5 w-5 text-profit" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {isShared ? 'Sharing Enabled' : 'Sharing Disabled'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isShared 
                    ? 'Authenticated users with the link can view and clone' 
                    : 'Only you can see this strategy'}
                </p>
              </div>
            </div>
            {isLoadingStatus ? (
              <Skeleton className="h-5 w-10" />
            ) : (
              <Switch
                checked={isShared}
                onCheckedChange={handleToggleSharing}
                disabled={enableSharing.isPending || disableSharing.isPending}
                aria-label="Toggle strategy sharing"
              />
            )}
          </div>

          {/* Share Content (only visible when sharing is enabled) */}
          {isShared && shareUrl && (
            <Tabs defaultValue="link" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="link" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Link
                </TabsTrigger>
                <TabsTrigger value="qr" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  QR Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="link" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="share-link">Share Link</Label>
                  <div className="flex gap-2">
                    <Input
                      id="share-link"
                      value={shareUrl}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleCopyLink}
                      aria-label="Copy share link"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-profit" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Access Info */}
                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="font-medium">Access Requirements</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Auth</Badge>
                        Users must be logged in to view
                      </li>
                      <li className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Clone</Badge>
                        Viewers can copy to their account
                      </li>
                      <li className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">Rules</Badge>
                        Full entry/exit rules are visible
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="qr" className="space-y-4 mt-4">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-white rounded-lg">
                    <QRCodeSVG
                      id="strategy-qr-code"
                      value={shareUrl}
                      size={200}
                      level="H"
                      includeMargin
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Scan to view strategy on another device
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleDownloadQR}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Info when sharing is disabled */}
          {!isShared && (
            <div className="text-center py-6 text-muted-foreground">
              <Lock className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Enable sharing to generate a link</p>
              <p className="text-xs mt-1">
                Other authenticated users will be able to view and clone your strategy
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
