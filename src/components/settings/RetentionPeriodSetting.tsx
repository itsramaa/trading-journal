/**
 * RetentionPeriodSetting - User setting for trade retention period
 * Options: 6 months, 1 year, 2 years, Never delete
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Info, Loader2 } from "lucide-react";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/use-user-settings";
import { toast } from "sonner";

const RETENTION_OPTIONS = [
  { value: "180", label: "6 Months", description: "Keep trades for 6 months" },
  { value: "365", label: "1 Year", description: "Keep trades for 1 year (recommended)" },
  { value: "730", label: "2 Years", description: "Keep trades for 2 years" },
  { value: "never", label: "Never Delete", description: "Keep all trades forever" },
] as const;

export function RetentionPeriodSetting() {
  const { data: settings, isLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  const currentRetention = settings?.trade_retention_days;
  const currentValue = currentRetention === null ? "never" : String(currentRetention ?? 365);

  const handleChange = async (value: string) => {
    try {
      const retentionDays = value === "never" ? null : parseInt(value, 10);
      await updateSettings.mutateAsync({ 
        trade_retention_days: retentionDays 
      } as any);
      
      const option = RETENTION_OPTIONS.find(o => o.value === value);
      toast.success(`Retention period set to ${option?.label}`);
    } catch (error) {
      toast.error("Failed to update retention setting");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Trade Retention Period</CardTitle>
          </div>
          <Badge variant="secondary">
            {RETENTION_OPTIONS.find(o => o.value === currentValue)?.label}
          </Badge>
        </div>
        <CardDescription>
          Automatically cleanup old Binance trades to optimize storage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup 
          value={currentValue} 
          onValueChange={handleChange}
          disabled={updateSettings.isPending}
          className="space-y-3"
        >
          {RETENTION_OPTIONS.map((option) => (
            <div 
              key={option.value}
              className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <RadioGroupItem value={option.value} id={`retention-${option.value}`} />
              <div className="flex-1">
                <Label 
                  htmlFor={`retention-${option.value}`} 
                  className="font-medium cursor-pointer"
                >
                  {option.label}
                </Label>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
              {option.value === "365" && (
                <Badge variant="outline" className="text-xs">Recommended</Badge>
              )}
            </div>
          ))}
        </RadioGroup>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-muted-foreground text-sm">
            <strong>Note:</strong> Only Binance-synced trades are affected. 
            Manual/paper trades are never auto-deleted. 
            Cleanup runs weekly at 3 AM UTC.
          </AlertDescription>
        </Alert>

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>• Trades older than the retention period are soft-deleted</p>
          <p>• Deleted trades can be restored within 30 days</p>
          <p>• Setting "Never Delete" disables automatic cleanup</p>
        </div>
      </CardContent>
    </Card>
  );
}
