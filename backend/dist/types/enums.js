export var Role;
(function (Role) {
    Role["PATIENT"] = "PATIENT";
    Role["PROVIDER"] = "PROVIDER";
    Role["ADMIN"] = "ADMIN";
})(Role || (Role = {}));
export var ProviderSpecialty;
(function (ProviderSpecialty) {
    ProviderSpecialty["GENERAL"] = "GENERAL";
    ProviderSpecialty["RADIOLOGY"] = "RADIOLOGY";
    ProviderSpecialty["CARDIOLOGY"] = "CARDIOLOGY";
    ProviderSpecialty["NEUROLOGY"] = "NEUROLOGY";
    ProviderSpecialty["ORTHOPEDICS"] = "ORTHOPEDICS";
    ProviderSpecialty["OTHER"] = "OTHER";
})(ProviderSpecialty || (ProviderSpecialty = {}));
export var NotificationType;
(function (NotificationType) {
    NotificationType["NEW_SHARE"] = "NEW_SHARE";
    NotificationType["NEW_MESSAGE"] = "NEW_MESSAGE";
    NotificationType["ANNOTATION_ADDED"] = "ANNOTATION_ADDED";
    NotificationType["SECURITY_ALERT"] = "SECURITY_ALERT";
    NotificationType["SYSTEM_UPDATE"] = "SYSTEM_UPDATE";
    NotificationType["UPLOAD_COMPLETE"] = "UPLOAD_COMPLETE";
    NotificationType["FILE_SHARED"] = "FILE_SHARED";
    NotificationType["FILE_DOWNLOADED"] = "FILE_DOWNLOADED";
    NotificationType["FILE_DELETED"] = "FILE_DELETED";
    NotificationType["PROCESSING_ERROR"] = "PROCESSING_ERROR";
    NotificationType["APPOINTMENT_CREATED"] = "APPOINTMENT_CREATED";
    NotificationType["APPOINTMENT_COMPLETED"] = "APPOINTMENT_COMPLETED";
    NotificationType["APPOINTMENT_CANCELLED"] = "APPOINTMENT_CANCELLED";
    NotificationType["APPOINTMENT_NO_SHOW"] = "APPOINTMENT_NO_SHOW";
})(NotificationType || (NotificationType = {}));
export var ImageType;
(function (ImageType) {
    ImageType["XRAY"] = "XRAY";
    ImageType["MRI"] = "MRI";
    ImageType["CT"] = "CT";
    ImageType["ULTRASOUND"] = "ULTRASOUND";
    ImageType["OTHER"] = "OTHER";
})(ImageType || (ImageType = {}));
export var ImageStatus;
(function (ImageStatus) {
    ImageStatus["PROCESSING"] = "PROCESSING";
    ImageStatus["READY"] = "READY";
    ImageStatus["ERROR"] = "ERROR";
})(ImageStatus || (ImageStatus = {}));
export var AppointmentStatus;
(function (AppointmentStatus) {
    AppointmentStatus["SCHEDULED"] = "SCHEDULED";
    AppointmentStatus["COMPLETED"] = "COMPLETED";
    AppointmentStatus["CANCELLED"] = "CANCELLED";
    AppointmentStatus["NO_SHOW"] = "NO_SHOW";
})(AppointmentStatus || (AppointmentStatus = {}));
export var ShareType;
(function (ShareType) {
    ShareType["LINK"] = "LINK";
    ShareType["DIRECT"] = "DIRECT";
    ShareType["EMAIL"] = "EMAIL";
})(ShareType || (ShareType = {}));
export var SharePermission;
(function (SharePermission) {
    SharePermission["VIEW"] = "VIEW";
    SharePermission["COMMENT"] = "COMMENT";
    SharePermission["EDIT"] = "EDIT";
})(SharePermission || (SharePermission = {}));
export var AnnotationType;
(function (AnnotationType) {
    AnnotationType["MARKER"] = "MARKER";
    AnnotationType["MEASUREMENT"] = "MEASUREMENT";
    AnnotationType["TEXT"] = "TEXT";
    AnnotationType["DRAWING"] = "DRAWING";
})(AnnotationType || (AnnotationType = {}));
export var PatientStatus;
(function (PatientStatus) {
    PatientStatus["ACTIVE"] = "ACTIVE";
    PatientStatus["INACTIVE"] = "INACTIVE";
    PatientStatus["PENDING"] = "PENDING";
})(PatientStatus || (PatientStatus = {}));
export var HealthMetricType;
(function (HealthMetricType) {
    HealthMetricType["BLOOD_PRESSURE"] = "BLOOD_PRESSURE";
    HealthMetricType["HEART_RATE"] = "HEART_RATE";
    HealthMetricType["TEMPERATURE"] = "TEMPERATURE";
    HealthMetricType["WEIGHT"] = "WEIGHT";
    HealthMetricType["HEIGHT"] = "HEIGHT";
    HealthMetricType["BLOOD_SUGAR"] = "BLOOD_SUGAR";
    HealthMetricType["OXYGEN_SATURATION"] = "OXYGEN_SATURATION";
    HealthMetricType["PAIN_LEVEL"] = "PAIN_LEVEL";
})(HealthMetricType || (HealthMetricType = {}));
//# sourceMappingURL=enums.js.map