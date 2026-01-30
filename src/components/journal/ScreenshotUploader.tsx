/**
 * ScreenshotUploader - Drag & drop image upload for trade screenshots
 * Client-side compression, max 3 screenshots per trade
 */
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { useTradeScreenshots, MAX_SCREENSHOTS_PER_TRADE } from "@/hooks/use-trade-screenshots";
import { cn } from "@/lib/utils";

interface Screenshot {
  url: string;
  path: string;
}

interface ScreenshotUploaderProps {
  tradeId: string;
  screenshots: Screenshot[];
  onScreenshotsChange: (screenshots: Screenshot[]) => void;
  disabled?: boolean;
}

export function ScreenshotUploader({
  tradeId,
  screenshots,
  onScreenshotsChange,
  disabled,
}: ScreenshotUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { uploadScreenshot, deleteScreenshot, isUploading, isDeleting } = useTradeScreenshots();

  const canUploadMore = screenshots.length < MAX_SCREENSHOTS_PER_TRADE;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (canUploadMore && !disabled) {
      setIsDragging(true);
    }
  }, [canUploadMore, disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (!canUploadMore || disabled) return;

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );

      if (files.length === 0) return;

      // Only upload first file (or remaining slots)
      const remainingSlots = MAX_SCREENSHOTS_PER_TRADE - screenshots.length;
      const filesToUpload = files.slice(0, remainingSlots);

      for (const file of filesToUpload) {
        const result = await uploadScreenshot(file, tradeId);
        if (result) {
          onScreenshotsChange([...screenshots, result]);
        }
      }
    },
    [canUploadMore, disabled, screenshots, tradeId, uploadScreenshot, onScreenshotsChange]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0 || !canUploadMore || disabled) return;

      const file = files[0];
      if (!file.type.startsWith("image/")) return;

      const result = await uploadScreenshot(file, tradeId);
      if (result) {
        onScreenshotsChange([...screenshots, result]);
      }

      // Reset input
      e.target.value = "";
    },
    [canUploadMore, disabled, screenshots, tradeId, uploadScreenshot, onScreenshotsChange]
  );

  const handleDelete = useCallback(
    async (screenshot: Screenshot) => {
      const success = await deleteScreenshot(screenshot.path);
      if (success) {
        onScreenshotsChange(screenshots.filter((s) => s.path !== screenshot.path));
      }
    },
    [screenshots, deleteScreenshot, onScreenshotsChange]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Screenshots ({screenshots.length}/{MAX_SCREENSHOTS_PER_TRADE})
        </span>
      </div>

      {/* Screenshot Gallery */}
      {screenshots.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {screenshots.map((screenshot, index) => (
            <div
              key={screenshot.path}
              className="relative aspect-video rounded-md overflow-hidden border bg-muted group"
            >
              <img
                src={screenshot.url}
                alt={`Trade screenshot ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(screenshot)}
                disabled={isDeleting || disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Zone */}
      {canUploadMore && (
        <Card
          className={cn(
            "border-2 border-dashed p-4 transition-colors cursor-pointer",
            isDragging && "border-primary bg-primary/5",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <label className="flex flex-col items-center justify-center gap-2 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading || disabled}
            />
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium">
                {isUploading ? "Uploading..." : "Drop chart screenshot here"}
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse (max 500KB, auto-compressed)
              </p>
            </div>
          </label>
        </Card>
      )}

      {/* Limit Reached Message */}
      {!canUploadMore && (
        <p className="text-xs text-muted-foreground text-center py-2">
          <ImageIcon className="h-3 w-3 inline mr-1" />
          Maximum {MAX_SCREENSHOTS_PER_TRADE} screenshots reached
        </p>
      )}
    </div>
  );
}
