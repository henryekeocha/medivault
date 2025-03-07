import { Route } from 'next';
import { Role } from '@prisma/client';


// Define the base paths for protected routes
const PROTECTED_BASE_PATHS = {
  ADMIN: '/admin',
  PROVIDER: '/provider',
  PATIENT: '/patient',
} as const;

export const routes = {
  root: {
    home: '/',
    login: '/auth/login',
    register: '/auth/register',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verifyEmail: '/auth/verify-email',
    privacyPolicy: '/privacy-policy',
    termsOfService: '/terms-of-service',
  },
  dashboard: {
    patient: '/patient/dashboard',
    provider: '/provider/dashboard',
    admin: '/admin/dashboard',
  },
  images: {
    list: '/images',
    upload: '/images/upload',
    view: (id: string) => `/images/${id}`,
    edit: (id: string) => `/images/${id}/edit`,
  },
  shares: {
    list: '/shares',
    create: '/shares/create',
    view: (id: string) => `/shares/${id}`,
  },
  appointments: {
    list: '/appointments',
    create: '/appointments/create',
    view: (id: string) => `/appointments/${id}`,
    edit: (id: string) => `/appointments/${id}/edit`,
  },
  patients: {
    list: '/patients',
    view: (id: string) => `/patients/${id}`,
    edit: (id: string) => `/patients/${id}/edit`,
  },
  providers: {
    list: '/providers',
    view: (id: string) => `/providers/${id}`,
    edit: (id: string) => `/providers/${id}/edit`,
  },
  settings: {
    profile: '/settings/profile',
    security: '/settings/security',
    notifications: '/settings/notifications',
    preferences: '/settings/preferences',
    devices: '/account/devices',
  },
  admin: {
    users: '/admin/users',
    analytics: '/admin/analytics',
    settings: '/admin/settings',
    logs: '/admin/logs',
    errorShowcase: '/admin/error-showcase',
  },
};

export const DEFAULT_ROUTES = {
  [Role.PATIENT]: routes.dashboard.patient,
  [Role.PROVIDER]: routes.dashboard.provider,
  [Role.ADMIN]: routes.dashboard.admin,
};

// Define route access by role
const ROUTE_ACCESS = {
  [Role.PATIENT]: [
    routes.dashboard.patient,
    routes.images.list,
    routes.images.view('*'),
    routes.shares.list,
    routes.shares.view('*'),
    routes.appointments.list,
    routes.appointments.view('*'),
    routes.settings.profile,
    routes.settings.security,
    routes.settings.notifications,
    routes.settings.preferences,
    routes.settings.devices,
  ],
  [Role.PROVIDER]: [
    routes.dashboard.provider,
    routes.images.list,
    routes.images.upload,
    routes.images.view('*'),
    routes.images.edit('*'),
    routes.shares.list,
    routes.shares.create,
    routes.shares.view('*'),
    routes.appointments.list,
    routes.appointments.create,
    routes.appointments.view('*'),
    routes.appointments.edit('*'),
    routes.patients.list,
    routes.patients.view('*'),
    routes.settings.profile,
    routes.settings.security,
    routes.settings.notifications,
    routes.settings.preferences,
    routes.settings.devices,
  ],
  [Role.ADMIN]: [
    // Admins have access to all routes
    '*',
  ],
};

export function isRouteForRole(route: string | Route, role: Role | UserRole): boolean {
  // If role is UserRole type, check base path
  if (typeof role === 'string' && ['Admin', 'Provider', 'Patient'].includes(role)) {
    const basePath = PROTECTED_BASE_PATHS[role.toUpperCase() as keyof typeof PROTECTED_BASE_PATHS];
    return route.startsWith(basePath);
  }

  // Handle Role enum type
  const enumRole = role as Role;
  if (enumRole === Role.ADMIN) return true;

  const allowedRoutes = ROUTE_ACCESS[enumRole];
  return allowedRoutes.some(allowedRoute => {
    if (allowedRoute === '*') return true;
    if (typeof allowedRoute === 'string' && allowedRoute.includes('*')) {
      const pattern = allowedRoute.replace('*', '.*');
      return new RegExp(pattern).test(route.toString());
    }
    return route === allowedRoute;
  });
}

// Type for route values that might be functions or strings
type RouteValue = string | ((param: string) => string);

export function getAuthorizedRoutes(role: Role): string[] {
  if (role === Role.ADMIN) {
    return Object.values(routes).flatMap(group => 
      Object.values(group).map(route => 
        typeof route === 'function' ? route('*') : route
      )
    );
  }
  return ROUTE_ACCESS[role].map(route => {
    if (typeof route === 'string') return route;
    // This can't happen in our current structure, but TypeScript doesn't know that
    return route;
  });
}

export type Routes = typeof routes;

// Helper to get base path for a role
export function getBasePathForRole(role: Role): string {
  return PROTECTED_BASE_PATHS[role] || '/';
}

// Helper to check if a path starts with a protected base path
export function isProtectedPath(path: string): boolean {
  return Object.values(PROTECTED_BASE_PATHS).some(basePath => path.startsWith(basePath));
}

export type UserRole = 'Admin' | 'Provider' | 'Patient';

// Define route types for each user role
export type AdminRoutes = typeof routes.admin;
export type ProvidersRoutes = typeof routes.providers;
export type PatientsRoutes = typeof routes.patients;
export type RootRoutes = typeof routes.root;

// Define the union type of all possible route values
export type RoutePath = 
  | (typeof routes.admin)[keyof typeof routes.admin]
  | (typeof routes.providers)[keyof typeof routes.providers]
  | (typeof routes.patients)[keyof typeof routes.patients]
  | (typeof routes.root)[keyof typeof routes.root];

export const getRoutesByRole = (role: UserRole): any => {
  switch (role) {
    case 'Admin':
      return {
        dashboard: routes.dashboard.admin,
        ...routes.admin
      };
    case 'Provider':
      return {
        dashboard: routes.dashboard.provider,
        ...routes.images,
        ...routes.shares,
        ...routes.appointments,
        ...routes.patients
      };
    case 'Patient':
      return {
        dashboard: routes.dashboard.patient,
        ...routes.images,
        ...routes.shares,
        ...routes.appointments
      };
    default:
      return {};
  }
}; 