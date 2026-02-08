import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Prevent multiple profile creation calls in same session
  const profileCreatedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Defer profile creation with setTimeout, with ref guard
        if (event === 'SIGNED_IN' && session?.user) {
          const userId = session.user.id;
          if (!profileCreatedRef.current.has(userId)) {
            profileCreatedRef.current.add(userId);
            setTimeout(() => {
              createProfileIfNotExists(session.user);
            }, 0);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const createProfileIfNotExists = async (user: User) => {
    const fullname = user.user_metadata?.full_name || 
                     user.user_metadata?.name || 
                     user.email?.split('@')[0] || 
                     'User';

    // Use upsert with onConflict to prevent duplicates - all operations are idempotent
    // These will insert if not exists, or do nothing if already exists
    
    await supabase.from('users_profile').upsert({
      user_id: user.id,
      display_name: fullname,
      avatar_url: user.user_metadata?.avatar_url || null,
    }, { onConflict: 'user_id', ignoreDuplicates: true });

    await supabase.from('user_settings').upsert({
      user_id: user.id,
      subscription_plan: 'free',
      subscription_status: 'active',
    }, { onConflict: 'user_id', ignoreDuplicates: true });

    // Create default trading account (type: trading)
    await supabase.from('accounts').upsert({
      user_id: user.id,
      name: 'Trading Account',
      account_type: 'trading',
      balance: 0,
      currency: 'USD',
      is_system: true,
      is_active: true,
      description: 'Default trading account for crypto/forex trading',
      metadata: JSON.stringify({
        broker: null,
        account_number: null,
        is_backtest: false,
        initial_balance: 0,
      }),
    }, { onConflict: 'user_id,name,account_type', ignoreDuplicates: true });

    // Welcome notification - use upsert to prevent 409 conflict
    // DB has partial unique index, but we use upsert for cleaner handling
    await supabase.from('notifications').upsert({
      user_id: user.id,
      type: 'system',
      title: 'Welcome to Portfolio Manager!',
      message: 'Your account is set up. Start by adding your first asset or account.',
      read: false,
    }, { 
      onConflict: 'user_id,type,title',
      ignoreDuplicates: true 
    });
  };

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      let errorMessage = error.message;
      
      // Handle specific error cases
      if (error.message.includes('already registered') || error.message.includes('duplicate')) {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (error.message.includes('invalid')) {
        errorMessage = 'Please enter a valid email address.';
      }
      
      toast({
        title: 'Sign up failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return { error };
    }

    // Check if user already exists (Supabase returns user but no session for existing unconfirmed users)
    if (data?.user && !data?.session && data.user.identities?.length === 0) {
      toast({
        title: 'Email already registered',
        description: 'This email is already registered. Please sign in or check your email for verification.',
        variant: 'destructive',
      });
      return { error: new Error('Email already registered') };
    }

    toast({
      title: 'Account created',
      description: 'Please check your email to verify your account.',
    });

    return { data, error: null };
  }, [toast]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    toast({
      title: 'Welcome back!',
      description: 'You have successfully signed in.',
    });

    return { data, error: null };
  }, [toast]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast({
        title: 'Google sign in failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    return { error: null };
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast({
        title: 'Sign out failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    toast({
      title: 'Signed out',
      description: 'You have been signed out successfully.',
    });

    return { error: null };
  }, [toast]);

  const resetPassword = useCallback(async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth?type=recovery`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      toast({
        title: 'Password reset failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    toast({
      title: 'Password reset email sent',
      description: 'Please check your email for a password reset link.',
    });

    return { error: null };
  }, [toast]);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: 'Password update failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    toast({
      title: 'Password updated',
      description: 'Your password has been successfully updated.',
    });

    return { error: null };
  }, [toast]);

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    isAuthenticated: !!session,
  };
}
