'use client';

import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDate, getInitials } from '@/lib/utils';
import type { User } from '@/types';

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  super_admin: { label: 'Super Admin', className: 'bg-red-100 text-red-700 border-red-200' },
  admin: { label: 'Admin', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  operator: { label: 'Opérateur', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  viewer: { label: 'Lecteur', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export default function UsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await apiClient.get('/users');
      return data;
    },
  });

  const users: User[] = Array.isArray(data) ? data : data?.data ?? [];

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Utilisateur',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(row.firstName, row.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">
              {row.firstName} {row.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rôle',
      cell: (row) => {
        const config = ROLE_CONFIG[row.role] ?? { label: row.role, className: '' };
        return (
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
        );
      },
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
    {
      key: 'lastLogin',
      header: 'Dernière connexion',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.lastLoginAt ? formatDate(row.lastLoginAt) : 'Jamais'}
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
        title="Utilisateurs"
        description="Gestion des accès au back-office"
      />

      {!isLoading && users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun utilisateur"
          description="Les utilisateurs apparaîtront ici."
        />
      ) : (
        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
          emptyMessage="Aucun utilisateur trouvé"
        />
      )}
    </div>
  );
}