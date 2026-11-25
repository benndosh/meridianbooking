import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Appointment, Department, DepartmentId, Doctor } from '../types/booking';
import { formatTime12h } from '../lib/dateUtils';
import { ImageWithFallback } from './ImageWithFallback';

interface SpecialistDirectoryProps {
  departments: Department[];
  doctors: Doctor[];
  appointments: Appointment[];
  today: string;
  activeDepartmentFilter: DepartmentId | 'all';
  onDepartmentFilterChange: (dept: DepartmentId | 'all') => void;
  onQuickBookSlot: (doctorId: string, date: string, timeSlot: string) => void;
}

export const SpecialistDirectory: React.FC<SpecialistDirectoryProps> = ({
  departments,
  doctors,
  appointments,
  today,
  activeDepartmentFilter,
  onDepartmentFilterChange,
  onQuickBookSlot,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      if (activeDepartmentFilter !== 'all' && doc.departmentId !== activeDepartmentFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const dept = departments.find((d) => d.id === doc.departmentId);
      return (
        doc.name.toLowerCase().includes(q) ||
        doc.specialtyFocus.toLowerCase().includes(q) ||
        (dept?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [doctors, departments, activeDepartmentFilter, searchQuery]);

  const getTodayOpenSlots = (doctor: Doctor): string[] => {
    const booked = new Set(
      appointments
        .filter(
          (a) => a.doctorId === doctor.id && a.date === today && a.status !== 'cancelled'
        )
        .map((a) => a.timeSlot)
    );
    return doctor.dailySlots.filter((slot) => !booked.has(slot)).slice(0, 3);
  };

  return (
    <section id="specialists" className="border-b border-slate-200 bg-slate-50 py-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-medium tracking-wide text-teal-800">
              02. Medical Roster
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
              Attending Specialists
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search physician or focus..."
                aria-label="Search attending specialists"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/15 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Department Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter specialists by department"
          className="mb-8 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5 w-fit"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeDepartmentFilter === 'all'}
            onClick={() => onDepartmentFilterChange('all')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeDepartmentFilter === 'all'
                ? 'bg-teal-800 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            All Departments
          </button>
          {departments.map((dept) => {
            const isActive = activeDepartmentFilter === dept.id;
            return (
              <button
                key={dept.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onDepartmentFilterChange(dept.id)}
                className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-teal-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {dept.name.split(' & ')[0]}
              </button>
            );
          })}
        </div>

        {filteredDoctors.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-900">
              No attending specialists match "{searchQuery}".
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                onDepartmentFilterChange('all');
              }}
              className="mt-3 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {filteredDoctors.map((doc) => {
              const dept = departments.find((d) => d.id === doc.departmentId);
              const nextSlots = getTodayOpenSlots(doc);

              return (
                <article
                  key={doc.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6"
                >
                  <div className="flex flex-col gap-5 sm:flex-row">
                    <ImageWithFallback
                      src={doc.imagePath}
                      alt={`${doc.name}, ${doc.credentials}`}
                      className="h-28 w-28 shrink-0 rounded-xl border border-slate-200 object-cover object-top"
                      fallbackType="doctor"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="font-display text-lg font-semibold text-slate-900">
                          {doc.name}, <span className="font-normal text-slate-600">{doc.credentials}</span>
                        </h3>
                        <span className="font-mono text-sm font-medium tabular-nums text-slate-900">
                          ${doc.consultFee}
                        </span>
                      </div>

                      <p className="mt-1 text-xs font-medium text-teal-800">
                        {dept?.name}
                      </p>

                      <p className="mt-1.5 text-xs text-slate-500">
                        {doc.room} <span aria-hidden="true">·</span> {doc.experienceYears} yrs
                        experience <span aria-hidden="true">·</span> {doc.languages.join(', ')}
                      </p>

                      <p className="mt-3 text-sm leading-relaxed text-slate-600">
                        {doc.bio}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">Next today:</span>
                      {nextSlots.length > 0 ? (
                        nextSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => onQuickBookSlot(doc.id, today, slot)}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs font-medium tabular-nums text-slate-800 transition-colors hover:border-teal-700 hover:bg-teal-50 hover:text-teal-900 cursor-pointer whitespace-nowrap"
                          >
                            {formatTime12h(slot)}
                          </button>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">Fully booked today</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onQuickBookSlot(doc.id, today, nextSlots[0] || '')}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-teal-800 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Schedule Visit
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
