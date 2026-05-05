'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { appointmentsApi } from '@/lib/api/appointments';
import { useBusiness } from '@/hooks/use-business';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { AppointmentStatusBadge } from '@/components/shared/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatDate, customerFullName } from '@/lib/utils';
import type { Appointment } from '@/types';

const DEMO_BUSINESS_ID = 'biz-demo-001';

export default function AppointmentsPage() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id ?? DEMO_BUSINESS_ID;

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', businessId, page, status],
    queryFn: () => appointmentsApi.findAll(businessId, {
      page,
      limit: 20,
      ...(status !== 'all' && { status }),
    }),
  });

  const columns: Column<Appointment>[] = [
    {
      key: 'title',
      header: 'Titre',
      cell: (row) => (
        <div>
          <p className="font-medium text-sm">{row.title}</p>
          {row.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Client',
      cell: (row) => (
        <span className="text-sm">
          {row.customer ? customerFullName(row.customer) : '—'}
        </span>
      ),
    },
    {
      key: 'startAt',
      header: 'Début',
      cell: (row) => (
        <span className="text-sm">{formatDate(row.startAt)}</span>
      ),
    },
    {
      key: 'endAt',
      header: 'Fin',
      cell: (row) => (
        <span className="text-sm">{formatDate(row.endAt)}</span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      cell: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.source === 'ai_agent' ? '🤖 IA' : row.source === 'manual' ? '👤 Manuel' : '📅 Sync'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (row) => <AppointmentStatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rendez-vous"
        description="Tous les rendez-vous créés par l'IA ou manuellement"
      />

      {/* Filtres */}
      <div className="flex gap-3">
        <Select value={status} onValueChange={(v) => { setStatus(v ?? 'all'); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="confirmed">Confirmé</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
            <SelectItem value="no_show">Absent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {!isLoading && data?.data.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Aucun rendez-vous"
          description="Les rendez-vous créés par l'IA apparaîtront ici."
        />
      ) : (
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          page={page}
          totalPages={data?.totalPages}
          onPageChange={setPage}
          onRowClick={(row) => router.push(`/appointments/${row.id}`)}
        />
      )}
    </div>
  );
}