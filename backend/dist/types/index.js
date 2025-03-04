export var UserRole;
(function (UserRole) {
    UserRole["USER"] = "user";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["PROVIDER"] = "PROVIDER";
    UserRole["PATIENT"] = "PATIENT";
})(UserRole || (UserRole = {}));
// Import instead of re-exporting to avoid name clashes
import * as AuthTypes from './auth.js';
import * as ModelTypes from './models.js';
import * as EnumTypes from './enums.js';
// Export namespaced types to avoid name clashes
export { AuthTypes, ModelTypes, EnumTypes };
//# sourceMappingURL=index.js.map