'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { businessesApi } from '@/lib/api/businesses';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import type { Business } from '@/types';

const TRADE_LABELS: Record<string, string> = {
  plumber: '🔧 Plombier',
  heating_engineer: '🔥 Chauffagiste',
  electrician: '⚡ Électricien',
  locksmith: '🔑 Serrurier',
  roofer: '🏠 Couvreur',
  painter: '🎨 Peintre',
  carpenter: '🪚 Charpentier',
  tiler: '🪟 Carreleur',
  mason: '🧱 Maçon',
  general: '🛠️ Général',
};

export default function BusinessesPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => businessesApi.findAll({ limit: 50 }),
  });

  const columns: Column<Business>[] = [
    {
      key: 'name',
      header: 'Entreprise',
      cell: (row) => (
        <div>
          <p className="font-medium text-sm">{row.name}</p>
          {row.city && (
            <p className="text-xs text-muted-foreground">{row.city}</p>
          )}
        </div>
      ),
    },
    {
      key: 'trade',
      header: 'Métier',
      cell: (row) => (
        <span className="text-sm">{TRADE_LABELS[row.trade] ?? row.trade}</span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (row) => (
        <div>
          {row.email && <p className="text-sm">{row.email}</p>}
          {row.phone && <p className="text-xs text-muted-foreground">{row.phone}</p>}
        </div>
      ),
    },
    {
      key: 'timezone',
      header: 'Timezone',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.timezone}</span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      cell: (row) => (
        <Badge
          variant="outline"
          className={row.isActive
            ? 'bg-green-100 text-green-700 border-green-200'
            : 'bg-gray-100 text-gray-600 border-gray-200'
          }
        >
          {row.isActive ? 'Actif' : 'Inactif'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entreprises"
        description="Toutes les entreprises artisans configurées"
      />

      {!isLoading && data?.data.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune entreprise"
          description="Les entreprises configurées apparaîtront ici."
        />
      ) : (
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          page={1}
          totalPages={data?.totalPages}
          onRowClick={(row) => router.push(`/businesses/${row.id}`)}
        />
      )}
    </div>
  );
}