'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Clock, Calendar, User } from 'lucide-react';
import { callsApi } from '@/lib/api/calls';
import { useBusiness } from '@/hooks/use-business';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CallStatusBadge, UrgencyBadge } from '@/components/shared/status-badge';
import { CallTranscript } from '@/features/calls/call-transcript';
import { CallSummaryBlock } from '@/features/calls/call-summary';
import { CallExtractedDataBlock } from '@/features/calls/call-extracted-data';
import { formatDate, formatDuration, customerFullName } from '@/lib/utils';

const DEMO_BUSINESS_ID = 'biz-demo-001';

export default function CallDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id ?? DEMO_BUSINESS_ID;

  const { data: call, isLoading } = useQuery({
    queryKey: ['call', businessId, id],
    queryFn: () => callsApi.findOne(businessId, id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Appel introuvable</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {call.customer ? customerFullName(call.customer) : call.callerNumber}
          </h1>
          <p className="text-sm text-muted-foreground">{formatDate(call.startedAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <UrgencyBadge level={call.urgencyLevel} />
          <CallStatusBadge status={call.status} />
        </div>
      </div>

      {/* Infos rapides */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Numéro</p>
              <p className="text-sm font-medium">{call.callerNumber}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Durée</p>
              <p className="text-sm font-medium">{formatDuration(call.durationSeconds)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-sm font-medium">{formatDate(call.startedAt, 'dd/MM/yyyy')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Issue</p>
              <p className="text-sm font-medium capitalize">
                {call.outcome?.replace(/_/g, ' ') ?? '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Transcript */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Transcript de l'appel</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto">
            <CallTranscript messages={call.messages ?? []} />
          </CardContent>
        </Card>

        {/* Sidebar droite */}
        <div className="space-y-6">
          {/* Résumé */}
          {call.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Résumé IA</CardTitle>
              </CardHeader>
              <CardContent>
                <CallSummaryBlock summary={call.summary} />
              </CardContent>
            </Card>
          )}

          {/* Données extraites */}
          {call.extractedData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Données extraites</CardTitle>
              </CardHeader>
              <CardContent>
                <CallExtractedDataBlock data={call.extractedData} />
              </CardContent>
            </Card>
          )}

          {/* Client lié */}
          {call.customer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm font-medium">{customerFullName(call.customer)}</p>
                <p className="text-sm text-muted-foreground">{call.customer.phone}</p>
                {call.customer.email && (
                  <p className="text-sm text-muted-foreground">{call.customer.email}</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => router.push(`/customers/${call.customer!.id}`)}
                >
                  Voir la fiche client
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}