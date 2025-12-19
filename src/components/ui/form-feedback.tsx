/**
 * Form Feedback Components for Nielsen Heuristics:
 * #1: Visibility of system status
 * #5: Error prevention
 * #9: Help users recognize, diagnose, and recover from errors
 */

import { CheckCircle2, XCircle, AlertCircle, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface FeedbackProps {
  className?: string;
  children: React.ReactNode;
}

// Success feedback
export function SuccessFeedback({ className, children }: FeedbackProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg bg-profit/10 p-3 text-sm text-profit",
        className
      )}
    >
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// Error feedback with recovery suggestion
interface ErrorFeedbackProps {
  className?: string;
  message: string;
  suggestion?: string;
  onRetry?: () => void;
}

export function ErrorFeedback({ className, message, suggestion, onRetry }: ErrorFeedbackProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-destructive/10 p-3 text-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 text-destructive">
        <XCircle className="h-4 w-4 shrink-0" />
        <span className="font-medium">{message}</span>
      </div>
      {suggestion && (
        <p className="mt-1.5 pl-6 text-destructive/80">{suggestion}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 pl-6 text-sm font-medium text-destructive underline-offset-4 hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// Warning feedback
export function WarningFeedback({ className, children }: FeedbackProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-500",
        className
      )}
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// Info feedback
export function InfoFeedback({ className, children }: FeedbackProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary",
        className
      )}
    >
      <Info className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// Loading indicator with optional progress
interface LoadingIndicatorProps {
  className?: string;
  message?: string;
  progress?: number;
}

export function LoadingIndicator({ className, message = "Loading...", progress }: LoadingIndicatorProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-8", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {typeof progress === "number" && (
        <Progress value={progress} className="w-48" />
      )}
    </div>
  );
}

// Inline field validation feedback
interface FieldValidationProps {
  isValid: boolean | null;
  validMessage?: string;
  invalidMessage?: string;
  className?: string;
}

export function FieldValidation({
  isValid,
  validMessage = "Looks good!",
  invalidMessage = "Please check this field",
  className,
}: FieldValidationProps) {
  if (isValid === null) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs mt-1",
        isValid ? "text-profit" : "text-destructive",
        className
      )}
    >
      {isValid ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      <span>{isValid ? validMessage : invalidMessage}</span>
    </div>
  );
}

// Password strength indicator
interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const getStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score: 20, label: "Weak", color: "bg-destructive" };
    if (score <= 2) return { score: 40, label: "Fair", color: "bg-yellow-500" };
    if (score <= 3) return { score: 60, label: "Good", color: "bg-chart-4" };
    if (score <= 4) return { score: 80, label: "Strong", color: "bg-profit" };
    return { score: 100, label: "Very Strong", color: "bg-profit" };
  };

  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className={cn("space-y-1.5 mt-2", className)}>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Password strength</span>
        <span className="font-medium">{strength.label}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-300", strength.color)}
          style={{ width: `${strength.score}%` }}
        />
      </div>
    </div>
  );
}
