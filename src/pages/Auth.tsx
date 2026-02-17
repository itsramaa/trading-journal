import { useState, useEffect } from 'react';
import deriverseLogo from '@/assets/deriverse-logo.png';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingUp, ArrowLeft, Mail, CheckCircle, Wallet } from 'lucide-react';
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton';

function WalletConnectCard() {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm mb-4">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Solana Wallet</span>
          </div>
          <WalletConnectButton />
        </div>
      </CardContent>
    </Card>
  );
}

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const newPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
type NewPasswordFormData = z.infer<typeof newPasswordSchema>;

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, signInWithGoogle, resetPassword, updatePassword, isAuthenticated, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  // Check if user is coming from password reset email
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'recovery') {
      setIsRecoveryMode(true);
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signInWithGoogle();
    setIsLoading(false);
  };

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const resetForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '' },
  });

  const newPasswordForm = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (isAuthenticated && !isRecoveryMode) {
      navigate('/');
    }
  }, [isAuthenticated, navigate, isRecoveryMode]);

  const handleSignIn = async (data: SignInFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);
    if (!error) {
      navigate('/');
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.fullName);
    setIsLoading(false);
    if (!error) {
      signUpForm.reset();
    }
  };

  const handleResetPassword = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    const { error } = await resetPassword(data.email);
    setIsLoading(false);
    if (!error) {
      setResetEmailSent(true);
    }
  };

  const handleUpdatePassword = async (data: NewPasswordFormData) => {
    setIsLoading(true);
    const { error } = await updatePassword(data.password);
    setIsLoading(false);
    if (!error) {
      setPasswordUpdated(true);
      setIsRecoveryMode(false);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // New Password Form (after clicking reset link)
  if (isRecoveryMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-primary/10">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Deriverse</h1>
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Set New Password</CardTitle>
              <CardDescription>Enter your new password below</CardDescription>
            </CardHeader>
            <CardContent>
              {passwordUpdated ? (
                <div className="text-center space-y-4 py-4">
                  <div className="flex justify-center">
                    <div className="p-3 rounded-full bg-green-500/10">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <p className="text-muted-foreground">
                    Password updated successfully! Redirecting...
                  </p>
                </div>
              ) : (
                <Form {...newPasswordForm}>
                  <form onSubmit={newPasswordForm.handleSubmit(handleUpdatePassword)} className="space-y-4">
                    <FormField
                      control={newPasswordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              {...field} 
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={newPasswordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              {...field} 
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Password'
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Forgot Password Form
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-primary/10">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Deriverse</h1>
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-fit -ml-2 mb-2"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmailSent(false);
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
              <CardTitle className="text-xl">Reset Password</CardTitle>
              <CardDescription>
                {resetEmailSent 
                  ? "Check your email for the reset link" 
                  : "Enter your email to receive a password reset link"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetEmailSent ? (
                <div className="text-center space-y-4 py-4">
                  <div className="flex justify-center">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Mail className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We've sent a password reset link to your email address. 
                    Please check your inbox and follow the instructions.
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      setResetEmailSent(false);
                      resetForm.reset();
                    }}
                  >
                    Send another email
                  </Button>
                </div>
              ) : (
                <Form {...resetForm}>
                  <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
                    <FormField
                      control={resetForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="you@example.com" 
                              {...field} 
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Premium Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Layered gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-primary/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/8 rounded-full blur-[100px]" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />

        <div className="relative z-10 flex flex-col justify-between px-12 xl:px-16 py-12 w-full">
          {/* Logo */}
           <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-primary/10 border border-primary/20 glow-primary overflow-hidden">
              <img src={deriverseLogo} alt="Deriverse" className="h-8 w-8 object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Deriverse</h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Analytics Platform</p>
            </div>
          </div>

          {/* Hero content */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl xl:text-5xl font-bold text-foreground leading-tight tracking-tight">
                Trade Smarter.
                <br />
                <span className="text-primary">Grow Faster.</span>
              </h2>
              <p className="text-muted-foreground mt-5 text-lg leading-relaxed max-w-md">
                Your all-in-one trading journal with AI insights, risk analytics, and on-chain data import.
              </p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '📊', title: 'P&L Tracking', desc: 'Real-time performance & drawdown' },
                { icon: '🧠', title: 'AI Insights', desc: 'Pattern recognition & scoring' },
                { icon: '🔗', title: 'On-Chain Import', desc: 'Deriverse & Solana DEXs' },
                { icon: '🛡️', title: 'Risk Metrics', desc: 'Sharpe, VaR, Kelly & more' },
              ].map((feature) => (
                <div key={feature.title} className="p-4 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-colors">
                  <div className="text-xl mb-2">{feature.icon}</div>
                  <p className="font-semibold text-sm text-foreground">{feature.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-8">
              {[
                { value: '50+', label: 'Metrics' },
                { value: '6', label: 'DEXs' },
                { value: '5', label: 'Risk Models' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-primary">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground">
            Built on Solana • Open Source • Trusted by traders
          </p>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 glow-primary">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Deriverse</h1>
            <p className="text-muted-foreground mt-1 text-sm">Professional Trading Analytics</p>
          </div>

          {/* Solana Wallet Connect */}
          <WalletConnectCard />

          <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
              <CardDescription>Sign in to your account or create a new one</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <div className="space-y-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11"
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Continue with Google
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border/50" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-3 text-muted-foreground">Or continue with</span>
                      </div>
                    </div>

                    <Form {...signInForm}>
                      <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                        <FormField
                          control={signInForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="you@example.com" className="h-11" {...field} disabled={isLoading} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={signInForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>Password</FormLabel>
                                <Button type="button" variant="link" className="px-0 h-auto text-xs text-primary" onClick={() => setShowForgotPassword(true)}>
                                  Forgot password?
                                </Button>
                              </div>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" className="h-11" {...field} disabled={isLoading} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={isLoading}>
                          {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>) : 'Sign In'}
                        </Button>
                      </form>
                    </Form>
                  </div>
                </TabsContent>

                <TabsContent value="signup">
                  <div className="space-y-4">
                    <Button type="button" variant="outline" className="w-full h-11" onClick={handleGoogleSignIn} disabled={isLoading}>
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Continue with Google
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border/50" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-3 text-muted-foreground">Or continue with</span>
                      </div>
                    </div>

                    <Form {...signUpForm}>
                      <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                        <FormField control={signUpForm.control} name="fullName" render={({ field }) => (
                          <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" className="h-11" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={signUpForm.control} name="email" render={({ field }) => (
                          <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="you@example.com" className="h-11" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={signUpForm.control} name="password" render={({ field }) => (
                          <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" className="h-11" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={signUpForm.control} name="confirmPassword" render={({ field }) => (
                          <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" className="h-11" {...field} disabled={isLoading} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={isLoading}>
                          {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</>) : 'Create Account'}
                        </Button>
                      </form>
                    </Form>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
