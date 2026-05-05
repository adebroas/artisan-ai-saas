'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Mail, MapPin, FileText, Calendar } from 'lucide-react';
import { customersApi } from '@/lib/api/customers';
import { useBusiness } from '@/hooks/use-business';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CallStatusBadge, UrgencyBadge } from '@/components/shared/status-badge';
import { CustomerForm } from '@/features/customers/customer-form';
import { formatDate, formatDuration, formatPhone, customerFullName } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useState } from 'react';

const DEMO_BUSINESS_ID = 'biz-demo-001';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id ?? DEMO_BUSINESS_ID;
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', businessId, id],
    queryFn: () => customersApi.findOne(businessId, id),
    enabled: !!id,
  });

  const { mutateAsync: updateCustomer, isPending } = useMutation({
    mutationFn: (data: any) => customersApi.update(businessId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', businessId, id] });
      toast.success('Client mis à jour');
      setSheetOpen(false);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Client introuvable</p>
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
          <h1 className="text-2xl font-bold">{customerFullName(customer)}</h1>
          <p className="text-sm text-muted-foreground">
            Client depuis le {formatDate(customer.createdAt, 'dd/MM/yyyy')}
          </p>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <Button variant="outline" onClick={() => setSheetOpen(true)}>
            Modifier
          </Button>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Modifier le client</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <CustomerForm
                defaultValues={customer}
                onSubmit={updateCustomer}
                isLoading={isPending}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Infos client */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{formatPhone(customer.phone)}</span>
            </div>
            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{customer.email}</span>
              </div>
            )}
            {(customer.address || customer.city) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-sm">
                  {[customer.address, customer.city, customer.postalCode]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}
            {customer.notes && (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-sm text-muted-foreground">{customer.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appels récents */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Appels récents</CardTitle>
          </CardHeader>
          <CardContent>
            {!customer.calls || customer.calls.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun appel enregistré
              </p>
            ) : (
              <div className="space-y-2">
                {customer.calls.map((call: any) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/calls/${call.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{formatDate(call.startedAt)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(call.durationSeconds)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <UrgencyBadge level={call.urgencyLevel} />
                      <CallStatusBadge status={call.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rendez-vous */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Rendez-vous</CardTitle>
          </CardHeader>
          <CardContent>
            {!customer.appointments || customer.appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun rendez-vous
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {customer.appointments.map((appt: any) => (
                  <div
                    key={appt.id}
                    className="rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/appointments/${appt.id}`)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">{appt.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(appt.startAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}