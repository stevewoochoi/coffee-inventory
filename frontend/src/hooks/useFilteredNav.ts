import { adminNavGroups, type NavGroup } from '@/config/adminNavigation';

export function useFilteredNav(userRole: string): NavGroup[] {
  return adminNavGroups
    .filter(group => group.roles.includes(userRole))
    .map(group => ({
      ...group,
      children: group.children?.filter(child =>
        !child.roles || child.roles.includes(userRole)
      ),
    }))
    .filter(group => group.to || (group.children && group.children.length > 0));
}
