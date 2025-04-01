import { catchAsync } from '../../../utils/catchAsync.js';
import prisma from '../../../lib/prisma.js';
/**
 * Get patient-specific settings for the authenticated user
 * @param {AuthenticatedRequest} req - Express request object with authenticated user
 * @param {Response} res - Express response object
 * @returns {Promise<void>} - Returns patient settings or creates default settings
 */
export const getPatientSettings = catchAsync(async (req, res) => {
    const userId = req.user.id;
    // Get user settings from database
    const settings = await prisma.userSettings.findUnique({
        where: {
            userId,
        },
    });
    // Extract patient-specific settings from workingHours field or create defaults
    let patientSettings = {
        personalInfo: {
            firstName: '',
            lastName: '',
            dateOfBirth: '',
            phone: '',
            email: '',
            emergencyContact: {
                name: '',
                relationship: '',
                phone: '',
            },
        },
        privacy: {
            shareDataWithProviders: false,
            allowImageSharing: false,
            showProfileToOtherPatients: false,
            allowAnonymousDataUse: false,
        },
        notifications: {
            emailNotifications: true,
            smsNotifications: false,
            appointmentReminders: true,
            imageShareNotifications: true,
            providerMessages: true,
            marketingEmails: false,
        },
        communication: {
            preferredLanguage: 'en',
            preferredContactMethod: 'email',
            preferredAppointmentReminder: '24h',
        },
    };
    if (settings?.workingHours) {
        const workingHours = settings.workingHours;
        if (workingHours.patientSettings) {
            patientSettings = {
                ...patientSettings,
                ...workingHours.patientSettings,
            };
        }
        if (workingHours.personalInfo) {
            patientSettings.personalInfo = {
                ...patientSettings.personalInfo,
                ...workingHours.personalInfo,
            };
        }
    }
    res.status(200).json({
        status: 'success',
        data: patientSettings,
    });
});
/**
 * Update patient-specific settings for the authenticated user
 * @param {AuthenticatedRequest} req - Express request object with authenticated user
 * @param {Response} res - Express response object
 * @returns {Promise<void>} - Returns updated patient settings
 */
export const updatePatientSettings = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const updateData = req.body;
    // Get current settings
    const existingSettings = await prisma.userSettings.findUnique({
        where: {
            userId,
        },
    });
    const currentWorkingHours = existingSettings?.workingHours || {};
    // Merge new settings with existing settings
    const updatedWorkingHours = {
        ...currentWorkingHours,
        patientSettings: {
            ...(currentWorkingHours.patientSettings || {}),
            ...(updateData.privacy && { privacy: updateData.privacy }),
            ...(updateData.notifications && { notifications: updateData.notifications }),
            ...(updateData.communication && { communication: updateData.communication }),
        },
        personalInfo: {
            ...(currentWorkingHours.personalInfo || {}),
            ...(updateData.personalInfo || {}),
        },
    };
    // Update settings in database
    const settings = await prisma.userSettings.upsert({
        where: {
            userId,
        },
        update: {
            workingHours: updatedWorkingHours,
        },
        create: {
            userId,
            workingHours: updatedWorkingHours,
        },
    });
    // Format the response to match frontend expectations
    const patientSettings = {
        personalInfo: (updatedWorkingHours.personalInfo || {}),
        privacy: (updatedWorkingHours.patientSettings?.privacy || {}),
        notifications: (updatedWorkingHours.patientSettings?.notifications || {}),
        communication: (updatedWorkingHours.patientSettings?.communication || {}),
    };
    res.status(200).json({
        status: 'success',
        data: patientSettings,
    });
});
//# sourceMappingURL=settings.controller.js.map