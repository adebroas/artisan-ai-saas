'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { integrationsApi } from '@/lib/api/integrations';
import { useBusiness } from '@/hooks/use-business';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { IntegrationStatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Integration } from '@/types';

const DEMO_BUSINESS_ID = 'biz-demo-001';

const INTEGRATION_CONFIG: Record<string, { label: string; description: string; icon: string }> = {
  google_calendar: {
    label: 'Google Calendar',
    description: 'Synchronise les rendez-vous avec Google Calendar',
    icon: '📅',
  },
  outlook_calendar: {
    label: 'Outlook Calendar',
    description: 'Synchronise les rendez-vous avec Outlook',
    icon: '📆',
  },
  email_smtp: {
    label: 'Email SMTP',
    description: 'Envoi de confirmations par email',
    icon: '📧',
  },
  webhook_crm: {
    label: 'Webhook CRM',
    description: 'Envoie les données vers votre CRM',
    icon: '🔗',
  },
  twilio: {
    label: 'Twilio',
    description: 'Gestion des appels téléphoniques',
    icon: '📞',
  },
  telnyx: {
    label: 'Telnyx',
    description: 'Opérateur téléphonique alternatif',
    icon: '📱',
  },
  deepgram: {
    label: 'Deepgram',
    description: 'Transcription audio des appels',
    icon: '🎙️',
  },
  elevenlabs: {
    label: 'ElevenLabs',
    description: 'Synthèse vocale pour l\'IA',
    icon: '🔊',
  },
};

export default function IntegrationsPage() {
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id ?? DEMO_BUSINESS_ID;

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations', businessId],
    queryFn: () => integrationsApi.findAll(businessId),
  });

  const { mutate: toggleIntegration } = useMutation({
    mutationFn: (id: string) => integrationsApi.toggle(businessId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', businessId] });
      toast.success('Intégration mise à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Intégrations" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const integrationsMap = new Map(
    (integrations ?? []).map((i: Integration) => [i.type, i]),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intégrations"
        description="Connectez vos outils externes à Artisan AI"
      />

      {!integrations || integrations.length === 0 ? (
        <EmptyState
          icon={Settings}
          title="Aucune intégration"
          description="Configurez vos intégrations pour connecter vos outils."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Object.entries(INTEGRATION_CONFIG).map(([type, config]) => {
            const integration = integrationsMap.get(type as any);
            const isActive = integration?.status === 'active';

            return (
              <Card key={type}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{config.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{config.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {config.description}
                        </p>
                        {integration && (
                          <div className="mt-2">
                            <IntegrationStatusBadge status={integration.status} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {integration ? (
                        <Switch
                          checked={isActive}
                          onCheckedChange={() => toggleIntegration(integration.id)}
                        />
                      ) : (
                        <Button variant="outline" size="sm">
                          Configurer
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}