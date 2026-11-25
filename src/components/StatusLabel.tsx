import React from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Stethoscope,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type { AppointmentStatus } from '../types/booking';

interface StatusLabelProps {
  status: AppointmentStatus;
}

const STATUS_CONFIG: Record<
  AppointmentStatus,
  {
    label: string;
    textClass: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  scheduled: {
    label: 'Scheduled',
    textClass: 'text-slate-700',
    Icon: CalendarClock,
  },
  checked_in: {
    label: 'Checked In',
    textClass: 'text-amber-700',
    Icon: UserCheck,
  },
  in_consultation: {
    label: 'In Consultation',
    textClass: 'text-teal-800',
    Icon: Stethoscope,
  },
  completed: {
    label: 'Completed',
    textClass: 'text-emerald-700',
    Icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    textClass: 'text-rose-700',
    Icon: XCircle,
  },
};

export const StatusLabel: React.FC<StatusLabelProps> = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
  const { Icon, label, textClass } = config;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${textClass}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
