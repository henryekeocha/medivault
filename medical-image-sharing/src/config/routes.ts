import type { Route } from '@/types/routes';
import { Role } from '@prisma/client';


// Define the base paths for protected routes
const PROTECTED_BASE_PATHS = {
  ADMIN: '/admin',
  PROVIDER: '/provider',
  PATIENT: '/patient',
} as const;

export const routes = {
  root: {
    home: '/' as Route,
    login: '/auth/login' as Route,
    register: '/auth/register' as Route,
    forgotPassword: '/auth/forgot-password' as Route,
    resetPassword: '/auth/reset-password' as Route,
    verifyEmail: '/auth/verify-email' as Route,
    privacyPolicy: '/privacy-policy' as Route,
    termsOfService: '/terms-of-service' as Route,
    settings: '/settings' as Route,
    profile: '/profile' as Route,
    devices: '/devices' as Route,
  },
  dashboard: {
    home: '/dashboard' as Route,
    patients: '/dashboard/patients' as Route,
    appointments: '/dashboard/appointments' as Route,
    reports: '/dashboard/reports' as Route,
    settings: '/dashboard/settings' as Route,
  },
  images: {
    list: '/images' as Route,
    upload: '/images/upload' as Route,
    view: (id: string) => `/images/${id}` as Route,
    edit: (id: string) => `/images/${id}/edit` as Route,
  },
  shares: {
    list: '/shares' as Route,
    create: '/shares/create' as Route,
    view: (id: string) => `/shares/${id}` as Route,
  },
  appointments: {
    list: '/appointments' as Route,
    create: '/appointments/create' as Route,
    view: (id: string) => `/appointments/${id}` as Route,
    edit: (id: string) => `/appointments/${id}/edit` as Route,
  },
  patients: {
    list: '/patients' as Route,
    view: (id: string) => `/patients/${id}` as Route,
    edit: (id: string) => `/patients/${id}/edit` as Route,
  },
  providers: {
    list: '/providers' as Route,
    view: (id: string) => `/providers/${id}` as Route,
    edit: (id: string) => `/providers/${id}/edit` as Route,
  },
  settings: {
    profile: '/settings/profile' as Route,
    security: '/settings/security' as Route,
    notifications: '/settings/notifications' as Route,
    preferences: '/settings/preferences' as Route,
    devices: '/account/devices' as Route,
  },
  admin: {
    home: '/admin' as Route,
    users: '/admin/users' as Route,
    roles: '/admin/roles' as Route,
    permissions: '/admin/permissions' as Route,
    settings: '/admin/settings' as Route,
    errorShowcase: '/admin/error-showcase' as Route,
    analytics: '/admin/analytics' as Route,
    stats: '/admin/stats' as Route,
    backups: '/admin/backups' as Route,
    testUsers: '/admin/test-users' as Route,
    audit: '/admin/audit' as Route,
    dashboard: '/admin/dashboard' as Route,
    storage: '/admin/storage' as Route,
    images: '/admin/images' as Route,
    appointments: '/admin/appointments' as Route,
    messages: '/admin/messages' as Route,
    reports: '/admin/reports' as Route,
    patients: '/admin/patients' as Route,
    patientsView: (id: string) => `/admin/patients/${id}` as Route,
    patientsEdit: (id: string) => `/admin/patients/${id}/edit` as Route,
    patientsAdd: '/admin/patients/add' as Route,
    providers: '/admin/providers' as Route,
    providersView: (id: string) => `/admin/providers/${id}` as Route,
    providersEdit: (id: string) => `/admin/providers/${id}/edit` as Route,
    providersAdd: '/admin/providers/add' as Route,
  },
  auth: {
    login: '/auth/login' as Route,
    register: '/auth/register' as Route,
    logout: '/auth/logout' as Route,
    callback: '/api/auth/callback' as Route,
    error: '/auth/error' as Route,
  },
  api: {
    auth: {
      signIn: '/api/auth/signin' as Route,
      signOut: '/api/auth/signout' as Route,
      session: '/api/auth/session' as Route,
    },
  },
  messages: {
    list: '/messages' as Route,
    view: (id: string) => `/messages/${id}` as Route,
    create: '/messages/create' as Route,
  },
  health: {
    dashboard: '/health' as Route,
    records: '/health/records' as Route,
    metrics: '/health/metrics' as Route,
  },
  profile: {
    view: '/profile' as Route,
    edit: '/profile/edit' as Route,
    mfa: '/profile/mfa' as Route,
  },
  patient: {
    dashboard: '/patient/dashboard' as Route,
    share: '/patient/share' as Route,
    analytics: '/patient/analytics' as Route,
    upload: '/patient/upload' as Route,
    images: '/patient/images' as Route,
    appointments: '/patient/appointments' as Route,
    messages: '/patient/messages' as Route,
    records: '/patient/records' as Route,
    settings: '/patient/settings' as Route,
    chatbot: '/patient/chatbot' as Route,
    providers: '/patient/providers' as Route,
  },
  provider: {
    dashboard: '/provider/dashboard' as Route,
    share: '/provider/share' as Route,
    analytics: '/provider/analytics' as Route,
    upload: '/provider/upload' as Route,
    availability: '/provider/availability' as Route,
    profile: '/provider/profile' as Route,
    verification: '/provider/verification' as Route,
    directory: '/provider/directory' as Route,
    images: '/provider/images' as Route,
    appointments: '/provider/appointments' as Route,
    analysis: '/provider/analysis' as Route,
    messages: '/provider/messages' as Route,
    settings: '/provider/settings' as Route,
    patients: '/provider/patients' as Route,
  },
  account: {
    settings: '/account/settings' as Route,
    security: '/account/security' as Route,
    preferences: '/account/preferences' as Route,
  },
} as const;

export const DEFAULT_ROUTES = {
  [Role.PATIENT]: routes.patient.dashboard,
  [Role.PROVIDER]: routes.provider.dashboard,
  [Role.ADMIN]: routes.admin.dashboard,
} as const;

// Define route access by role
export const ROUTE_ACCESS = {
  [Role.PATIENT]: [
    routes.dashboard.patients,
    routes.root.profile,
    routes.root.settings,
    routes.images.list,
    routes.shares.list,
    routes.appointments.list,
    routes.messages.list,
    routes.health.dashboard,
    routes.patient.dashboard,
    routes.patient.share,
    routes.patient.analytics,
    routes.patient.upload,
    routes.patient.images,
    routes.patient.appointments,
    routes.patient.messages,
    routes.patient.records,
    routes.patient.settings,
    routes.patient.chatbot,
    routes.patient.providers,
    routes.account.settings,
  ],
  [Role.PROVIDER]: [
    routes.dashboard.patients,
    routes.root.profile,
    routes.root.settings,
    routes.images.list,
    routes.images.upload,
    routes.shares.list,
    routes.shares.create,
    routes.appointments.list,
    routes.appointments.create,
    routes.patients.list,
    routes.messages.list,
    routes.health.dashboard,
    routes.provider.dashboard,
    routes.provider.share,
    routes.provider.analytics,
    routes.provider.upload,
    routes.provider.availability,
    routes.provider.profile,
    routes.provider.verification,
    routes.provider.directory,
    routes.provider.images,
    routes.provider.appointments,
    routes.provider.analysis,
    routes.provider.messages,
    routes.provider.settings,
    routes.provider.patients,
  ],
  [Role.ADMIN]: [
    routes.dashboard.patients,
    routes.root.profile,
    routes.root.settings,
    ...Object.values(routes.admin),
    routes.messages.list,
  ],
} as const;

// Helper function to get routes based on role
export function getRoutesByRole(role: Role | UserRole) {
  switch (role) {
    case Role.ADMIN:
    case 'Admin':
      return {
        ...routes.admin,
        messages: routes.messages,
        profile: routes.profile,
      };
    case Role.PROVIDER:
    case 'Provider':
      return {
        ...routes.provider,
        ...routes.images,
        ...routes.shares,
        ...routes.appointments,
        ...routes.patients,
        ...routes.root,
        messages: routes.messages,
        health: routes.health,
        profile: routes.profile,
      };
    case Role.PATIENT:
    case 'Patient':
      return {
        ...routes.patient,
        ...routes.images,
        ...routes.shares,
        ...routes.appointments,
        ...routes.root,
        messages: routes.messages,
        health: routes.health,
        profile: routes.profile,
        account: routes.account,
      };
    default:
      return {
        dashboard: routes.dashboard.patients,
        ...routes.root,
      };
  }
}

export function isRouteForRole(route: string | Route, role: Role): boolean {
  const allowedRoutes = ROUTE_ACCESS[role];
  return allowedRoutes.includes(route as Route);
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

// Helper to convert Route type to string for router.push
export function toPath(route: Route): string {
  return route as string;
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