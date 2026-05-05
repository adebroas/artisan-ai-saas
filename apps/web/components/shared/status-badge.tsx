import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CallStatus, UrgencyLevel, AppointmentStatus, IntegrationStatus } from '@/types';

// ─── Call Status ─────────────────────────────────────────────
const callStatusConfig: Record<CallStatus, { label: string; className: string }> = {
  initiated: { label: 'Initié', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  in_progress: { label: 'En cours', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  completed: { label: 'Terminé', className: 'bg-green-100 text-green-700 border-green-200' },
  failed: { label: 'Échoué', className: 'bg-red-100 text-red-700 border-red-200' },
  abandoned: { label: 'Abandonné', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  transferred: { label: 'Transféré', className: 'bg-purple-100 text-purple-700 border-purple-200' },
};

// ─── Urgency Level ────────────────────────────────────────────
const urgencyConfig: Record<UrgencyLevel, { label: string; className: string }> = {
  none: { label: 'Aucune', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  low: { label: 'Faible', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  medium: { label: 'Moyenne', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  high: { label: 'Haute', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  critical: { label: 'Critique', className: 'bg-red-100 text-red-700 border-red-200' },
};

// ─── Appointment Status ───────────────────────────────────────
const appointmentStatusConfig: Record<AppointmentStatus, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  confirmed: { label: 'Confirmé', className: 'bg-green-100 text-green-700 border-green-200' },
  cancelled: { label: 'Annulé', className: 'bg-red-100 text-red-700 border-red-200' },
  completed: { label: 'Terminé', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  no_show: { label: 'Absent', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

// ─── Integration Status ───────────────────────────────────────
const integrationStatusConfig: Record<IntegrationStatus, { label: string; className: string }> = {
  active: { label: 'Actif', className: 'bg-green-100 text-green-700 border-green-200' },
  inactive: { label: 'Inactif', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  error: { label: 'Erreur', className: 'bg-red-100 text-red-700 border-red-200' },
  pending_auth: { label: 'Auth requise', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
};

export function CallStatusBadge({ status }: { status: CallStatus }) {
  const config = callStatusConfig[status];
  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}

export function UrgencyBadge({ level }: { level: UrgencyLevel }) {
  const config = urgencyConfig[level];
  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const config = appointmentStatusConfig[status];
  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}

export function IntegrationStatusBadge({ status }: { status: IntegrationStatus }) {
  const config = integrationStatusConfig[status];
  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}