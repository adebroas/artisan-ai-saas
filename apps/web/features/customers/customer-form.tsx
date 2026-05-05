'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import type { Customer } from '@/types';

const schema = z.object({
  phone: z.string().min(1, 'Téléphone requis'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof schema>;

interface CustomerFormProps {
  defaultValues?: Partial<Customer>;
  onSubmit: (data: CustomerFormData) => Promise<any>;
  isLoading?: boolean;
}

export function CustomerForm({ defaultValues, onSubmit, isLoading }: CustomerFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone: defaultValues?.phone ?? '',
      firstName: defaultValues?.firstName ?? '',
      lastName: defaultValues?.lastName ?? '',
      email: defaultValues?.email ?? '',
      address: defaultValues?.address ?? '',
      city: defaultValues?.city ?? '',
      postalCode: defaultValues?.postalCode ?? '',
      notes: defaultValues?.notes ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Prénom</Label>
          <Input placeholder="Jean" {...register('firstName')} />
        </div>
        <div className="space-y-2">
          <Label>Nom</Label>
          <Input placeholder="Dupont" {...register('lastName')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Téléphone *</Label>
        <Input placeholder="+33612345678" {...register('phone')} />
        {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input placeholder="jean@exemple.fr" {...register('email')} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Adresse</Label>
        <Input placeholder="15 rue de la Paix" {...register('address')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Ville</Label>
          <Input placeholder="Marseille" {...register('city')} />
        </div>
        <div className="space-y-2">
          <Label>Code postal</Label>
          <Input placeholder="13001" {...register('postalCode')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          placeholder="Informations complémentaires..."
          rows={3}
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