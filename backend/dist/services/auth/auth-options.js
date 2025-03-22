/**
 * Authentication options and enums
 */
export var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["PROVIDER"] = "PROVIDER";
    UserRole["PATIENT"] = "PATIENT";
})(UserRole || (UserRole = {}));
export const AUTH_COOKIE_NAME = 'auth_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';
export const TOKEN_EXPIRY = {
    ACCESS: '15m',
    REFRESH: '7d'
};
export const PASSWORD_REQUIREMENTS = {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true
};
//# sourceMappingURL=auth-options.js.map