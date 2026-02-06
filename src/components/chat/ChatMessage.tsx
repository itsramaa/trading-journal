import React from 'react';
import ReactMarkdown from 'react-markdown';
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
        {role === 'user' ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="text-sm">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                code: ({ children }) => (
                  <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-background/50 p-3 rounded text-xs overflow-x-auto my-2 font-mono">
                    {children}
                  </pre>
                ),
                h1: ({ children }) => <h1 className="text-lg font-bold my-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold my-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold my-1.5">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-primary/50 pl-3 my-2 italic text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
