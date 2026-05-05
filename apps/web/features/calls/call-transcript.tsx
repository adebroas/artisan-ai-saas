'use client';

import { CallMessage } from '@/types';
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';

interface CallTranscriptProps {
  messages: CallMessage[];
}

export function CallTranscript({ messages }: CallTranscriptProps) {
  if (!messages || messages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Aucun transcript disponible
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const isAssistant = message.speaker === 'assistant';
        return (
          <div
            key={message.id ?? index}
            className={cn(
              'flex gap-3',
              isAssistant ? 'flex-row' : 'flex-row-reverse',
            )}
          >
            {/* Avatar */}
            <div className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
              isAssistant ? 'bg-primary/10' : 'bg-muted',
            )}>
              {isAssistant
                ? <Bot className="h-4 w-4 text-primary" />
                : <User className="h-4 w-4 text-muted-foreground" />
              }
            </div>

            {/* Bulle */}
            <div className={cn(
              'max-w-[75%] space-y-1',
              isAssistant ? 'items-start' : 'items-end',
            )}>
              <div className={cn(
                'rounded-2xl px-4 py-2.5 text-sm',
                isAssistant
                  ? 'bg-muted text-foreground rounded-tl-sm'
                  : 'bg-primary text-primary-foreground rounded-tr-sm',
              )}>
                {message.text}
              </div>
              {message.offsetMs !== null && message.offsetMs !== undefined && (
                <p className="text-xs text-muted-foreground px-1">
                  {Math.floor(message.offsetMs / 1000)}s
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}