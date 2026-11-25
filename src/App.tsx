import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  createAppointment,
  fetchBootstrap,
  updateAppointment,
} from './lib/api';
import type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
  Department,
  DepartmentId,
  Doctor,
} from './types/booking';
import { Header } from './components/Header';
import { ImageWithFallback } from './components/ImageWithFallback';
import { BookingScheduler } from './components/BookingScheduler';
import { SpecialistDirectory } from './components/SpecialistDirectory';
import { AppointmentsWorkspace } from './components/AppointmentsWorkspace';
import { DepartmentsSection } from './components/DepartmentsSection';
import { RescheduleModal } from './components/RescheduleModal';

const HERO_IMAGE = '/src/assets/images/hero_hospital_atrium_1795611012905.jpg';

export function App() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [today, setToday] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState('book-visit');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [activeDepartmentFilter, setActiveDepartmentFilter] = useState<DepartmentId | 'all'>('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const showNotice = useCallback((type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    window.setTimeout(() => {
      setNotice((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const payload = await fetchBootstrap();
      setDepartments(payload.departments);
      setDoctors(payload.doctors);
      setAppointments(payload.appointments);
      setToday(payload.today);
      setSelectedDoctorId((prev) => prev || payload.doctors[0]?.id || '');
      setSelectedDate((prev) => prev || payload.today);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load clinic schedule.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleQuickBookSlot = (doctorId: string, date: string, timeSlot: string) => {
    setSelectedDoctorId(doctorId);
    setSelectedDate(date);
    setSelectedSlot(timeSlot);
    scrollToSection('book-visit');
  };

  const handleSelectDepartment = (departmentId: DepartmentId) => {
    setActiveDepartmentFilter(departmentId);
    const firstDoctor = doctors.find((d) => d.departmentId === departmentId);
    if (firstDoctor) {
      setSelectedDoctorId(firstDoctor.id);
      setSelectedSlot('');
    }
    scrollToSection('book-visit');
  };

  const handleCreateAppointment = async (input: CreateAppointmentInput) => {
    const created = await createAppointment(input);
    setAppointments((prev) =>
      [...prev, created].sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        return d !== 0 ? d : a.timeSlot.localeCompare(b.timeSlot);
      })
    );
    setRefreshTrigger((n) => n + 1);
    showNotice('success', `Appointment ${created.referenceCode} confirmed for ${created.patientName}.`);
    return created;
  };

  const handleStatusChange = async (appointmentId: string, status: AppointmentStatus) => {
    try {
      const updated = await updateAppointment(appointmentId, { status });
      setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? updated : a)));
      setRefreshTrigger((n) => n + 1);
      const labelMap: Record<AppointmentStatus, string> = {
        scheduled: 'restored to Scheduled',
        checked_in: 'checked in at reception',
        in_consultation: 'moved to consultation',
        completed: 'marked as completed',
        cancelled: 'cancelled',
      };
      showNotice(
        'success',
        `${updated.referenceCode} (${updated.patientName}) ${labelMap[status]}.`
      );
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Unable to update status.');
    }
  };

  const handleSaveTriageNotes = async (appointmentId: string, triageNotes: string) => {
    try {
      const updated = await updateAppointment(appointmentId, { triageNotes });
      setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? updated : a)));
      showNotice('success', `Clinical notes saved for ${updated.referenceCode}.`);
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Unable to save clinical notes.');
    }
  };

  const handleConfirmReschedule = async (
    appointmentId: string,
    date: string,
    timeSlot: string
  ) => {
    const updated = await updateAppointment(appointmentId, { date, timeSlot });
    setAppointments((prev) =>
      prev
        .map((a) => (a.id === appointmentId ? updated : a))
        .sort((a, b) => {
          const d = a.date.localeCompare(b.date);
          return d !== 0 ? d : a.timeSlot.localeCompare(b.timeSlot);
        })
    );
    setRefreshTrigger((n) => n + 1);
    showNotice('success', `Appointment ${updated.referenceCode} rescheduled.`);
  };

  const todayOpenSlotsCount = useMemo(() => {
    if (!doctors.length) return 0;
    const bookedSet = new Set(
      appointments
        .filter((a) => a.date === today && a.status !== 'cancelled')
        .map((a) => `${a.doctorId}:${a.timeSlot}`)
    );
    let total = 0;
    for (const doc of doctors) {
      const [y, m, d] = today.split('-').map(Number);
      const dow = new Date(y, (m || 1) - 1, d || 1).getDay();
      if (!doc.workingDays.includes(dow)) continue;
      for (const slot of doc.dailySlots) {
        if (!bookedSet.has(`${doc.id}:${slot}`)) {
          total += 1;
        }
      }
    }
    return total;
  }, [doctors, appointments, today]);

  return (
    <div id="top" className="min-h-screen bg-slate-50 text-slate-900">
      <Header
        activeSection={activeSection}
        onNavigate={scrollToSection}
        onBookClick={() => scrollToSection('book-visit')}
      />

      {/* Action Feedback Toast */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex max-w-md items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-lg"
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-700" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {/* Hero Section */}
      <section className="border-b border-slate-200 bg-slate-50 pt-10 pb-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
            <div className="flex flex-col justify-between py-2 lg:col-span-6">
              <div>
                <p className="text-xs font-medium tracking-wide text-teal-800">
                  Meridian Medical Center · San Francisco Outpatient Campus
                </p>
                <h1 className="mt-3 font-display text-[clamp(2.25rem,4vw,3.35rem)] font-bold leading-[1.1] tracking-tight text-slate-900 [text-wrap:balance]">
                  Direct Specialist Appointments Without the Wait
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                  View real-time clinic availability across Cardiology, Orthopedics, Neurology,
                  and Pediatrics. Reserve in-person or telehealth consultations and manage
                  check-ins in one unified hospital schedule.
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => scrollToSection('book-visit')}
                    className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-teal-900 cursor-pointer whitespace-nowrap"
                  >
                    Book an Appointment
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection('appointments')}
                    className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                  >
                    View Clinic Schedule
                  </button>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-200 pt-5 text-xs text-slate-500">
                Same-day outpatient slots available · Direct insurance verification · Main Campus
                at 450 Meridian Way
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-72 overflow-hidden rounded-xl border border-slate-200 bg-white sm:h-96 lg:h-full lg:min-h-[380px]">
                <ImageWithFallback
                  src={HERO_IMAGE}
                  alt="Meridian Health sunlit hospital reception atrium and outpatient pavilion"
                  className="h-full w-full object-cover"
                  fallbackType="facility"
                  fallbackLabel="Meridian Medical Center Atrium"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/75 via-slate-900/30 to-transparent p-5">
                  <p className="text-xs font-medium text-white/90">
                    Main Reception &amp; Admissions Pavilion · Open Mon–Sat, 8:00 AM – 5:30 PM
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4-column Clinic Readiness Strip below hero split */}
          <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
            <div className="border-r border-slate-200 pr-4">
              <div className="text-xs text-slate-500">Open Slots Today</div>
              <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                {loading ? '—' : todayOpenSlotsCount}
              </div>
            </div>
            <div className="sm:border-r sm:border-slate-200 sm:pr-4">
              <div className="text-xs text-slate-500">Clinical Departments</div>
              <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                {departments.length || 4}
              </div>
            </div>
            <div className="border-r border-slate-200 pr-4">
              <div className="text-xs text-slate-500">Consultation Window</div>
              <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                30 min
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Active Bookings</div>
              <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                {loading
                  ? '—'
                  : appointments.filter((a) => a.status !== 'cancelled').length}
              </div>
            </div>
          </div>
        </div>
      </section>

      {loadError ? (
        <div className="mx-auto my-12 max-w-3xl px-6">
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900"
          >
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="h-5 w-5 text-rose-700" />
              <span>Unable to reach the hospital scheduling service</span>
            </div>
            <p className="text-rose-800">{loadError}</p>
            <button
              type="button"
              onClick={loadData}
              className="rounded-lg bg-rose-800 px-4 py-2 text-xs font-medium text-white hover:bg-rose-900 cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        </div>
      ) : (
        <main>
          <BookingScheduler
            departments={departments}
            doctors={doctors}
            today={today}
            selectedDoctorId={selectedDoctorId}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            onSelectDoctorId={setSelectedDoctorId}
            onSelectDate={setSelectedDate}
            onSelectSlot={setSelectedSlot}
            onSubmitBooking={handleCreateAppointment}
            onViewAppointments={() => scrollToSection('appointments')}
            refreshTrigger={refreshTrigger}
          />

          <SpecialistDirectory
            departments={departments}
            doctors={doctors}
            appointments={appointments}
            today={today}
            activeDepartmentFilter={activeDepartmentFilter}
            onDepartmentFilterChange={setActiveDepartmentFilter}
            onQuickBookSlot={handleQuickBookSlot}
          />

          <AppointmentsWorkspace
            appointments={appointments}
            doctors={doctors}
            departments={departments}
            today={today}
            loading={loading}
            onStatusChange={handleStatusChange}
            onSaveTriageNotes={handleSaveTriageNotes}
            onOpenReschedule={(apt) => setRescheduleTarget(apt)}
            onBookNew={() => scrollToSection('book-visit')}
          />

          <DepartmentsSection
            departments={departments}
            onSelectDepartment={handleSelectDepartment}
          />
        </main>
      )}

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-6 md:flex-row md:items-center">
          <div>
            <div className="font-display text-base font-bold text-slate-900">
              Meridian Health
            </div>
            <p className="mt-1 text-xs text-slate-500">
              450 Meridian Way, San Francisco, CA 94107 · Main Desk (415) 555-0100
            </p>
          </div>

          <p className="text-xs text-slate-500">
            For medical emergencies, dial 911 or proceed to the Emergency Pavilion on Ground Floor.
          </p>
        </div>
      </footer>

      {rescheduleTarget && (
        <RescheduleModal
          appointment={rescheduleTarget}
          doctor={doctors.find((d) => d.id === rescheduleTarget.doctorId)}
          today={today}
          onClose={() => setRescheduleTarget(null)}
          onConfirm={handleConfirmReschedule}
        />
      )}
    </div>
  );
}

export default App;
