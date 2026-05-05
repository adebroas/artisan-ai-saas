import { BusinessRule } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, List, AlertTriangle, Calendar } from 'lucide-react';

interface BusinessRulesProps {
  rules: BusinessRule;
}

const DAYS: Record<string, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
};

export function BusinessRulesBlock({ rules }: BusinessRulesProps) {
  return (
    <div className="space-y-6">
      {/* Horaires */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Horaires d'ouverture</h3>
        </div>
        <div className="space-y-2">
          {Object.entries(DAYS).map(([key, label]) => {
            const hours = rules.openingHours[key];
            return (
              <div key={key} className="flex items-center justify-between py-1 border-b last:border-0">
                <span className="text-sm text-muted-foreground w-24">{label}</span>
                {hours ? (
                  <span className="text-sm font-medium">
                    {hours.open} — {hours.close}
                  </span>
                ) : (
                  <Badge variant="outline" className="text-xs">Fermé</Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Types de demandes */}
      {rules.supportedRequestTypes?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <List className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Types de demandes supportées</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {rules.supportedRequestTypes.map((type) => (
              <Badge key={type} variant="secondary">{type}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Règles d'urgence */}
      {rules.urgencyRules?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Règles d'urgence</h3>
          </div>
          <div className="space-y-2">
            {rules.urgencyRules.map((rule, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border p-2">
                <span className="text-sm">"{rule.keyword}"</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {rule.urgency}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Règles RDV */}
      {rules.appointmentRules && Object.keys(rules.appointmentRules).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Règles de rendez-vous</h3>
          </div>
          <div className="space-y-2">
            {rules.appointmentRules.defaultDuration && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Durée par défaut</span>
                <span className="font-medium">{rules.appointmentRules.defaultDuration} min</span>
              </div>
            )}
            {rules.appointmentRules.minAdvanceHours && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Délai minimum</span>
                <span className="font-medium">{rules.appointmentRules.minAdvanceHours}h à l'avance</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message de fermeture */}
      {rules.closingMessage && (
        <div className="rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground mb-1">Message de fermeture</p>
          <p className="text-sm italic">"{rules.closingMessage}"</p>
        </div>
      )}
    </div>
  );
}