import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Defer profile creation with setTimeout
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            createProfileIfNotExists(session.user);
          }, 0);
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
    // Create user profile if it doesn't exist
    const { data: existingProfile } = await supabase
      .from('users_profile')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!existingProfile) {
      const fullname = user.user_metadata?.full_name || 
                       user.user_metadata?.name || 
                       user.email?.split('@')[0] || 
                       'User';
      
      await supabase.from('users_profile').insert({
        user_id: user.id,
        display_name: fullname,
        avatar_url: user.user_metadata?.avatar_url || null,
      });
    }

    // Create user settings if it doesn't exist
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!existingSettings) {
      await supabase.from('user_settings').insert({
        user_id: user.id,
        subscription_plan: 'free',
        subscription_status: 'active',
      });
    }
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

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    isAuthenticated: !!session,
  };
}
