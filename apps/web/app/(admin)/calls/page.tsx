'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Phone } from 'lucide-react';
import { callsApi } from '@/lib/api/calls';
import { useBusiness } from '@/hooks/use-business';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { CallStatusBadge, UrgencyBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, formatDuration, customerFullName } from '@/lib/utils';
import type { CallSession, CallStatus, UrgencyLevel } from '@/types';

const DEMO_BUSINESS_ID = 'biz-demo-001';

export default function CallsPage() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id ?? DEMO_BUSINESS_ID;

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('all');
  const [urgency, setUrgency] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['calls', businessId, page, status, urgency],
    queryFn: () => callsApi.findAll(businessId, {
      page,
      limit: 20,
      ...(status !== 'all' && { status }),
      ...(urgency !== 'all' && { urgencyLevel: urgency }),
    }),
  });

  const columns: Column<CallSession>[] = [
    {
      key: 'caller',
      header: 'Appelant',
      cell: (row) => (
        <div>
          <p className="font-medium text-sm">
            {row.customer ? customerFullName(row.customer) : row.callerNumber}
          </p>
          {row.customer && (
            <p className="text-xs text-muted-foreground">{row.callerNumber}</p>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      cell: (row) => (
        <span className="text-sm">{formatDate(row.startedAt)}</span>
      ),
    },
    {
      key: 'duration',
      header: 'Durée',
      cell: (row) => (
        <span className="text-sm">{formatDuration(row.durationSeconds)}</span>
      ),
    },
    {
      key: 'urgency',
      header: 'Urgence',
      cell: (row) => <UrgencyBadge level={row.urgencyLevel} />,
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (row) => <CallStatusBadge status={row.status} />,
    },
    {
      key: 'outcome',
      header: 'Issue',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.outcome?.replace(/_/g, ' ') ?? '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appels"
        description="Historique de tous les appels traités par l'IA"
      />

      {/* Filtres */}
      <div className="flex gap-3">
        <Select value={status} onValueChange={(v) => setStatus(v ?? 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
            <SelectItem value="abandoned">Abandonné</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="transferred">Transféré</SelectItem>
            <SelectItem value="failed">Échoué</SelectItem>
          </SelectContent>
        </Select>

        <Select value={urgency} onValueChange={(v) => setUrgency(v ?? 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Urgence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes urgences</SelectItem>
            <SelectItem value="critical">Critique</SelectItem>
            <SelectItem value="high">Haute</SelectItem>
            <SelectItem value="medium">Moyenne</SelectItem>
            <SelectItem value="low">Faible</SelectItem>
            <SelectItem value="none">Aucune</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {!isLoading && data?.data.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="Aucun appel"
          description="Les appels traités par l'IA apparaîtront ici."
        />
      ) : (
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          page={page}
          totalPages={data?.totalPages}
          onPageChange={setPage}
          onRowClick={(row) => router.push(`/calls/${row.id}`)}
        />
      )}
    </div>
  );
}