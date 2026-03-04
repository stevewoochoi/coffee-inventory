import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import type { NavGroup } from '@/config/adminNavigation';

interface MobileNavGroupProps {
  group: NavGroup;
  userRole: string;
  onNavigate: () => void;
  headerHover: string;
  headerText: string;
}

export function MobileNavGroup({ group, userRole, onNavigate, headerHover, headerText }: MobileNavGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();

  const isGroupActive = group.children?.some(c => location.pathname.startsWith(c.to));
  const visibleChildren = group.children?.filter(c => !c.roles || c.roles.includes(userRole));

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded text-sm font-medium transition-colors min-h-[44px] ${
          isGroupActive ? `${headerHover} text-white` : `${headerText} hover:bg-white/10`
        }`}
      >
        <span className="flex items-center gap-2">
          <group.icon className="w-5 h-5" />
          {t(group.key)}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="pl-8 py-1 space-y-0.5">
          {visibleChildren?.map(child => (
            <NavLink
              key={child.to}
              to={child.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded text-sm min-h-[44px] ${
                  isActive ? 'text-white font-bold' : `${headerText}`
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
