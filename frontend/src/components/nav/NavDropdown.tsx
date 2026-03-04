import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import type { NavGroup } from '@/config/adminNavigation';

interface NavDropdownProps {
  group: NavGroup;
  userRole: string;
  headerHover: string;
  headerText: string;
}

export function NavDropdown({ group, userRole, headerHover, headerText }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { t } = useTranslation();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const isGroupActive = group.children?.some(child =>
    location.pathname.startsWith(child.to)
  );

  const visibleChildren = group.children?.filter(child =>
    !child.roles || child.roles.includes(userRole)
  );

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(true), 200);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  if (group.to) {
    return (
      <NavLink
        to={group.to}
        className={({ isActive }) =>
          `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            isActive ? `${headerHover} text-white` : `${headerText} hover:bg-white/10`
          }`
        }
      >
        {t(group.key)}
      </NavLink>
    );
  }

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setOpen(!open)}
        className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 transition-colors ${
          isGroupActive ? `${headerHover} text-white font-bold` : `${headerText} hover:bg-white/10`
        }`}
      >
        {t(group.key)}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[180px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {visibleChildren?.map(child => (
            <NavLink
              key={child.to}
              to={child.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-accent text-accent-foreground font-semibold' : 'text-gray-700 hover:bg-gray-50'
                }`
              }
            >
              <child.icon className="w-4 h-4" />
              {t(child.key)}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
