import React from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  ModeIcon: React.ElementType;
}

export function ChatMessage({ role, content, ModeIcon }: ChatMessageProps) {
  return (
    <div className={cn("flex gap-3", role === 'user' && "flex-row-reverse")}>
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
        role === 'user' ? "bg-primary text-primary-foreground" : "bg-primary/10"
      )}>
        {role === 'user' ? (
          <User className="h-4 w-4" />
        ) : (
          <ModeIcon className="h-4 w-4 text-primary" />
        )}
      </div>
      <div className={cn(
        "flex-1 rounded-lg p-3 max-w-[85%]",
        role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
