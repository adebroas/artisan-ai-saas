'use client';

import { useQuery } from '@tanstack/react-query';
import { Phone, Users, Calendar, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { dashboardApi } from '@/lib/api/dashboard';
import { useBusiness } from '@/hooks/use-business';
import { StatCard } from '@/components/shared/stat-cards';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CallStatusBadge, UrgencyBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatDuration, customerFullName } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const DEMO_BUSINESS_ID = 'biz-demo-001';

export default function DashboardPage() {
  const router = useRouter();
  const { currentBusiness, setCurrentBusiness } = useBusiness();
  const businessId = currentBusiness?.id ?? DEMO_BUSINESS_ID;

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', businessId],
    queryFn: () => dashboardApi.getStats(businessId),
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-activity', businessId],
    queryFn: () => dashboardApi.getActivity(businessId),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Vue d'ensemble de votre activité"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : (
          <>
            <StatCard
              title="Appels ce mois"
              value={stats?.calls.thisMonth ?? 0}
              subtitle={`${stats?.calls.total ?? 0} au total`}
              icon={Phone}
              trend={{ value: stats?.calls.growth ?? 0, label: 'vs mois dernier' }}
              iconClassName="bg-blue-500"
            />
            <StatCard
              title="Appels abandonnés"
              value={stats?.calls.abandoned ?? 0}
              subtitle="Ce mois-ci"
              icon={AlertTriangle}
              iconClassName="bg-red-500"
            />
            <StatCard
              title="Clients total"
              value={stats?.customers.total ?? 0}
              subtitle={`+${stats?.customers.newThisMonth ?? 0} ce mois`}
              icon={Users}
              iconClassName="bg-green-500"
            />
            <StatCard
              title="RDV à venir"
              value={stats?.appointments.upcoming ?? 0}
              subtitle={`${stats?.appointments.thisMonth ?? 0} ce mois`}
              icon={Calendar}
              iconClassName="bg-purple-500"
            />
          </>
        )}
      </div>

      {/* Graphique + Durée moyenne */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Appels des 7 derniers jours</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-48" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.calls.daily ?? []}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => new Date(v).toLocaleDateString('fr', { weekday: 'short' })}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(v) => formatDate(v, 'dd/MM/yyyy')}
                    formatter={(value, name) => [
                      value,
                      name === 'total' ? 'Total' : 'Abandonnés',
                    ]}
                  />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="total" />
                  <Bar dataKey="abandoned" fill="#ef4444" radius={[4, 4, 0, 0]} name="abandoned" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Durée moyenne</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-48 gap-2">
            {statsLoading ? (
              <Skeleton className="h-16 w-24" />
            ) : (
              <>
                <Clock className="h-8 w-8 text-muted-foreground" />
                <p className="text-4xl font-bold">
                  {formatDuration(stats?.calls.avgDuration ?? 0)}
                </p>
                <p className="text-sm text-muted-foreground">par appel</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Derniers appels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Derniers appels</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : activity?.recentCalls.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun appel récent</p>
          ) : (
            <div className="space-y-2">
              {activity?.recentCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/calls/${call.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {call.customer
                          ? customerFullName(call.customer)
                          : call.callerNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(call.startedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <UrgencyBadge level={call.urgencyLevel} />
                    <CallStatusBadge status={call.status} />
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(call.durationSeconds)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}