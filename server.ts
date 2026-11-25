import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
  Department,
  Doctor,
  SlotAvailability,
  UpdateAppointmentInput,
  VisitType,
} from './src/types/booking.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'hospital-db.json');

const DEPARTMENTS: Department[] = [
  {
    id: 'cardiology',
    code: '01',
    name: 'Cardiology & Vascular Care',
    wing: 'East Pavilion',
    floor: 'Floor 3',
    phoneExt: 'Ext. 3100',
    description:
      'Preventive cardiac screening, echocardiography, arrhythmia diagnostics, and longitudinal hypertension management.',
    consultDurationMin: 30,
    baseFee: 240,
  },
  {
    id: 'orthopedics',
    code: '02',
    name: 'Orthopedics & Sports Medicine',
    wing: 'North Surgical Wing',
    floor: 'Floor 2',
    phoneExt: 'Ext. 2400',
    description:
      'Joint preservation, musculoskeletal diagnostics, spine evaluation, and post-injury rehabilitation planning.',
    consultDurationMin: 30,
    baseFee: 220,
  },
  {
    id: 'neurology',
    code: '03',
    name: 'Neurology & Headache Clinic',
    wing: 'West Clinical Tower',
    floor: 'Floor 4',
    phoneExt: 'Ext. 4200',
    description:
      'Comprehensive evaluation for migraine disorders, neuropathy, memory assessment, and neuromuscular care.',
    consultDurationMin: 30,
    baseFee: 260,
  },
  {
    id: 'pediatrics',
    code: '04',
    name: 'Pediatrics & Family Care',
    wing: 'South Garden Wing',
    floor: 'Floor 1',
    phoneExt: 'Ext. 1150',
    description:
      'Well-child developmental exams, immunizations, acute pediatric visits, and adolescent preventive care.',
    consultDurationMin: 30,
    baseFee: 180,
  },
];

const DOCTORS: Doctor[] = [
  {
    id: 'doc-jenkins',
    name: 'Dr. Sarah Jenkins',
    credentials: 'MD, FACC',
    departmentId: 'cardiology',
    specialtyFocus: 'Preventive Cardiology & Echocardiography',
    bio: 'Board-certified cardiologist specializing in non-invasive imaging, lipid management, and early cardiovascular risk assessment.',
    imagePath: '/src/assets/images/doctor_elena_rostova_1795611014204.jpg',
    room: 'East Pavilion, Suite 304',
    languages: ['English', 'French'],
    experienceYears: 14,
    consultFee: 240,
    workingDays: [1, 2, 3, 4, 5, 6],
    dailySlots: [
      '08:30',
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
    ],
  },
  {
    id: 'doc-tanaka',
    name: 'Dr. Kenji Tanaka',
    credentials: 'MD, FAAOS',
    departmentId: 'orthopedics',
    specialtyFocus: 'Sports Orthopedics & Joint Preservation',
    bio: 'Attending orthopedic specialist focused on arthroscopic knee and shoulder care, tendon recovery, and non-surgical joint stabilization.',
    imagePath: '/src/assets/images/doctor_marcus_chen_1795611014743.jpg',
    room: 'North Wing, Suite 212',
    languages: ['English', 'Japanese'],
    experienceYears: 16,
    consultFee: 220,
    workingDays: [1, 2, 3, 4, 5, 6],
    dailySlots: [
      '08:30',
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:30',
      '16:00',
    ],
  },
  {
    id: 'doc-adebayo',
    name: 'Dr. Adesuwa Adebayo',
    credentials: 'MD, PhD',
    departmentId: 'neurology',
    specialtyFocus: 'Clinical Neurology & Migraine Therapy',
    bio: 'Neurologist leading diagnostic headache protocols, nerve conduction review, and cognitive wellness consultations.',
    imagePath: '/src/assets/images/doctor_amara_osei_1795611013794.jpg',
    room: 'West Tower, Suite 408',
    languages: ['English', 'Yoruba'],
    experienceYears: 12,
    consultFee: 260,
    workingDays: [1, 2, 3, 4, 5],
    dailySlots: [
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:30',
    ],
  },
  {
    id: 'doc-ramos',
    name: 'Dr. Alejandro Ramos',
    credentials: 'MD, FAAP',
    departmentId: 'pediatrics',
    specialtyFocus: 'General Pediatrics & Developmental Care',
    bio: 'Pediatrician providing calm, thorough newborn-to-adolescent care, respiratory management, and annual school physicals.',
    imagePath: '/src/assets/images/doctor_david_alvarez_1795611013953.jpg',
    room: 'Garden Wing, Suite 105',
    languages: ['English', 'Spanish'],
    experienceYears: 18,
    consultFee: 180,
    workingDays: [1, 2, 3, 4, 5, 6],
    dailySlots: [
      '08:30',
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
      '15:00',
      '16:00',
    ],
  },
];

function formatDateLocal(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, days: number): string {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return formatDateLocal(copy);
}

function createInitialAppointments(): Appointment[] {
  const now = new Date();
  const today = formatDateLocal(now);
  const tomorrow = addDays(now, 1);
  const inTwoDays = addDays(now, 2);
  const timestamp = now.toISOString();

  return [
    {
      id: 'apt-1001',
      referenceCode: 'MRD-4108',
      doctorId: 'doc-jenkins',
      departmentId: 'cardiology',
      date: today,
      timeSlot: '09:00',
      visitType: 'in_person',
      status: 'completed',
      patientName: 'Claire Bennett',
      patientEmail: 'claire.bennett@example.com',
      patientPhone: '(415) 555-0142',
      dateOfBirth: '1978-04-12',
      insuranceProvider: 'BlueCross BlueShield',
      insuranceMemberId: 'BCB-8834102',
      reasonForVisit: 'Annual blood pressure follow-up and resting ECG review.',
      triageNotes: 'Vitals stable (122/78 mmHg). Medication refilled for 90 days.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'apt-1002',
      referenceCode: 'MRD-4112',
      doctorId: 'doc-tanaka',
      departmentId: 'orthopedics',
      date: today,
      timeSlot: '09:30',
      visitType: 'in_person',
      status: 'in_consultation',
      patientName: 'Daniel Okafor',
      patientEmail: 'd.okafor@example.com',
      patientPhone: '(415) 555-0189',
      dateOfBirth: '1986-09-23',
      insuranceProvider: 'Aetna PPO',
      insuranceMemberId: 'AET-5591024',
      reasonForVisit: 'Right knee stiffness following half-marathon training.',
      triageNotes: 'MRI CD uploaded at front desk. Escorted to Exam Room 212-B.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'apt-1003',
      referenceCode: 'MRD-4119',
      doctorId: 'doc-adebayo',
      departmentId: 'neurology',
      date: today,
      timeSlot: '10:30',
      visitType: 'in_person',
      status: 'checked_in',
      patientName: 'Hannah Lindqvist',
      patientEmail: 'hannah.l@example.com',
      patientPhone: '(415) 555-0164',
      dateOfBirth: '1991-01-19',
      insuranceProvider: 'UnitedHealthcare',
      insuranceMemberId: 'UHC-7712945',
      reasonForVisit: 'Recurring unilateral migraines with visual aura over 6 weeks.',
      triageNotes: 'Patient arrived 10:15 AM. Headache diary attached.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'apt-1004',
      referenceCode: 'MRD-4125',
      doctorId: 'doc-ramos',
      departmentId: 'pediatrics',
      date: today,
      timeSlot: '11:00',
      visitType: 'in_person',
      status: 'scheduled',
      patientName: 'Mateo Silva',
      patientEmail: 'sofia.silva@example.com',
      patientPhone: '(415) 555-0193',
      dateOfBirth: '2018-07-08',
      insuranceProvider: 'Kaiser Permanente',
      insuranceMemberId: 'KP-3049182',
      reasonForVisit: 'Annual school wellness physical and seasonal booster.',
      triageNotes: 'Parent confirmed immunization card ready.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'apt-1005',
      referenceCode: 'MRD-4130',
      doctorId: 'doc-jenkins',
      departmentId: 'cardiology',
      date: today,
      timeSlot: '14:00',
      visitType: 'telehealth',
      status: 'scheduled',
      patientName: 'Robert Morales',
      patientEmail: 'r.morales@example.com',
      patientPhone: '(415) 555-0127',
      dateOfBirth: '1965-11-30',
      insuranceProvider: 'Medicare Part B',
      insuranceMemberId: 'MED-9921048',
      reasonForVisit: 'Cholesterol panel lab review and statin dosage check.',
      triageNotes: 'Quest Diagnostics lipid panel received.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'apt-1006',
      referenceCode: 'MRD-4138',
      doctorId: 'doc-tanaka',
      departmentId: 'orthopedics',
      date: tomorrow,
      timeSlot: '10:00',
      visitType: 'in_person',
      status: 'scheduled',
      patientName: 'Nadia Kowalski',
      patientEmail: 'nadia.k@example.com',
      patientPhone: '(415) 555-0155',
      dateOfBirth: '1982-03-14',
      insuranceProvider: 'Cigna Open Access',
      insuranceMemberId: 'CIG-4412098',
      reasonForVisit: 'Left rotator cuff soreness and limited overhead mobility.',
      triageNotes: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'apt-1007',
      referenceCode: 'MRD-4144',
      doctorId: 'doc-adebayo',
      departmentId: 'neurology',
      date: inTwoDays,
      timeSlot: '14:30',
      visitType: 'telehealth',
      status: 'scheduled',
      patientName: 'Samuel Brooks',
      patientEmail: 's.brooks@example.com',
      patientPhone: '(415) 555-0171',
      dateOfBirth: '1974-08-05',
      insuranceProvider: 'BlueCross BlueShield',
      insuranceMemberId: 'BCB-6620194',
      reasonForVisit: 'Follow-up consultation for carpal tunnel nerve study results.',
      triageNotes: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

interface HospitalStore {
  appointments: Appointment[];
}

function loadStore(): HospitalStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as HospitalStore;
      if (Array.isArray(parsed?.appointments)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read hospital-db.json, initializing fresh seed:', err);
  }

  const seeded: HospitalStore = { appointments: createInitialAppointments() };
  saveStore(seeded);
  return seeded;
}

function saveStore(store: HospitalStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error('Failed to persist hospital-db.json:', err);
  }
}

function computeSlotsForDoctorDate(
  doctor: Doctor,
  dateStr: string,
  appointments: Appointment[],
  excludeAppointmentId?: string
): SlotAvailability[] {
  const [year, month, day] = dateStr.split('-').map(Number);
  const parsedDate = new Date(year, (month || 1) - 1, day || 1);
  const dayOfWeek = parsedDate.getDay();

  if (!doctor.workingDays.includes(dayOfWeek)) {
    return [];
  }

  const activeBookings = appointments.filter(
    (apt) =>
      apt.doctorId === doctor.id &&
      apt.date === dateStr &&
      apt.status !== 'cancelled' &&
      apt.id !== excludeAppointmentId
  );

  return doctor.dailySlots.map((time) => {
    const match = activeBookings.find((apt) => apt.timeSlot === time);
    return {
      time,
      available: !match,
      appointmentId: match?.id,
    };
  });
}

function generateReferenceCode(existing: Appointment[]): string {
  const used = new Set(existing.map((a) => a.referenceCode));
  for (let i = 0; i < 20; i++) {
    const num = Math.floor(1000 + Math.random() * 9000);
    const code = `MRD-${num}`;
    if (!used.has(code)) return code;
  }
  return `MRD-${Date.now().toString().slice(-4)}`;
}

const VALID_STATUSES: AppointmentStatus[] = [
  'scheduled',
  'checked_in',
  'in_consultation',
  'completed',
  'cancelled',
];

const VALID_VISIT_TYPES: VisitType[] = ['in_person', 'telehealth'];

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const store = loadStore();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/bootstrap', (_req, res) => {
    const sorted = [...store.appointments].sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return a.timeSlot.localeCompare(b.timeSlot);
    });
    res.json({
      departments: DEPARTMENTS,
      doctors: DOCTORS,
      appointments: sorted,
      today: formatDateLocal(new Date()),
    });
  });

  app.get('/api/appointments', (req, res) => {
    const { status, date, doctorId, q } = req.query;
    let items = [...store.appointments];

    if (typeof status === 'string' && status !== 'all') {
      items = items.filter((a) => a.status === status);
    }
    if (typeof date === 'string' && date.trim()) {
      items = items.filter((a) => a.date === date.trim());
    }
    if (typeof doctorId === 'string' && doctorId !== 'all') {
      items = items.filter((a) => a.doctorId === doctorId);
    }
    if (typeof q === 'string' && q.trim()) {
      const term = q.trim().toLowerCase();
      items = items.filter(
        (a) =>
          a.patientName.toLowerCase().includes(term) ||
          a.referenceCode.toLowerCase().includes(term) ||
          a.patientEmail.toLowerCase().includes(term) ||
          a.reasonForVisit.toLowerCase().includes(term)
      );
    }

    items.sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return a.timeSlot.localeCompare(b.timeSlot);
    });

    res.json({ appointments: items });
  });

  app.get('/api/slots', (req, res) => {
    const doctorId = typeof req.query.doctorId === 'string' ? req.query.doctorId : '';
    const date = typeof req.query.date === 'string' ? req.query.date : '';
    const excludeAppointmentId =
      typeof req.query.excludeAppointmentId === 'string'
        ? req.query.excludeAppointmentId
        : undefined;

    if (!doctorId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Valid doctorId and YYYY-MM-DD date are required.' });
    }

    const doctor = DOCTORS.find((d) => d.id === doctorId);
    if (!doctor) {
      return res.status(404).json({ error: 'Specialist not found.' });
    }

    const slots = computeSlotsForDoctorDate(doctor, date, store.appointments, excludeAppointmentId);
    return res.json({ doctorId, date, slots });
  });

  app.post('/api/appointments', (req, res) => {
    const body = req.body as Partial<CreateAppointmentInput>;

    const doctor = DOCTORS.find((d) => d.id === body.doctorId);
    if (!doctor) {
      return res.status(400).json({ error: 'Please select a valid specialist.' });
    }

    const date = typeof body.date === 'string' ? body.date.trim() : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Please select a valid appointment date.' });
    }

    const timeSlot = typeof body.timeSlot === 'string' ? body.timeSlot.trim() : '';
    if (!doctor.dailySlots.includes(timeSlot)) {
      return res.status(400).json({ error: 'Selected time slot is outside clinic hours.' });
    }

    const slots = computeSlotsForDoctorDate(doctor, date, store.appointments);
    const targetSlot = slots.find((s) => s.time === timeSlot);
    if (!targetSlot) {
      return res.status(400).json({ error: 'Specialist is not scheduled on the selected date.' });
    }
    if (!targetSlot.available) {
      return res.status(409).json({
        error: 'This time slot was just booked by another patient. Please choose another time.',
      });
    }

    const visitType: VisitType =
      body.visitType && VALID_VISIT_TYPES.includes(body.visitType) ? body.visitType : 'in_person';

    const patientName = typeof body.patientName === 'string' ? body.patientName.trim() : '';
    const patientEmail = typeof body.patientEmail === 'string' ? body.patientEmail.trim() : '';
    const patientPhone = typeof body.patientPhone === 'string' ? body.patientPhone.trim() : '';
    const dateOfBirth = typeof body.dateOfBirth === 'string' ? body.dateOfBirth.trim() : '';
    const insuranceProvider =
      typeof body.insuranceProvider === 'string' && body.insuranceProvider.trim()
        ? body.insuranceProvider.trim()
        : 'Self-Pay / Uninsured';
    const insuranceMemberId =
      typeof body.insuranceMemberId === 'string' ? body.insuranceMemberId.trim() : '';
    const reasonForVisit =
      typeof body.reasonForVisit === 'string' ? body.reasonForVisit.trim() : '';

    if (patientName.length < 2 || patientName.length > 100) {
      return res.status(400).json({ error: 'Patient full name is required (2–100 characters).' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (patientPhone.length < 7 || patientPhone.length > 30) {
      return res.status(400).json({ error: 'Please enter a valid phone number.' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      return res.status(400).json({ error: 'Please provide patient date of birth.' });
    }
    if (reasonForVisit.length < 3 || reasonForVisit.length > 500) {
      return res
        .status(400)
        .json({ error: 'Please provide a brief reason for visit (3–500 characters).' });
    }

    const nowIso = new Date().toISOString();
    const newAppointment: Appointment = {
      id: `apt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      referenceCode: generateReferenceCode(store.appointments),
      doctorId: doctor.id,
      departmentId: doctor.departmentId,
      date,
      timeSlot,
      visitType,
      status: 'scheduled',
      patientName,
      patientEmail,
      patientPhone,
      dateOfBirth,
      insuranceProvider,
      insuranceMemberId,
      reasonForVisit,
      triageNotes: '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    store.appointments.push(newAppointment);
    saveStore(store);

    return res.status(201).json({ appointment: newAppointment });
  });

  app.patch('/api/appointments/:id', (req, res) => {
    const { id } = req.params;
    const index = store.appointments.findIndex((a) => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    const current = store.appointments[index];
    const body = req.body as UpdateAppointmentInput;
    const doctor = DOCTORS.find((d) => d.id === current.doctorId);
    if (!doctor) {
      return res.status(400).json({ error: 'Associated specialist record not found.' });
    }

    let nextDate = current.date;
    let nextTimeSlot = current.timeSlot;
    let nextStatus = current.status;
    let nextVisitType = current.visitType;
    let nextTriageNotes = current.triageNotes;

    if (body.date !== undefined || body.timeSlot !== undefined) {
      nextDate = typeof body.date === 'string' ? body.date.trim() : current.date;
      nextTimeSlot = typeof body.timeSlot === 'string' ? body.timeSlot.trim() : current.timeSlot;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
        return res.status(400).json({ error: 'Valid YYYY-MM-DD date is required to reschedule.' });
      }
      if (!doctor.dailySlots.includes(nextTimeSlot)) {
        return res.status(400).json({ error: 'Selected time slot is outside clinic hours.' });
      }

      const slots = computeSlotsForDoctorDate(doctor, nextDate, store.appointments, current.id);
      const slotMatch = slots.find((s) => s.time === nextTimeSlot);
      if (!slotMatch) {
        return res.status(400).json({ error: 'Specialist is not available on that day of week.' });
      }
      if (!slotMatch.available) {
        return res.status(409).json({
          error: 'The requested reschedule slot is already booked.',
        });
      }
      if (current.status === 'cancelled') {
        nextStatus = 'scheduled';
      }
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return res.status(400).json({ error: 'Invalid appointment status.' });
      }
      nextStatus = body.status;
    }

    if (body.visitType !== undefined) {
      if (!VALID_VISIT_TYPES.includes(body.visitType)) {
        return res.status(400).json({ error: 'Invalid visit type.' });
      }
      nextVisitType = body.visitType;
    }

    if (body.triageNotes !== undefined) {
      nextTriageNotes = String(body.triageNotes).slice(0, 1000);
    }

    const updated: Appointment = {
      ...current,
      date: nextDate,
      timeSlot: nextTimeSlot,
      status: nextStatus,
      visitType: nextVisitType,
      triageNotes: nextTriageNotes,
      updatedAt: new Date().toISOString(),
    };

    store.appointments[index] = updated;
    saveStore(store);

    return res.json({ appointment: updated });
  });

  app.delete('/api/appointments/:id', (req, res) => {
    const { id } = req.params;
    const index = store.appointments.findIndex((a) => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }
    store.appointments.splice(index, 1);
    saveStore(store);
    return res.json({ deleted: true, id });
  });

  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(__dirname, 'dist');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Meridian Health booking server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
