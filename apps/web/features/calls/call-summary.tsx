import { CallSummary } from '@/types';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Lightbulb, Tag } from 'lucide-react';

interface CallSummaryBlockProps {
  summary: CallSummary;
}

export function CallSummaryBlock({ summary }: CallSummaryBlockProps) {
  return (
    <div className="space-y-4">
      {/* Résumé court */}
      <div className="flex gap-3">
        <Lightbulb className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-sm leading-relaxed">{summary.shortSummary}</p>
      </div>

      {/* Action recommandée */}
      {summary.recommendedAction && (
        <div className="flex gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">{summary.recommendedAction}</p>
        </div>
      )}

      {/* Tags */}
      {summary.tags && summary.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="h-4 w-4 text-muted-foreground" />
          {summary.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}