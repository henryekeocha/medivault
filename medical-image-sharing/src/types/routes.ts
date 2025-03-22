import type { RouteImpl } from 'next/dist/shared/lib/router/router';

// Make our Route type compatible with Next.js's RouteImpl
export type Route = RouteImpl<string>;

export const routes = {
  root: {
    home: '/' as Route,
    login: '/auth/login' as Route,
    register: '/auth/register' as Route,
    forgotPassword: '/auth/forgot-password' as Route,
    resetPassword: '/auth/reset-password' as Route,
    settings: '/settings' as Route,
    profile: '/profile' as Route,
    devices: '/devices' as Route,
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
} as const; 