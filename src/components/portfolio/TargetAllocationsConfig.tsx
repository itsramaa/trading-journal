import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Target, Save, RotateCcw, Loader2, PieChart } from "lucide-react";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/use-user-settings";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface TargetAllocations {
  crypto: number;
  stock_us: number;
  stock_id: number;
  reksadana: number;
  other: number;
}

const DEFAULT_ALLOCATIONS: TargetAllocations = {
  crypto: 20,
  stock_us: 40,
  stock_id: 25,
  reksadana: 10,
  other: 5,
};

const ASSET_TYPE_LABELS: Record<keyof TargetAllocations, string> = {
  crypto: "Cryptocurrency",
  stock_us: "US Stocks",
  stock_id: "Indonesian Stocks",
  reksadana: "Mutual Funds (Reksadana)",
  other: "Other Assets",
};

const ASSET_TYPE_COLORS: Record<keyof TargetAllocations, string> = {
  crypto: "bg-orange-500",
  stock_us: "bg-blue-500",
  stock_id: "bg-green-500",
  reksadana: "bg-purple-500",
  other: "bg-gray-500",
};

export function TargetAllocationsConfig() {
  const { data: settings, isLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  
  const [allocations, setAllocations] = useState<TargetAllocations>(DEFAULT_ALLOCATIONS);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings?.target_allocations) {
      const saved = settings.target_allocations as TargetAllocations;
      setAllocations({
        crypto: saved.crypto ?? DEFAULT_ALLOCATIONS.crypto,
        stock_us: saved.stock_us ?? DEFAULT_ALLOCATIONS.stock_us,
        stock_id: saved.stock_id ?? DEFAULT_ALLOCATIONS.stock_id,
        reksadana: saved.reksadana ?? DEFAULT_ALLOCATIONS.reksadana,
        other: saved.other ?? DEFAULT_ALLOCATIONS.other,
      });
    }
  }, [settings]);

  const totalAllocation = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const isValid = totalAllocation === 100;

  const handleAllocationChange = (key: keyof TargetAllocations, value: number) => {
    setAllocations((prev) => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!isValid) {
      toast.error("Total allocation must equal 100%");
      return;
    }

    await updateSettings.mutateAsync({
      target_allocations: allocations,
    });
    setHasChanges(false);
    toast.success("Target allocations saved");
  };

  const handleReset = () => {
    setAllocations(DEFAULT_ALLOCATIONS);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Target Allocations
        </CardTitle>
        <CardDescription>
          Configure your ideal portfolio allocation for rebalancing suggestions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual representation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Total</span>
            <Badge variant={isValid ? "default" : "destructive"}>
              {totalAllocation}%
            </Badge>
          </div>
          <div className="h-4 rounded-full overflow-hidden flex bg-muted">
            {(Object.entries(allocations) as [keyof TargetAllocations, number][]).map(
              ([key, value]) =>
                value > 0 && (
                  <div
                    key={key}
                    className={`${ASSET_TYPE_COLORS[key]} transition-all duration-300`}
                    style={{ width: `${value}%` }}
                    title={`${ASSET_TYPE_LABELS[key]}: ${value}%`}
                  />
                )
            )}
          </div>
          {!isValid && (
            <p className="text-sm text-destructive">
              Total must equal 100% (currently {totalAllocation}%)
            </p>
          )}
        </div>

        {/* Allocation sliders */}
        <div className="space-y-6">
          {(Object.entries(allocations) as [keyof TargetAllocations, number][]).map(
            ([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${ASSET_TYPE_COLORS[key]}`} />
                    <Label className="text-sm">{ASSET_TYPE_LABELS[key]}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={value}
                      onChange={(e) =>
                        handleAllocationChange(key, Math.max(0, Math.min(100, Number(e.target.value))))
                      }
                      className="w-20 h-8 text-right"
                    />
                    <span className="text-sm text-muted-foreground w-4">%</span>
                  </div>
                </div>
                <Slider
                  value={[value]}
                  onValueChange={([v]) => handleAllocationChange(key, v)}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            )
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={updateSettings.isPending}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Default
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || !hasChanges || updateSettings.isPending}
          >
            {updateSettings.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Allocations
              </>
            )}
          </Button>
        </div>

        {/* Tips */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Allocation Tips
          </h4>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Higher crypto allocation increases volatility but potential returns</li>
            <li>• US stocks provide USD exposure and global market access</li>
            <li>• Indonesian stocks align with local economic growth</li>
            <li>• Mutual funds offer diversification with lower management overhead</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
