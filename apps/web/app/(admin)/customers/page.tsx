'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { customersApi } from '@/lib/api/customers';
import { useBusiness } from '@/hooks/use-business';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatPhone, customerFullName } from '@/lib/utils';
import type { Customer } from '@/types';

const DEMO_BUSINESS_ID = 'biz-demo-001';

export default function CustomersPage() {
  const router = useRouter();
  const { currentBusiness } = useBusiness();
  const businessId = currentBusiness?.id ?? DEMO_BUSINESS_ID;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customers', businessId, page, search],
    queryFn: () => customersApi.findAll(businessId, {
      page,
      limit: 20,
      ...(search && { search }),
    }),
  });

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Client',
      cell: (row) => (
        <div>
          <p className="font-medium text-sm">{customerFullName(row)}</p>
          <p className="text-xs text-muted-foreground">{formatPhone(row.phone)}</p>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.email ?? '—'}</span>
      ),
    },
    {
      key: 'city',
      header: 'Ville',
      cell: (row) => (
        <span className="text-sm">{row.city ?? '—'}</span>
      ),
    },
    {
      key: 'stats',
      header: 'Activité',
      cell: (row) => (
        <div className="flex gap-2">
          {row._count && (
            <>
              <Badge variant="outline" className="text-xs">
                {row._count.calls} appel{row._count.calls !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {row._count.appointments} RDV
              </Badge>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'lastContact',
      header: 'Dernier contact',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.lastContactAt ? formatDate(row.lastContactAt) : '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Créé le',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.createdAt, 'dd/MM/yyyy')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Base de données clients extraite des appels"
      />

      {/* Recherche */}
      <div className="flex gap-3">
        <Input
          placeholder="Rechercher par nom, téléphone, email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      {!isLoading && data?.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun client"
          description="Les clients identifiés lors des appels apparaîtront ici."
        />
      ) : (
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          page={page}
          totalPages={data?.totalPages}
          onPageChange={setPage}
          onRowClick={(row) => router.push(`/customers/${row.id}`)}
        />
      )}
    </div>
  );
}