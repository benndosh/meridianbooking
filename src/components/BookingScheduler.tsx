import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Printer,
  Video,
} from 'lucide-react';
import type {
  Appointment,
  CreateAppointmentInput,
  Department,
  Doctor,
  SlotAvailability,
  VisitType,
} from '../types/booking';
import { fetchAvailableSlots } from '../lib/api';
import { formatReadableDate, formatTime12h, getUpcomingDates } from '../lib/dateUtils';
import { ImageWithFallback } from './ImageWithFallback';

interface BookingSchedulerProps {
  departments: Department[];
  doctors: Doctor[];
  today: string;
  selectedDoctorId: string;
  selectedDate: string;
  selectedSlot: string;
  onSelectDoctorId: (id: string) => void;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slot: string) => void;
  onSubmitBooking: (input: CreateAppointmentInput) => Promise<Appointment>;
  onViewAppointments: () => void;
  refreshTrigger: number;
}

const INSURANCE_OPTIONS = [
  'BlueCross BlueShield',
  'Aetna PPO',
  'UnitedHealthcare',
  'Cigna Open Access',
  'Kaiser Permanente',
  'Medicare Part B',
  'Self-Pay / Uninsured',
];

export const BookingScheduler: React.FC<BookingSchedulerProps> = ({
  departments,
  doctors,
  today,
  selectedDoctorId,
  selectedDate,
  selectedSlot,
  onSelectDoctorId,
  onSelectDate,
  onSelectSlot,
  onSubmitBooking,
  onViewAppointments,
  refreshTrigger,
}) => {
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [visitType, setVisitType] = useState<VisitType>('in_person');
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState(INSURANCE_OPTIONS[0]);
  const [insuranceMemberId, setInsuranceMemberId] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === selectedDoctorId) || doctors[0],
    [doctors, selectedDoctorId]
  );

  const selectedDepartment = useMemo(
    () => departments.find((dept) => dept.id === selectedDoctor?.departmentId),
    [departments, selectedDoctor]
  );

  const upcomingDates = useMemo(() => getUpcomingDates(today, 12), [today]);

  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;
    let active = true;

    async function loadSlots() {
      setLoadingSlots(true);
      setSlotsError(null);
      try {
        const result = await fetchAvailableSlots(selectedDoctor.id, selectedDate);
        if (!active) return;
        setSlots(result);

        if (selectedSlot) {
          const stillOpen = result.some((s) => s.time === selectedSlot && s.available);
          if (!stillOpen) {
            const firstOpen = result.find((s) => s.available);
            onSelectSlot(firstOpen ? firstOpen.time : '');
          }
        } else {
          const firstOpen = result.find((s) => s.available);
          if (firstOpen) {
            onSelectSlot(firstOpen.time);
          }
        }
      } catch (err) {
        if (!active) return;
        setSlotsError(err instanceof Error ? err.message : 'Unable to load open time slots.');
      } finally {
        if (active) setLoadingSlots(false);
      }
    }

    loadSlots();
    return () => {
      active = false;
    };
  }, [selectedDoctor?.id, selectedDate, refreshTrigger]);

  const morningSlots = slots.filter((s) => Number(s.time.split(':')[0]) < 12);
  const afternoonSlots = slots.filter((s) => Number(s.time.split(':')[0]) >= 12);
  const openCount = slots.filter((s) => s.available).length;

  const handleDoctorChange = (doctorId: string) => {
    setConfirmedAppointment(null);
    setFormError(null);
    onSelectDoctorId(doctorId);
  };

  const handleDateChange = (iso: string) => {
    setConfirmedAppointment(null);
    setFormError(null);
    onSelectDate(iso);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor) return;
    if (!selectedSlot) {
      setFormError('Please select an available time slot before confirming.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const created = await onSubmitBooking({
        doctorId: selectedDoctor.id,
        date: selectedDate,
        timeSlot: selectedSlot,
        visitType,
        patientName: patientName.trim(),
        patientEmail: patientEmail.trim(),
        patientPhone: patientPhone.trim(),
        dateOfBirth,
        insuranceProvider,
        insuranceMemberId: insuranceMemberId.trim(),
        reasonForVisit: reasonForVisit.trim(),
      });
      setConfirmedAppointment(created);
      setPatientName('');
      setPatientEmail('');
      setPatientPhone('');
      setDateOfBirth('');
      setInsuranceMemberId('');
      setReasonForVisit('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to complete booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="book-visit" className="border-b border-slate-200 bg-white py-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-medium tracking-wide text-teal-800">
              01. Outpatient Scheduling
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
              Reserve an Appointment Slot
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-slate-600">
            Select an attending specialist, choose an open 30-minute clinic window, and confirm
            patient registration in one step.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Specialist, Date, and Slot Selection */}
          <div className="space-y-7 lg:col-span-7">
            {/* Step 1: Specialist Selector */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-900">
                  1. Attending Specialist
                </label>
                {selectedDepartment && (
                  <span className="text-xs text-slate-500">
                    {selectedDepartment.name} · {selectedDepartment.consultDurationMin} min ·{' '}
                    <span className="font-mono tabular-nums">${selectedDoctor?.consultFee}</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {doctors.map((doc) => {
                  const dept = departments.find((d) => d.id === doc.departmentId);
                  const isActive = doc.id === selectedDoctor?.id;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleDoctorChange(doc.id)}
                      className={`flex items-center gap-3.5 rounded-xl border p-3.5 text-left transition-colors duration-150 cursor-pointer ${
                        isActive
                          ? 'border-teal-800 bg-teal-50/40'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <ImageWithFallback
                        src={doc.imagePath}
                        alt={`${doc.name}, ${dept?.name || ''}`}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover object-top border border-slate-200"
                        fallbackType="doctor"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-display text-sm font-semibold text-slate-900">
                            {doc.name}
                          </span>
                          <span className="font-mono text-xs tabular-nums text-slate-500 shrink-0">
                            ${doc.consultFee}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-600">
                          {dept?.name}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {doc.room}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Date Picker Strip */}
            <div className="border-t border-slate-200 pt-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Calendar className="h-4 w-4 text-teal-800" aria-hidden="true" />
                  <span>2. Preferred Date</span>
                </span>
                <span className="font-mono text-xs tabular-nums text-slate-500">
                  {formatReadableDate(selectedDate)}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {upcomingDates.map((d) => {
                  const worksDay = selectedDoctor
                    ? selectedDoctor.workingDays.includes(d.dayOfWeek)
                    : true;
                  const isSelected = selectedDate === d.iso;

                  return (
                    <button
                      key={d.iso}
                      type="button"
                      disabled={!worksDay}
                      onClick={() => handleDateChange(d.iso)}
                      className={`flex flex-col items-center rounded-lg border px-2 py-2.5 text-center transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 ${
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

            {/* Step 3: Live Time Slot Grid */}
            <div className="border-t border-slate-200 pt-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Clock className="h-4 w-4 text-teal-800" aria-hidden="true" />
                  <span>3. Available Time Slots</span>
                </span>
                <span className="font-mono text-xs tabular-nums text-slate-500">
                  {loadingSlots ? 'Checking schedule...' : `${openCount} slots open`}
                </span>
              </div>

              {slotsError && (
                <div
                  role="alert"
                  className="mb-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{slotsError}</span>
                </div>
              )}

              {loadingSlots ? (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-10 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
                    />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                  {selectedDoctor?.name} does not hold outpatient clinic hours on Sundays. Please
                  choose another date above.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-500">Morning Clinic</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {morningSlots.map((slot) => {
                        const isSelected = selectedSlot === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => {
                              setConfirmedAppointment(null);
                              onSelectSlot(slot.time);
                            }}
                            className={`rounded-lg border px-2.5 py-2.5 font-mono text-xs font-medium tabular-nums transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 disabled:line-through ${
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
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-500">Afternoon Clinic</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {afternoonSlots.map((slot) => {
                        const isSelected = selectedSlot === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => {
                              setConfirmedAppointment(null);
                              onSelectSlot(slot.time);
                            }}
                            className={`rounded-lg border px-2.5 py-2.5 font-mono text-xs font-medium tabular-nums transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 disabled:line-through ${
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
                  </div>
                </div>
              )}
            </div>

            {/* Step 4: Visit Format */}
            <div className="border-t border-slate-200 pt-6">
              <span className="mb-3 block text-sm font-semibold text-slate-900">
                4. Visit Format
              </span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setVisitType('in_person')}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                    visitType === 'in_person'
                      ? 'border-teal-800 bg-teal-50/40'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <MapPin
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      visitType === 'in_person' ? 'text-teal-800' : 'text-slate-500'
                    }`}
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">In-Person Visit</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      Check in at {selectedDoctor?.room}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVisitType('telehealth')}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                    visitType === 'telehealth'
                      ? 'border-teal-800 bg-teal-50/40'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <Video
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      visitType === 'telehealth' ? 'text-teal-800' : 'text-slate-500'
                    }`}
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Telehealth Video</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      Encrypted clinical link sent 15 min prior
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Patient Registration Form or Confirmation Pass */}
          <div className="lg:col-span-5">
            {confirmedAppointment ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-start gap-3 border-b border-slate-200 pb-5">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
                  <div>
                    <p className="text-xs font-medium text-emerald-700">Booking Confirmed</p>
                    <h3 className="mt-0.5 font-display text-xl font-semibold text-slate-900">
                      Appointment Pass Ready
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Confirmation sent to {confirmedAppointment.patientEmail}
                    </p>
                  </div>
                </div>

                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <dt className="text-slate-500">Reference Code</dt>
                    <dd className="font-mono font-semibold tabular-nums text-slate-900">
                      {confirmedAppointment.referenceCode}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <dt className="text-slate-500">Patient</dt>
                    <dd className="font-medium text-slate-900">
                      {confirmedAppointment.patientName}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <dt className="text-slate-500">Specialist</dt>
                    <dd className="font-medium text-slate-900">
                      {doctors.find((d) => d.id === confirmedAppointment.doctorId)?.name}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <dt className="text-slate-500">Date &amp; Time</dt>
                    <dd className="font-mono font-medium tabular-nums text-slate-900">
                      {formatReadableDate(confirmedAppointment.date)} ·{' '}
                      {formatTime12h(confirmedAppointment.timeSlot)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <dt className="text-slate-500">Location / Format</dt>
                    <dd className="font-medium text-slate-900">
                      {confirmedAppointment.visitType === 'telehealth'
                        ? 'Telehealth Video Consultation'
                        : doctors.find((d) => d.id === confirmedAppointment.doctorId)?.room}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between pb-1">
                    <dt className="text-slate-500">Insurance</dt>
                    <dd className="text-slate-800">{confirmedAppointment.insuranceProvider}</dd>
                  </div>
                </dl>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Pass</span>
                  </button>
                  <button
                    type="button"
                    onClick={onViewAppointments}
                    className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-900 cursor-pointer"
                  >
                    Manage Appointments
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmedAppointment(null)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 cursor-pointer"
                  >
                    Book Another
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-6"
              >
                <div className="border-b border-slate-200 pb-4">
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Patient Intake &amp; Summary
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                    <span className="font-medium text-slate-900">{selectedDoctor?.name}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {formatReadableDate(selectedDate)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono font-semibold tabular-nums text-teal-800">
                      {selectedSlot ? formatTime12h(selectedSlot) : 'No slot selected'}
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label
                      htmlFor="patient-name"
                      className="mb-1.5 block text-xs font-medium text-slate-700"
                    >
                      Patient Full Name
                    </label>
                    <input
                      id="patient-name"
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g. Jordan Ellis"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="patient-dob"
                        className="mb-1.5 block text-xs font-medium text-slate-700"
                      >
                        Date of Birth
                      </label>
                      <input
                        id="patient-dob"
                        type="date"
                        required
                        max={today}
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="patient-phone"
                        className="mb-1.5 block text-xs font-medium text-slate-700"
                      >
                        Phone Number
                      </label>
                      <input
                        id="patient-phone"
                        type="tel"
                        required
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        placeholder="(415) 555-0190"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="patient-email"
                      className="mb-1.5 block text-xs font-medium text-slate-700"
                    >
                      Email Address
                    </label>
                    <input
                      id="patient-email"
                      type="email"
                      required
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      placeholder="jordan.ellis@example.com"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="insurance-provider"
                        className="mb-1.5 block text-xs font-medium text-slate-700"
                      >
                        Insurance Plan
                      </label>
                      <select
                        id="insurance-provider"
                        value={insuranceProvider}
                        onChange={(e) => setInsuranceProvider(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                      >
                        {INSURANCE_OPTIONS.map((ins) => (
                          <option key={ins} value={ins}>
                            {ins}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="insurance-id"
                        className="mb-1.5 block text-xs font-medium text-slate-700"
                      >
                        Member ID (Optional)
                      </label>
                      <input
                        id="insurance-id"
                        type="text"
                        value={insuranceMemberId}
                        onChange={(e) => setInsuranceMemberId(e.target.value)}
                        placeholder="e.g. BCB-102948"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="reason-visit"
                      className="mb-1.5 block text-xs font-medium text-slate-700"
                    >
                      Reason for Visit / Symptoms
                    </label>
                    <textarea
                      id="reason-visit"
                      required
                      rows={3}
                      value={reasonForVisit}
                      onChange={(e) => setReasonForVisit(e.target.value)}
                      placeholder="Briefly describe symptoms, referral notes, or follow-up questions..."
                      className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15"
                    />
                  </div>
                </div>

                {formError && (
                  <div
                    role="alert"
                    className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
                  <div>
                    <div className="text-xs text-slate-500">Standard Consultation</div>
                    <div className="font-mono text-base font-semibold tabular-nums text-slate-900">
                      ${selectedDoctor?.consultFee ?? 220}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !selectedSlot}
                    className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    {submitting ? 'Confirming...' : 'Confirm Booking'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
