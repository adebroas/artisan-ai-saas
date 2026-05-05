'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, User, Phone, FileText } from 'lucide-react';
import { appointmentsApi } from '@/lib/api/appointments';
import { useBusiness } from '@/hooks/use-business';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AppointmentStatusBadge } from '@/components/shared/status-badge';
import { AppointmentForm } from '@/features/appointments/appointment-form';
import { formatDate, customerFullName } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

const DEMO_BUSINESS_ID = 'biz-demo-001';

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id ?? DEMO_BUSINESS_ID;
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: appointment, isLoading } = useQuery({
    queryKey: ['appointment', businessId, id],
    queryFn: () => appointmentsApi.findOne(businessId, id),
    enabled: !!id,
  });

  const { mutateAsync: updateAppointment, isPending } = useMutation({
    mutationFn: (data: any) => appointmentsApi.update(businessId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment', businessId, id] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Rendez-vous mis à jour');
      setSheetOpen(false);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Rendez-vous introuvable</p>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4">Retour</Button>
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
          <h1 className="text-2xl font-bold">{appointment.title}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(appointment.startAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AppointmentStatusBadge status={appointment.status} />
          <Button variant="outline" onClick={() => setSheetOpen(true)}>
            Modifier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Détails */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Début</p>
                  <p className="text-sm font-medium">{formatDate(appointment.startAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Fin</p>
                  <p className="text-sm font-medium">{formatDate(appointment.endAt)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Source</p>
                <Badge variant="outline">
                  {appointment.source === 'ai_agent'
                    ? '🤖 Créé par IA'
                    : appointment.source === 'manual'
                    ? '👤 Manuel'
                    : '📅 Sync calendrier'}
                </Badge>
              </div>
            </div>

            {appointment.description && (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm">{appointment.description}</p>
                </div>
              </div>
            )}

            {appointment.notes && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground mb-1">Notes internes</p>
                <p className="text-sm">{appointment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Client */}
          {appointment.customer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {customerFullName(appointment.customer)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm">{appointment.customer.phone}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => router.push(`/customers/${appointment.customer!.id}`)}
                >
                  Voir la fiche client
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Appel lié */}
          {appointment.callSession && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Appel associé</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => router.push(`/calls/${appointment.callSession!.id}`)}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Voir l'appel
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Sheet modification */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Modifier le rendez-vous</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <AppointmentForm
              defaultValues={appointment}
              onSubmit={updateAppointment}
              isLoading={isPending}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}