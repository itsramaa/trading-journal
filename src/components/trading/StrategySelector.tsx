import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, Plus, Target, X } from "lucide-react";
import { Strategy, demoStrategies } from "@/lib/trading-data";
import { cn } from "@/lib/utils";

interface StrategySelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  strategies?: Strategy[];
  onAddStrategy?: (strategy: Omit<Strategy, 'id' | 'createdAt'>) => void;
  className?: string;
}

export function StrategySelector({
  selectedIds,
  onChange,
  strategies = demoStrategies,
  onAddStrategy,
  className,
}: StrategySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newStrategy, setNewStrategy] = useState({ name: "", description: "", tags: "" });

  const selectedStrategies = strategies.filter(s => selectedIds.includes(s.id));

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(sid => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleRemove = (id: string) => {
    onChange(selectedIds.filter(sid => sid !== id));
  };

  const handleAddStrategy = () => {
    if (onAddStrategy && newStrategy.name) {
      onAddStrategy({
        name: newStrategy.name,
        description: newStrategy.description,
        tags: newStrategy.tags.split(",").map(t => t.trim()).filter(Boolean),
      });
      setNewStrategy({ name: "", description: "", tags: "" });
      setIsAddOpen(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 flex-wrap">
        {selectedStrategies.map(strategy => (
          <Badge key={strategy.id} variant="secondary" className="gap-1">
            <Target className="h-3 w-3" />
            {strategy.name}
            <button onClick={() => handleRemove(strategy.id)} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7">
              <Plus className="h-3 w-3 mr-1" />
              Add Strategy
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <ScrollArea className="h-64">
              <div className="p-2 space-y-1">
                {strategies.map(strategy => (
                  <div
                    key={strategy.id}
                    className="flex items-start gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                    onClick={() => handleToggle(strategy.id)}
                  >
                    <Checkbox
                      checked={selectedIds.includes(strategy.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{strategy.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {strategy.description}
                      </div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {strategy.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {onAddStrategy && (
              <>
                <Separator />
                <div className="p-2">
                  <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Strategy
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Strategy</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Strategy Name</Label>
                          <Input
                            value={newStrategy.name}
                            onChange={(e) => setNewStrategy(s => ({ ...s, name: e.target.value }))}
                            placeholder="e.g., Breakout"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={newStrategy.description}
                            onChange={(e) => setNewStrategy(s => ({ ...s, description: e.target.value }))}
                            placeholder="Describe your trading strategy..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tags (comma-separated)</Label>
                          <Input
                            value={newStrategy.tags}
                            onChange={(e) => setNewStrategy(s => ({ ...s, tags: e.target.value }))}
                            placeholder="momentum, trend-following"
                          />
                        </div>
                        <Button onClick={handleAddStrategy} className="w-full">
                          Create Strategy
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

interface StrategyFilterProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  strategies?: Strategy[];
  className?: string;
}

export function StrategyFilter({
  selectedIds,
  onChange,
  strategies = demoStrategies,
  className,
}: StrategyFilterProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <span className="text-sm text-muted-foreground">Strategies:</span>
      {strategies.map(strategy => (
        <Badge
          key={strategy.id}
          variant={selectedIds.includes(strategy.id) ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => {
            if (selectedIds.includes(strategy.id)) {
              onChange(selectedIds.filter(id => id !== strategy.id));
            } else {
              onChange([...selectedIds, strategy.id]);
            }
          }}
        >
          {strategy.name}
        </Badge>
      ))}
      {selectedIds.length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => onChange([])}>
          Clear
        </Button>
      )}
    </div>
  );
}
