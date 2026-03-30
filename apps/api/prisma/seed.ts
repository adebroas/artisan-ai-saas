import * as dotenv from 'dotenv';
dotenv.config();

import {
  PrismaClient,
  CallStatus,
  AppointmentStatus,
  AppointmentSource,
  IntegrationType,
  IntegrationStatus,
  UserRole,
  BusinessTrade,
  Speaker,
  UrgencyLevel,
  AuditAction,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Business ────────────────────────────────────────────────
  const business = await prisma.business.upsert({
    where: { id: 'biz-demo-001' },
    update: {},
    create: {
      id: 'biz-demo-001',
      name: 'Plomberie Dupont & Fils',
      trade: BusinessTrade.plumber,
      email: 'contact@plomberie-dupont.fr',
      phone: '+33612345678',
      address: '12 rue de la République',
      city: 'Marseille',
      postalCode: '13001',
      timezone: 'Europe/Paris',
      welcomeMessage: 'Bonjour, vous avez contacté la Plomberie Dupont. Comment puis-je vous aider ?',
      isActive: true,
    },
  });

  // ─── Users ───────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);

  const owner = await prisma.user.upsert({
    where: { email: 'arnaud@plomberie-dupont.fr' },
    update: {},
    create: {
      email: 'arnaud@plomberie-dupont.fr',
      passwordHash,
      firstName: 'Arnaud',
      lastName: 'Dupont',
      role: UserRole.admin,
      isActive: true,
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: 'sophie@plomberie-dupont.fr' },
    update: {},
    create: {
      email: 'sophie@plomberie-dupont.fr',
      passwordHash,
      firstName: 'Sophie',
      lastName: 'Martin',
      role: UserRole.operator,
      isActive: true,
    },
  });

  // ─── Business Rules ──────────────────────────────────────────
  await prisma.businessRule.upsert({
    where: { businessId: business.id },
    update: {},
    create: {
      businessId: business.id,
      openingHours: {
        monday: { open: '08:00', close: '18:00' },
        tuesday: { open: '08:00', close: '18:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday: { open: '08:00', close: '18:00' },
        friday: { open: '08:00', close: '17:00' },
        saturday: { open: '09:00', close: '12:00' },
        sunday: null,
      },
      supportedRequestTypes: ['fuite', 'installation', 'dépannage', 'devis', 'chauffe-eau'],
      urgencyRules: [
        { keyword: 'fuite', urgency: 'high' },
        { keyword: 'dégât', urgency: 'critical' },
      ],
      requiredFields: ['callerPhone', 'address', 'problemDescription'],
      appointmentRules: { defaultDuration: 60, minAdvanceHours: 2 },
    },
  });

  // ─── Phone Number ─────────────────────────────────────────────
  await prisma.businessPhoneNumber.upsert({
    where: { id: 'phone-001' },
    update: {},
    create: {
      id: 'phone-001',
      businessId: business.id,
      number: '+33800123456',
      label: 'Ligne principale',
      isActive: true,
      isPrimary: true,
    },
  });

  // ─── Customers ────────────────────────────────────────────────
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { businessId_phone: { businessId: business.id, phone: '+33698765432' } },
      update: {},
      create: {
        id: 'cust-001',
        businessId: business.id,
        phone: '+33698765432',
        firstName: 'Jean',
        lastName: 'Leroy',
        email: 'jean.leroy@gmail.com',
        city: 'Marseille',
        postalCode: '13006',
        notes: 'Client fidèle depuis 2021. Préfère les appels en matinée.',
      },
    }),
    prisma.customer.upsert({
      where: { businessId_phone: { businessId: business.id, phone: '+33654321987' } },
      update: {},
      create: {
        id: 'cust-002',
        businessId: business.id,
        phone: '+33654321987',
        firstName: 'Marie',
        lastName: 'Bernard',
        email: 'marie.bernard@hotmail.fr',
        city: 'Marseille',
        postalCode: '13008',
        notes: 'Copropriété résidence Les Pins.',
      },
    }),
    prisma.customer.upsert({
      where: { businessId_phone: { businessId: business.id, phone: '+33611223344' } },
      update: {},
      create: {
        id: 'cust-003',
        businessId: business.id,
        phone: '+33611223344',
        firstName: 'Pierre',
        lastName: 'Moreau',
        email: 'p.moreau@entreprise.com',
        city: 'Aix-en-Provence',
      },
    }),
  ]);

  // ─── Call Sessions ────────────────────────────────────────────
  const now = new Date();

  const calls = await Promise.all([
    prisma.callSession.upsert({
      where: { id: 'call-001' },
      update: {},
      create: {
        id: 'call-001',
        businessId: business.id,
        customerId: customers[0].id,
        callerNumber: customers[0].phone,
        calledNumber: '+33800123456',
        status: CallStatus.completed,
        urgencyLevel: UrgencyLevel.high,
        outcome: 'appointment_created',
        durationSeconds: 245,
        startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        endedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 245 * 1000),
      },
    }),
    prisma.callSession.upsert({
      where: { id: 'call-002' },
      update: {},
      create: {
        id: 'call-002',
        businessId: business.id,
        customerId: customers[1].id,
        callerNumber: customers[1].phone,
        calledNumber: '+33800123456',
        status: CallStatus.abandoned,
        urgencyLevel: UrgencyLevel.none,
        startedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      },
    }),
    prisma.callSession.upsert({
      where: { id: 'call-003' },
      update: {},
      create: {
        id: 'call-003',
        businessId: business.id,
        customerId: customers[2].id,
        callerNumber: customers[2].phone,
        calledNumber: '+33800123456',
        status: CallStatus.completed,
        urgencyLevel: UrgencyLevel.low,
        outcome: 'appointment_created',
        durationSeconds: 180,
        startedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        endedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000 + 180 * 1000),
      },
    }),
  ]);

  // ─── Call Messages ────────────────────────────────────────────
  await prisma.callMessage.createMany({
    skipDuplicates: true,
    data: [
      { callSessionId: calls[0].id, speaker: Speaker.assistant, text: "Bonjour, Plomberie Dupont, que puis-je faire pour vous ?", offsetMs: 0 },
      { callSessionId: calls[0].id, speaker: Speaker.caller, text: "Bonjour, j'ai une fuite sous mon évier, c'est urgent.", offsetMs: 3000 },
      { callSessionId: calls[0].id, speaker: Speaker.assistant, text: "Je comprends, nous allons envoyer un plombier. Quelle est votre adresse ?", offsetMs: 6000 },
      { callSessionId: calls[0].id, speaker: Speaker.caller, text: '15 avenue du Prado, Marseille 6ème.', offsetMs: 10000 },
      { callSessionId: calls[0].id, speaker: Speaker.assistant, text: "Parfait. Un technicien sera chez vous dans l'heure.", offsetMs: 14000 },
      { callSessionId: calls[2].id, speaker: Speaker.assistant, text: "Bonjour, Plomberie Dupont, comment puis-je vous aider ?", offsetMs: 0 },
      { callSessionId: calls[2].id, speaker: Speaker.caller, text: "Je voudrais prendre rendez-vous pour un devis salle de bain.", offsetMs: 4000 },
      { callSessionId: calls[2].id, speaker: Speaker.assistant, text: "Bien sûr ! Êtes-vous disponible jeudi prochain en matinée ?", offsetMs: 7000 },
      { callSessionId: calls[2].id, speaker: Speaker.caller, text: "Oui, jeudi 10h c'est parfait.", offsetMs: 11000 },
    ],
  });

  // ─── Call Summaries ───────────────────────────────────────────
  await prisma.callSummary.upsert({
    where: { callSessionId: calls[0].id },
    update: {},
    create: {
      callSessionId: calls[0].id,
      shortSummary: "Fuite sous l'évier signalée. Intervention urgente programmée au 15 av. du Prado, 13006 Marseille.",
      structuredSummary: { intent: 'urgence_fuite', urgency: 'high', address: '15 avenue du Prado, 13006 Marseille' },
      recommendedAction: "Envoyer un technicien dans l'heure",
      tags: ['urgence', 'fuite', 'intervention'],
      outcome: 'appointment_created',
    },
  });

  await prisma.callSummary.upsert({
    where: { callSessionId: calls[2].id },
    update: {},
    create: {
      callSessionId: calls[2].id,
      shortSummary: 'Demande de devis pour rénovation salle de bain. RDV jeudi à 10h00.',
      structuredSummary: { intent: 'devis_sdb', urgency: 'low' },
      recommendedAction: 'Confirmer le RDV par SMS',
      tags: ['devis', 'salle de bain', 'rdv'],
      outcome: 'appointment_created',
    },
  });

  // ─── Call Extracted Data ──────────────────────────────────────
  await prisma.callExtractedData.upsert({
    where: { callSessionId: calls[0].id },
    update: {},
    create: {
      callSessionId: calls[0].id,
      callerFirstName: 'Jean',
      callerLastName: 'Leroy',
      callerPhone: customers[0].phone,
      callerAddress: '15 avenue du Prado, 13006 Marseille',
      problemDescription: "Fuite d'eau sous l'évier de cuisine",
      urgencyLevel: UrgencyLevel.high,
      detectedIntent: 'urgence_fuite',
      customerType: 'particulier',
    },
  });

  // ─── Appointments ─────────────────────────────────────────────
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(11, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 0, 0, 0);
  const nextWeekEnd = new Date(nextWeek);
  nextWeekEnd.setHours(15, 30, 0, 0);

  await Promise.all([
    prisma.appointment.upsert({
      where: { id: 'appt-001' },
      update: {},
      create: {
        id: 'appt-001',
        businessId: business.id,
        customerId: customers[0].id,
        callSessionId: calls[0].id,
        title: 'Intervention fuite évier',
        description: 'Fuite sous évier cuisine. Apporter joints et flexibles.',
        startAt: tomorrow,
        endAt: tomorrowEnd,
        status: AppointmentStatus.confirmed,
        source: AppointmentSource.ai_agent,
        notes: 'Accès par la porte de service.',
      },
    }),
    prisma.appointment.upsert({
      where: { id: 'appt-002' },
      update: {},
      create: {
        id: 'appt-002',
        businessId: business.id,
        customerId: customers[2].id,
        callSessionId: calls[2].id,
        title: 'Devis rénovation salle de bain',
        startAt: nextWeek,
        endAt: nextWeekEnd,
        status: AppointmentStatus.pending,
        source: AppointmentSource.ai_agent,
      },
    }),
  ]);

  // ─── Integrations ─────────────────────────────────────────────
  await prisma.integration.upsert({
    where: { businessId_type: { businessId: business.id, type: IntegrationType.google_calendar } },
    update: {},
    create: {
      businessId: business.id,
      type: IntegrationType.google_calendar,
      status: IntegrationStatus.active,
      label: 'Google Calendar principal',
      config: { calendarId: 'primary', syncDirection: 'bidirectional' },
    },
  });

  // ─── Audit Logs ───────────────────────────────────────────────
  await prisma.auditLog.createMany({
    skipDuplicates: true,
    data: [
      {
        businessId: business.id,
        userId: owner.id,
        action: AuditAction.create,
        entity: 'Business',
        entityId: business.id,
        after: { name: business.name },
      },
      {
        businessId: business.id,
        userId: owner.id,
        action: AuditAction.create,
        entity: 'User',
        entityId: operator.id,
        after: { role: 'operator' },
      },
      {
        businessId: business.id,
        userId: owner.id,
        action: AuditAction.create,
        entity: 'Customer',
        entityId: customers[0].id,
        after: { phone: customers[0].phone },
      },
    ],
  });

  console.log('✅ Seed completed!');
  console.log(`   Business : ${business.name}`);
  console.log(`   Users    : ${owner.email} / ${operator.email}  (password: password123)`);
  console.log(`   Customers: ${customers.length}`);
  console.log(`   Calls    : ${calls.length}`);
  console.log(`   Appts    : 2`);
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());