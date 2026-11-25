import React from 'react';

interface HeaderProps {
  onBookClick: () => void;
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

const NAV_ITEMS = [
  { id: 'book-visit', label: 'Book Visit' },
  { id: 'specialists', label: 'Specialists' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'departments', label: 'Departments' },
];

export const Header: React.FC<HeaderProps> = ({
  onBookClick,
  activeSection,
  onNavigate,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
        >
          Meridian Health
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.id);
                }}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700 ${
                  isActive
                    ? 'text-slate-900 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-teal-700'
                    : 'hover:underline hover:decoration-slate-300 hover:underline-offset-4'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onBookClick}
            className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Book Appointment
          </button>
        </div>
      </div>
    </header>
  );
};
