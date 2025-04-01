/**
 * Authentication options and constants
 */
// Re-export the Prisma Role enum for backward compatibility
export { Role as UserRole } from '@prisma/client';
/**
 * Cookie names for authentication tokens
 */
export const AUTH_COOKIE_NAME = 'auth_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';
/**
 * Token expiration times
 */
export const TOKEN_EXPIRY = {
    ACCESS: '15m',
    REFRESH: '7d'
};
/**
 * Password requirements for user registration and password changes
 */
export const PASSWORD_REQUIREMENTS = {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true
};
//# sourceMappingURL=auth-options.js.map