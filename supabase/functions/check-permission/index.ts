import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type AppRole = 'admin' | 'user';
type SubscriptionTier = 'free' | 'pro' | 'business';

interface PermissionCheckResult {
  allowed: boolean;
  user_id: string | null;
  subscription: SubscriptionTier;
  roles: AppRole[];
  reason?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ allowed: false, reason: 'No authorization header' } as PermissionCheckResult),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for RLS bypass
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create user client to verify the token
    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the user from the token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ allowed: false, user_id: null, reason: 'Invalid token' } as PermissionCheckResult),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { feature_key, min_tier } = await req.json();

    // Get user roles using admin client (bypasses RLS)
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const userRoles = roles?.map(r => r.role as AppRole) || ['user'];
    const isAdmin = userRoles.includes('admin');

    // Get user subscription
    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('subscription_plan, subscription_status, plan_expires_at')
      .eq('user_id', user.id)
      .single();

    let subscription: SubscriptionTier = 'free';
    if (settings) {
      const isActive = settings.subscription_status === 'active';
      const notExpired = !settings.plan_expires_at || new Date(settings.plan_expires_at) > new Date();
      if (isActive && notExpired) {
        subscription = settings.subscription_plan as SubscriptionTier;
      }
    }

    // Admin bypass - admins have all permissions
    if (isAdmin) {
      return new Response(
        JSON.stringify({
          allowed: true,
          user_id: user.id,
          subscription,
          roles: userRoles,
        } as PermissionCheckResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check feature permission if provided
    if (feature_key) {
      const { data: permission } = await supabaseAdmin
        .from('feature_permissions')
        .select('*')
        .eq('feature_key', feature_key)
        .single();

      if (!permission) {
        return new Response(
          JSON.stringify({
            allowed: false,
            user_id: user.id,
            subscription,
            roles: userRoles,
            reason: 'Feature not found',
          } as PermissionCheckResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if admin-only
      if (permission.admin_only) {
        return new Response(
          JSON.stringify({
            allowed: false,
            user_id: user.id,
            subscription,
            roles: userRoles,
            reason: 'Admin only feature',
          } as PermissionCheckResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check subscription tier
      const tierOrder: Record<SubscriptionTier, number> = { free: 0, pro: 1, business: 2 };
      const hasRequiredTier = tierOrder[subscription] >= tierOrder[permission.min_subscription as SubscriptionTier];

      return new Response(
        JSON.stringify({
          allowed: hasRequiredTier,
          user_id: user.id,
          subscription,
          roles: userRoles,
          reason: hasRequiredTier ? undefined : `Requires ${permission.min_subscription} subscription`,
        } as PermissionCheckResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check minimum tier if provided
    if (min_tier) {
      const tierOrder: Record<SubscriptionTier, number> = { free: 0, pro: 1, business: 2 };
      const hasRequiredTier = tierOrder[subscription] >= tierOrder[min_tier as SubscriptionTier];

      return new Response(
        JSON.stringify({
          allowed: hasRequiredTier,
          user_id: user.id,
          subscription,
          roles: userRoles,
          reason: hasRequiredTier ? undefined : `Requires ${min_tier} subscription`,
        } as PermissionCheckResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No specific check - just return user info
    return new Response(
      JSON.stringify({
        allowed: true,
        user_id: user.id,
        subscription,
        roles: userRoles,
      } as PermissionCheckResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Permission check error:', error);
    return new Response(
      JSON.stringify({ 
        allowed: false, 
        reason: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
