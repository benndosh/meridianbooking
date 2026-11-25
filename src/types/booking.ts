export type DepartmentId = 'cardiology' | 'orthopedics' | 'neurology' | 'pediatrics';

export type VisitType = 'in_person' | 'telehealth';

export type AppointmentStatus =
  | 'scheduled'
  | 'checked_in'
  | 'in_consultation'
  | 'completed'
  | 'cancelled';

export interface Department {
  id: DepartmentId;
  code: string;
  name: string;
  wing: string;
  floor: string;
  phoneExt: string;
  description: string;
  consultDurationMin: number;
  baseFee: number;
}

export interface Doctor {
  id: string;
  name: string;
  credentials: string;
  departmentId: DepartmentId;
  specialtyFocus: string;
  bio: string;
  imagePath: string;
  room: string;
  languages: string[];
  experienceYears: number;
  consultFee: number;
  workingDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  dailySlots: string[]; // HH:mm 24-hour format
}

export interface Appointment {
  id: string;
  referenceCode: string;
  doctorId: string;
  departmentId: DepartmentId;
  date: string; // YYYY-MM-DD
  timeSlot: string; // HH:mm
  visitType: VisitType;
  status: AppointmentStatus;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  dateOfBirth: string;
  insuranceProvider: string;
  insuranceMemberId: string;
  reasonForVisit: string;
  triageNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SlotAvailability {
  time: string;
  available: boolean;
  appointmentId?: string;
}

export interface BootstrapPayload {
  departments: Department[];
  doctors: Doctor[];
  appointments: Appointment[];
  today: string;
}

export interface CreateAppointmentInput {
  doctorId: string;
  date: string;
  timeSlot: string;
  visitType: VisitType;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  dateOfBirth: string;
  insuranceProvider: string;
  insuranceMemberId: string;
  reasonForVisit: string;
}

export interface UpdateAppointmentInput {
  status?: AppointmentStatus;
  date?: string;
  timeSlot?: string;
  visitType?: VisitType;
  triageNotes?: string;
}
