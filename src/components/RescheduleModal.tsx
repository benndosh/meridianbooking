import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';
import type { Appointment, Doctor, SlotAvailability } from '../types/booking';
import { fetchAvailableSlots } from '../lib/api';
import { formatReadableDate, formatTime12h, getUpcomingDates } from '../lib/dateUtils';

interface RescheduleModalProps {
  appointment: Appointment;
  doctor: Doctor | undefined;
  today: string;
  onClose: () => void;
  onConfirm: (appointmentId: string, date: string, timeSlot: string) => Promise<void>;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  appointment,
  doctor,
  today,
  onClose,
  onConfirm,
}) => {
  const [selectedDate, setSelectedDate] = useState(appointment.date);
  const [selectedSlot, setSelectedSlot] = useState(appointment.timeSlot);
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upcomingDates = getUpcomingDates(today, 12);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoadingSlots(true);
      setError(null);
      try {
        const result = await fetchAvailableSlots(
          appointment.doctorId,
          selectedDate,
          appointment.id
        );
        if (!active) return;
        setSlots(result);
        const currentIsValid = result.some((s) => s.time === selectedSlot && s.available);
        if (!currentIsValid) {
          const firstAvail = result.find((s) => s.available);
          setSelectedSlot(firstAvail ? firstAvail.time : '');
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load available time slots.');
      } finally {
        if (active) setLoadingSlots(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [appointment.doctorId, appointment.id, selectedDate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setError('Please select an available time slot.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(appointment.id, selectedDate, selectedSlot);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-title"
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-mono tabular-nums text-slate-500">
              {appointment.referenceCode} · {appointment.patientName}
            </p>
            <h3
              id="reschedule-title"
              className="mt-1 font-display text-lg font-semibold text-slate-900"
            >
              Reschedule Appointment
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reschedule dialog"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div>
              <span className="font-medium text-slate-900">{doctor?.name || 'Specialist'}</span>
              <span className="mx-2 text-slate-400">·</span>
              <span>{doctor?.room}</span>
            </div>
            <div className="font-mono text-xs tabular-nums text-slate-600">
              Current: {formatReadableDate(appointment.date)} at {formatTime12h(appointment.timeSlot)}
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span>Select New Date</span>
            </label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {upcomingDates.map((d) => {
                const worksDay = doctor ? doctor.workingDays.includes(d.dayOfWeek) : true;
                const isSelected = selectedDate === d.iso;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    disabled={!worksDay}
                    onClick={() => setSelectedDate(d.iso)}
                    className={`flex flex-col items-center rounded-lg border px-2 py-2 text-center transition-colors cursor-pointer disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 ${
                      isSelected
                        ? 'border-teal-800 bg-teal-800 text-white'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[11px] font-medium opacity-80">
                      {d.isToday ? 'Today' : d.weekdayShort}
                    </span>
                    <span className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                      {d.dayNum}
                    </span>
                    <span className="text-[11px] opacity-75">{d.monthShort}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-700">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>Available Time Slots for {formatReadableDate(selectedDate)}</span>
            </label>

            {loadingSlots ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-10 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
                  />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Clinic is closed on this date. Please select another day.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => {
                  const isSelected = selectedSlot === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot.time)}
                      className={`rounded-lg border px-3 py-2 font-mono text-xs font-medium tabular-nums transition-colors cursor-pointer disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 disabled:line-through ${
                        isSelected
                          ? 'border-teal-800 bg-teal-800 text-white'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-teal-700 hover:text-teal-900'
                      }`}
                    >
                      {formatTime12h(slot.time)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedSlot}
              className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Updating...' : 'Confirm Reschedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
