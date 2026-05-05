'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Appointment } from '@/types';

const schema = z.object({
  title: z.string().min(1, 'Titre requis'),
  startAt: z.string().min(1, 'Date de début requise'),
  endAt: z.string().min(1, 'Date de fin requise'),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof schema>;

interface AppointmentFormProps {
  defaultValues?: Partial<Appointment>;
  onSubmit: (data: AppointmentFormData) => Promise<any>;
  isLoading?: boolean;
}

function toDatetimeLocal(dateStr?: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().slice(0, 16);
}

export function AppointmentForm({ defaultValues, onSubmit, isLoading }: AppointmentFormProps) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<AppointmentFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      startAt: toDatetimeLocal(defaultValues?.startAt),
      endAt: toDatetimeLocal(defaultValues?.endAt),
      status: defaultValues?.status ?? 'pending',
      description: defaultValues?.description ?? '',
      notes: defaultValues?.notes ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Titre *</Label>
        <Input placeholder="Intervention fuite évier" {...register('title')} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Début *</Label>
          <Input type="datetime-local" {...register('startAt')} />
          {errors.startAt && <p className="text-sm text-destructive">{errors.startAt.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Fin *</Label>
          <Input type="datetime-local" {...register('endAt')} />
          {errors.endAt && <p className="text-sm text-destructive">{errors.endAt.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Statut</Label>
        <Select
          value={watch('status')}
          onValueChange={(v) => setValue('status', v as any)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="confirmed">Confirmé</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
            <SelectItem value="no_show">Absent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          placeholder="Détails de l'intervention..."
          rows={3}
          {...register('description')}
        />
      </div>

      <div className="space-y-2">
        <Label>Notes internes</Label>
        <Textarea
          placeholder="Notes pour l'équipe..."
          rows={2}
          {...register('notes')}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enregistrement...
          </>
        ) : (
          'Enregistrer'
        )}
      </Button>
    </form>
  );
}