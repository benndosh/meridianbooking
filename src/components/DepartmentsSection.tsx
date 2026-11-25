import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { Department, DepartmentId } from '../types/booking';

interface DepartmentsSectionProps {
  departments: Department[];
  onSelectDepartment: (departmentId: DepartmentId) => void;
}

export const DepartmentsSection: React.FC<DepartmentsSectionProps> = ({
  departments,
  onSelectDepartment,
}) => {
  return (
    <section id="departments" className="bg-slate-50 py-14">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-medium tracking-wide text-teal-800">
              04. Clinical Wings
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl [text-wrap:balance]">
              Hospital Outpatient Departments
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-slate-600">
            All specialty clinics operate Monday through Saturday from 8:30 AM to 4:30 PM with
            integrated lab and imaging access.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {departments.map((dept) => (
            <div
              key={dept.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6"
            >
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-xs font-medium tabular-nums text-teal-800">
                    {dept.code}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-slate-500">
                    {dept.consultDurationMin} min · ${dept.baseFee}
                  </span>
                </div>

                <h3 className="mt-3 font-display text-lg font-semibold text-slate-900">
                  {dept.name}
                </h3>

                <p className="mt-1.5 text-xs text-slate-500">
                  {dept.wing} <span aria-hidden="true">·</span> {dept.floor}{' '}
                  <span aria-hidden="true">·</span> {dept.phoneExt}
                </p>

                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {dept.description}
                </p>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => onSelectDepartment(dept.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 transition-colors hover:text-teal-950 cursor-pointer"
                >
                  <span>Book in {dept.name.split(' & ')[0]}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
