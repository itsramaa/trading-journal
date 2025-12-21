import { useState } from "react";
import { Settings, Users, Shield, Database, Activity, Crown } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRequireAdmin } from "@/hooks/use-permissions";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

function AdminDashboard() {
  // Admin-only queries
  const { data: userStats } = useQuery({
    queryKey: ['admin', 'user-stats'],
    queryFn: async () => {
      // This would need service role in production
      // For now, show counts from public tables
      const { count: portfolioCount } = await supabase
        .from('portfolios')
        .select('*', { count: 'exact', head: true });
      
      const { count: transactionCount } = await supabase
        .from('portfolio_transactions')
        .select('*', { count: 'exact', head: true });
      
      const { count: assetCount } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true });
      
      return {
        portfolios: portfolioCount || 0,
        transactions: transactionCount || 0,
        assets: assetCount || 0,
      };
    },
  });

  const { data: featurePermissions } = useQuery({
    queryKey: ['admin', 'feature-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_permissions')
        .select('*')
        .order('min_subscription', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolios</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.portfolios || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.transactions || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tracked Assets</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.assets || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Features</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{featurePermissions?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Permissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Permissions</CardTitle>
          <CardDescription>Configure feature access by subscription tier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left text-sm font-medium">Feature</th>
                  <th className="p-3 text-left text-sm font-medium">Key</th>
                  <th className="p-3 text-left text-sm font-medium">Min. Tier</th>
                  <th className="p-3 text-left text-sm font-medium">Admin Only</th>
                </tr>
              </thead>
              <tbody>
                {featurePermissions?.map((permission) => (
                  <tr key={permission.id} className="border-b">
                    <td className="p-3 text-sm">{permission.feature_name}</td>
                    <td className="p-3 text-sm font-mono text-muted-foreground">
                      {permission.feature_key}
                    </td>
                    <td className="p-3">
                      <Badge variant={
                        permission.min_subscription === 'free' ? 'secondary' :
                        permission.min_subscription === 'pro' ? 'default' : 'destructive'
                      }>
                        {permission.min_subscription}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {permission.admin_only && (
                        <Badge variant="outline">Admin</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Admin() {
  const { isAllowed, isLoading, isAuthenticated } = useRequireAdmin();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAllowed) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <Shield className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground text-center max-w-md">
            You don't have permission to access the admin panel. 
            This area is restricted to administrators only.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-muted-foreground">
              System configuration and management
            </p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2">
              <Shield className="h-4 w-4" />
              Permissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminDashboard />
          </TabsContent>

          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle>Role-Based Access Control</CardTitle>
                <CardDescription>
                  Manage user roles and feature permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium mb-2">Available Roles</h3>
                    <div className="flex gap-2">
                      <Badge variant="outline">user</Badge>
                      <Badge variant="default">admin</Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium mb-2">Subscription Tiers</h3>
                    <div className="flex gap-2">
                      <Badge variant="secondary">free</Badge>
                      <Badge variant="default">pro</Badge>
                      <Badge variant="destructive">business</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}