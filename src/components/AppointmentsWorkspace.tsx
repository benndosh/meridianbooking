import React, { useMemo, useState } from 'react';
import {
  Calendar,
  FileText,
  Printer,
  Search,
  X,
} from 'lucide-react';
import type {
  Appointment,
  AppointmentStatus,
  Department,
  Doctor,
} from '../types/booking';
import { formatReadableDate, formatTime12h } from '../lib/dateUtils';
import { StatusLabel } from './StatusLabel';

interface AppointmentsWorkspaceProps {
  appointments: Appointment[];
  doctors: Doctor[];
  departments: Department[];
  today: string;
  loading: boolean;
  onStatusChange: (appointmentId: string, status: AppointmentStatus) => Promise<void>;
  onSaveTriageNotes: (appointmentId: string, notes: string) => Promise<void>;
  onOpenReschedule: (appointment: Appointment) => void;
  onBookNew: () => void;
}

type StatusFilter = 'all' | AppointmentStatus;
type ViewMode = 'patient' | 'reception';

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'checked_in', label: 'Checked In' },
  { id: 'in_consultation', label: 'In Consultation' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export const AppointmentsWorkspace: React.FC<AppointmentsWorkspaceProps> = ({
  appointments,
  doctors,
  departments,
  today,
  loading,
  onStatusChange,
  onSaveTriageNotes,
  onOpenReschedule,
  onBookNew,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('patient');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateScope, setDateScope] = useState<'all' | 'today'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const selectedAppointment = useMemo(
    () => appointments.find((a) => a.id === selectedAppointmentId) || null,
    [appointments, selectedAppointmentId]
  );

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (viewMode === 'reception' && dateScope === 'today' && apt.date !== today) {
        return false;
      }
      if (dateScope === 'today' && apt.date !== today) {
        return false;
      }
      if (statusFilter !== 'all' && apt.status !== statusFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const doc = doctors.find((d) => d.id === apt.doctorId);
      return (
        apt.patientName.toLowerCase().includes(q) ||
        apt.referenceCode.toLowerCase().includes(q) ||
        apt.patientEmail.toLowerCase().includes(q) ||
        (doc?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [appointments, doctors, viewMode, dateScope, today, statusFilter, searchQuery]);

  const todaySummary = useMemo(() => {
    const todayItems = appointments.filter((a) => a.date === today && a.status !== 'cancelled');
    return {
      totalToday: todayItems.length,
      waiting: todayItems.filter((a) => a.status === 'checked_in').length,
      inConsult: todayItems.filter((a) => a.status === 'in_consultation').length,
      upcoming: todayItems.filter((a) => a.status === 'scheduled').length,
    };
  }, [appointments, today]);

  const handleAction = async (id: string, nextStatus: AppointmentStatus) => {
    setBusyId(id);
    try {
      await onStatusChange(id, nextStatus);
    } finally {
      setBusyId(null);
    }
  };

  const openDetails = (apt: Appointment) => {
    setSelectedAppointmentId(apt.id);
    setNotesDraft(apt.triageNotes || '');
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    setSavingNotes(true);
    try {
      await onSaveTriageNotes(selectedAppointment.id, notesDraft);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <section id="appointments" className="border-b border-slate-200 bg-white py-14">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header + Workspace Mode Switch */}
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-medium tracking-wide text-teal-800">
              03. Live Clinic Schedule
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
              Appointments &amp; Reception Queue
            </h2>
          </div>

          {/* Segmented Mode Switch inside Workspace Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              role="group"
              aria-label="Workspace view mode"
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1"
            >
              <button
                type="button"
                onClick={() => {
                  setViewMode('patient');
                  setDateScope('all');
                }}
                className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'patient'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Bookings
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('reception');
                  setDateScope('today');
                }}
                className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'reception'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today's Reception Desk
              </button>
            </div>
          </div>
        </div>

        {/* Summary Metrics Strip */}
        <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-4">
          <div className="border-r border-slate-200/80 pr-4 last:border-r-0">
            <div className="text-xs text-slate-500">Today's Active Visits</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">
              {todaySummary.totalToday}
            </div>
          </div>
          <div className="sm:border-r sm:border-slate-200/80 sm:pr-4">
            <div className="text-xs text-slate-500">Awaiting Arrival</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">
              {todaySummary.upcoming}
            </div>
          </div>
          <div className="border-r border-slate-200/80 pr-4">
            <div className="text-xs text-slate-500">Checked In Waiting</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-amber-700">
              {todaySummary.waiting}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">In Consultation</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-teal-800">
              {todaySummary.inConsult}
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div
            role="tablist"
            aria-label="Filter appointments by status"
            className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 w-fit"
          >
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setDateScope('all')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  dateScope === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Dates
              </button>
              <button
                type="button"
                onClick={() => setDateScope('today')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  dateScope === 'today'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today Only
              </button>
            </div>

            <div className="relative flex-1 sm:flex-initial">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient or MRD code..."
                aria-label="Search appointments"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="mx-auto h-8 w-8 text-slate-400" strokeWidth={1.5} />
              <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
                No appointments match your current filter
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Adjust the date or status filters above, or reserve a new outpatient visit.
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setDateScope('all');
                    setSearchQuery('');
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  onClick={onBookNew}
                  className="rounded-lg bg-teal-800 px-4 py-2 text-xs font-medium text-white hover:bg-teal-900 cursor-pointer"
                >
                  Book Appointment
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="px-4 py-3 whitespace-nowrap">Date &amp; Time</th>
                    <th className="px-4 py-3 whitespace-nowrap">Ref</th>
                    <th className="px-4 py-3 whitespace-nowrap">Patient</th>
                    <th className="px-4 py-3 whitespace-nowrap">Specialist &amp; Suite</th>
                    <th className="px-4 py-3 whitespace-nowrap">Visit</th>
                    <th className="px-4 py-3 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredAppointments.map((apt) => {
                    const doc = doctors.find((d) => d.id === apt.doctorId);
                    const dept = departments.find((d) => d.id === apt.departmentId);
                    const isBusy = busyId === apt.id;

                    return (
                      <tr
                        key={apt.id}
                        className="transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-900 whitespace-nowrap">
                          <div className="font-medium">{formatTime12h(apt.timeSlot)}</div>
                          <div className="text-slate-500">
                            {apt.date === today ? 'Today' : formatReadableDate(apt.date)}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono text-xs font-medium tabular-nums text-slate-600 whitespace-nowrap">
                          {apt.referenceCode}
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{apt.patientName}</div>
                          <div className="text-xs text-slate-500">
                            {apt.insuranceProvider}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">
                            {doc?.name || 'Specialist'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {dept?.name.split(' & ')[0]} · {doc?.room}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                          {apt.visitType === 'telehealth' ? 'Telehealth' : 'In-Person'}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusLabel status={apt.status} />
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {apt.status === 'scheduled' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleAction(apt.id, 'checked_in')}
                                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-teal-700 hover:text-teal-900 disabled:opacity-50 cursor-pointer"
                              >
                                Check In
                              </button>
                            )}

                            {apt.status === 'checked_in' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleAction(apt.id, 'in_consultation')}
                                className="rounded-md bg-teal-800 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-teal-900 disabled:opacity-50 cursor-pointer"
                              >
                                Start Visit
                              </button>
                            )}

                            {apt.status === 'in_consultation' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleAction(apt.id, 'completed')}
                                className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                              >
                                Complete
                              </button>
                            )}

                            {(apt.status === 'scheduled' || apt.status === 'checked_in') && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => onOpenReschedule(apt)}
                                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                              >
                                Reschedule
                              </button>
                            )}

                            {(apt.status === 'scheduled' || apt.status === 'checked_in') && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleAction(apt.id, 'cancelled')}
                                className="rounded-md px-2 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => openDetails(apt)}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Details</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Detail & Triage Drawer */}
      {selectedAppointment && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-appointment-title"
        >
          <div className="flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="font-mono text-xs tabular-nums text-slate-500">
                  {selectedAppointment.referenceCode} ·{' '}
                  {formatReadableDate(selectedAppointment.date)} at{' '}
                  {formatTime12h(selectedAppointment.timeSlot)}
                </p>
                <h3
                  id="drawer-appointment-title"
                  className="mt-1 font-display text-xl font-semibold text-slate-900"
                >
                  {selectedAppointment.patientName}
                </h3>
                <div className="mt-2">
                  <StatusLabel status={selectedAppointment.status} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAppointmentId(null)}
                aria-label="Close appointment details"
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <div>
                <h4 className="text-xs font-semibold tracking-wide text-slate-500">
                  Clinical Assignment
                </h4>
                <dl className="mt-3 space-y-2.5 text-sm">
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Attending Physician</dt>
                    <dd className="font-medium text-slate-900">
                      {doctors.find((d) => d.id === selectedAppointment.doctorId)?.name}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Department</dt>
                    <dd className="text-slate-800">
                      {departments.find((d) => d.id === selectedAppointment.departmentId)?.name}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Location / Format</dt>
                    <dd className="text-slate-800">
                      {selectedAppointment.visitType === 'telehealth'
                        ? 'Telehealth Video'
                        : doctors.find((d) => d.id === selectedAppointment.doctorId)?.room}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-xs font-semibold tracking-wide text-slate-500">
                  Patient Registration
                </h4>
                <dl className="mt-3 space-y-2.5 text-sm">
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Date of Birth</dt>
                    <dd className="font-mono tabular-nums text-slate-800">
                      {selectedAppointment.dateOfBirth}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Phone</dt>
                    <dd className="font-mono tabular-nums text-slate-800">
                      {selectedAppointment.patientPhone}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Email</dt>
                    <dd className="text-slate-800">{selectedAppointment.patientEmail}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">Insurance</dt>
                    <dd className="text-slate-800">
                      {selectedAppointment.insuranceProvider}
                      {selectedAppointment.insuranceMemberId
                        ? ` (${selectedAppointment.insuranceMemberId})`
                        : ''}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-xs font-semibold tracking-wide text-slate-500">
                  Reason for Visit
                </h4>
                <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-800">
                  {selectedAppointment.reasonForVisit}
                </p>
              </div>

              <form onSubmit={handleSaveNotes}>
                <label
                  htmlFor="triage-notes"
                  className="block text-xs font-semibold tracking-wide text-slate-500"
                >
                  Intake &amp; Triage Notes
                </label>
                <textarea
                  id="triage-notes"
                  rows={3}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Record vitals, arrival notes, or referral documents..."
                  className="mt-2 w-full resize-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                />
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print Summary</span>
                  </button>
                  <button
                    type="submit"
                    disabled={savingNotes}
                    className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50 cursor-pointer"
                  >
                    {savingNotes ? 'Saving...' : 'Save Notes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
