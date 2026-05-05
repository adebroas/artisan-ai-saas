import { CallExtractedData } from '@/types';
import { UrgencyBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/utils';
import { MapPin, Phone, User, FileText, Calendar, Target } from 'lucide-react';

interface CallExtractedDataBlockProps {
  data: CallExtractedData;
}

interface DataRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}

function DataRow({ icon, label, value }: DataRowProps) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export function CallExtractedDataBlock({ data }: CallExtractedDataBlockProps) {
  const fullName = [data.callerFirstName, data.callerLastName].filter(Boolean).join(' ');

  return (
    <div className="space-y-4">
      <DataRow
        icon={<User className="h-4 w-4" />}
        label="Nom du client"
        value={fullName || null}
      />
      <DataRow
        icon={<Phone className="h-4 w-4" />}
        label="Téléphone"
        value={data.callerPhone}
      />
      <DataRow
        icon={<MapPin className="h-4 w-4" />}
        label="Adresse"
        value={data.callerAddress}
      />
      <DataRow
        icon={<FileText className="h-4 w-4" />}
        label="Problème"
        value={data.problemDescription}
      />
      <DataRow
        icon={<Target className="h-4 w-4" />}
        label="Intention détectée"
        value={data.detectedIntent}
      />
      {data.confirmedSlot && (
        <DataRow
          icon={<Calendar className="h-4 w-4" />}
          label="Créneau confirmé"
          value={formatDate(data.confirmedSlot)}
        />
      )}
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">
          <Target className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Urgence détectée</p>
          <UrgencyBadge level={data.urgencyLevel} />
        </div>
      </div>
    </div>
  );
}