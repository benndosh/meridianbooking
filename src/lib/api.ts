import type {
  Appointment,
  BootstrapPayload,
  CreateAppointmentInput,
  SlotAvailability,
  UpdateAppointmentInput,
} from '../types/booking';

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed with status ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export async function fetchBootstrap(): Promise<BootstrapPayload> {
  const res = await fetch('/api/bootstrap');
  return parseJsonResponse<BootstrapPayload>(res);
}

export async function fetchAvailableSlots(
  doctorId: string,
  date: string,
  excludeAppointmentId?: string
): Promise<SlotAvailability[]> {
  const params = new URLSearchParams({ doctorId, date });
  if (excludeAppointmentId) {
    params.set('excludeAppointmentId', excludeAppointmentId);
  }
  const res = await fetch(`/api/slots?${params.toString()}`);
  const payload = await parseJsonResponse<{ slots: SlotAvailability[] }>(res);
  return payload.slots;
}

export async function createAppointment(
  input: CreateAppointmentInput
): Promise<Appointment> {
  const res = await fetch('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ appointment: Appointment }>(res);
  return payload.appointment;
}

export async function updateAppointment(
  id: string,
  input: UpdateAppointmentInput
): Promise<Appointment> {
  const res = await fetch(`/api/appointments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await parseJsonResponse<{ appointment: Appointment }>(res);
  return payload.appointment;
}
