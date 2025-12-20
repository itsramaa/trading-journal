import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { Plus, Target, MoreVertical, Edit, Trash2, Tag } from "lucide-react";
import { format } from "date-fns";
import { 
  useTradingStrategies, 
  useCreateTradingStrategy, 
  useUpdateTradingStrategy, 
  useDeleteTradingStrategy,
  TradingStrategy 
} from "@/hooks/use-trading-strategies";

const strategyColors = [
  { name: 'Blue', value: 'blue' },
  { name: 'Green', value: 'green' },
  { name: 'Purple', value: 'purple' },
  { name: 'Orange', value: 'orange' },
  { name: 'Red', value: 'red' },
  { name: 'Teal', value: 'teal' },
  { name: 'Pink', value: 'pink' },
  { name: 'Yellow', value: 'yellow' },
];

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  green: 'bg-green-500/20 text-green-500 border-green-500/30',
  purple: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  orange: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  red: 'bg-red-500/20 text-red-500 border-red-500/30',
  teal: 'bg-teal-500/20 text-teal-500 border-teal-500/30',
  pink: 'bg-pink-500/20 text-pink-500 border-pink-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
};

const strategyFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must be 50 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  tags: z.string().optional(),
  color: z.string().default('blue'),
});

type StrategyFormValues = z.infer<typeof strategyFormSchema>;

export default function StrategyManagement() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<TradingStrategy | null>(null);
  const [deletingStrategy, setDeletingStrategy] = useState<TradingStrategy | null>(null);
  const [selectedColor, setSelectedColor] = useState('blue');

  const { data: strategies, isLoading } = useTradingStrategies();
  const createStrategy = useCreateTradingStrategy();
  const updateStrategy = useUpdateTradingStrategy();
  const deleteStrategy = useDeleteTradingStrategy();

  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues: {
      name: '',
      description: '',
      tags: '',
      color: 'blue',
    },
  });

  const handleOpenAdd = () => {
    form.reset({ name: '', description: '', tags: '', color: 'blue' });
    setSelectedColor('blue');
    setEditingStrategy(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (strategy: TradingStrategy) => {
    form.reset({
      name: strategy.name,
      description: strategy.description || '',
      tags: strategy.tags?.join(', ') || '',
      color: strategy.color || 'blue',
    });
    setSelectedColor(strategy.color || 'blue');
    setEditingStrategy(strategy);
    setIsAddOpen(true);
  };

  const handleSubmit = async (values: StrategyFormValues) => {
    const tagsArray = values.tags
      ? values.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    try {
      if (editingStrategy) {
        await updateStrategy.mutateAsync({
          id: editingStrategy.id,
          name: values.name,
          description: values.description,
          tags: tagsArray,
          color: selectedColor,
        });
      } else {
        await createStrategy.mutateAsync({
          name: values.name,
          description: values.description,
          tags: tagsArray,
          color: selectedColor,
        });
      }
      setIsAddOpen(false);
      setEditingStrategy(null);
      form.reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!deletingStrategy) return;
    try {
      await deleteStrategy.mutateAsync(deletingStrategy.id);
      setDeletingStrategy(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Strategy Management</h1>
            <p className="text-muted-foreground">Create and manage your trading strategies</p>
          </div>
          <MetricsGridSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Strategy Management</h1>
            <p className="text-muted-foreground">Create and manage your trading strategies</p>
          </div>
          <Button onClick={handleOpenAdd}>
            <Plus className="mr-2 h-4 w-4" />
            New Strategy
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Strategies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{strategies?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Most Used Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {strategies?.flatMap(s => s.tags || [])
                  .reduce((acc, tag) => {
                    acc[tag] = (acc[tag] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                  ? Object.entries(
                      strategies?.flatMap(s => s.tags || [])
                        .reduce((acc, tag) => {
                          acc[tag] = (acc[tag] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>) || {}
                    )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([tag]) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))
                  : <span className="text-muted-foreground text-sm">No tags yet</span>
                }
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Color Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1">
                {strategyColors.slice(0, 6).map(color => {
                  const count = strategies?.filter(s => s.color === color.value).length || 0;
                  return count > 0 ? (
                    <div
                      key={color.value}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${colorClasses[color.value]}`}
                    >
                      {count}
                    </div>
                  ) : null;
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Strategies List */}
        {!strategies || strategies.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No strategies created"
            description="Create your first trading strategy to track and analyze your setups."
            action={{
              label: "Create Strategy",
              onClick: handleOpenAdd,
            }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {strategies.map((strategy) => (
              <Card key={strategy.id} className={`border-l-4 ${colorClasses[strategy.color || 'blue']?.replace('bg-', 'border-l-')?.split(' ')[0] || 'border-l-blue-500'}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colorClasses[strategy.color || 'blue']?.split(' ')[0]}`} />
                      <CardTitle className="text-lg">{strategy.name}</CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(strategy)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeletingStrategy(strategy)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {strategy.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {strategy.tags && strategy.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {strategy.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Created {format(new Date(strategy.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingStrategy ? 'Edit Strategy' : 'Create Strategy'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input {...form.register("name")} placeholder="e.g., Breakout Strategy" />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  {...form.register("description")} 
                  placeholder="Describe when and how you use this strategy..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input 
                  {...form.register("tags")} 
                  placeholder="e.g., momentum, trend-following, scalping"
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {strategyColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setSelectedColor(color.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        colorClasses[color.value]?.split(' ')[0]
                      } ${
                        selectedColor === color.value
                          ? 'ring-2 ring-offset-2 ring-primary'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createStrategy.isPending || updateStrategy.isPending}
                >
                  {createStrategy.isPending || updateStrategy.isPending
                    ? 'Saving...'
                    : editingStrategy
                    ? 'Update'
                    : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deletingStrategy}
          onOpenChange={(open) => !open && setDeletingStrategy(null)}
          title="Delete Strategy"
          description={`Are you sure you want to delete "${deletingStrategy?.name}"? This will remove the strategy from all trades that use it.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={handleDelete}
        />
      </div>
    </DashboardLayout>
  );
}
