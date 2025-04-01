import prisma from '../lib/prisma.js';
import { Role } from '@prisma/client';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { clerkClient } from '@clerk/clerk-sdk-node';
export const getCurrentUser = catchAsync(async (req, res) => {
    const { id } = req.user;
    const user = await prisma.user.findUnique({
        where: { id }
    });
    if (!user) {
        throw new AppError('User not found', 404);
    }
    return res.status(200).json({
        status: 'success',
        data: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image
        }
    });
});
export const logout = catchAsync(async (req, res) => {
    // In the real application, we will want to invalidate the token
    // by adding it to a blacklist or removing it from a whitelist
    // You could also clear cookies if you're using cookie-based authentication
    res.status(200).json({
        status: 'success',
        data: null
    });
});
export const syncUser = async (req, res) => {
    try {
        console.log("SYNC USER ENDPOINT CALLED", req.method, req.url);
        console.log("Request params:", req.params);
        console.log("Request body:", req.body);
        console.log("Request headers:", Object.keys(req.headers));
        // Get Clerk ID from request
        const clerkId = req.params.clerkId || req.body.clerkId || req.query.clerkId;
        if (!clerkId) {
            console.error("No Clerk ID provided");
            return res.status(400).json({
                success: false,
                message: 'Clerk ID is required'
            });
        }
        console.log(`Attempting to sync user with Clerk ID: ${clerkId}`);
        // Extract token from Authorization header if present
        let tokenUserId = null;
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                console.log('Verifying token from Authorization header');
                // Verify the token and get the user ID
                const verifiedToken = await clerkClient.verifyToken(token);
                if (verifiedToken && verifiedToken.sub) {
                    tokenUserId = verifiedToken.sub;
                    console.log(`Token verified successfully for user: ${tokenUserId}`);
                    // Security check: Only allow users to sync their own data unless they have a special header
                    if (tokenUserId !== clerkId && !req.headers['x-admin-override']) {
                        console.error(`Token user ${tokenUserId} is not authorized to sync user ${clerkId}`);
                        return res.status(403).json({
                            success: false,
                            message: 'You are not authorized to sync this user'
                        });
                    }
                }
            }
            catch (tokenError) {
                console.log('Token verification failed but proceeding with sync', tokenError);
                // Continue with sync even if token verification fails
                // This allows the endpoint to work without a token for initial setup
            }
        }
        else {
            console.log('No Authorization header provided, proceeding with sync anyway');
        }
        try {
            // Get user details from Clerk
            const clerkUser = await clerkClient.users.getUser(clerkId);
            if (!clerkUser) {
                console.error(`User not found in Clerk with ID: ${clerkId}`);
                return res.status(404).json({
                    success: false,
                    message: 'User not found in Clerk'
                });
            }
            console.log(`Found Clerk user: ${clerkUser.firstName} ${clerkUser.lastName}, email: ${clerkUser.emailAddresses[0]?.emailAddress}`);
            // Default to PATIENT role if not specified
            const role = (req.body?.role || clerkUser.publicMetadata?.role || clerkUser.unsafeMetadata?.role || 'PATIENT');
            console.log(`Using role: ${role} for user ${clerkId}`);
            // Format email verification date
            const emailVerifiedAt = clerkUser.emailAddresses[0]?.verification?.status === 'verified'
                ? new Date()
                : null;
            // Get primary email
            const primaryEmailId = clerkUser.primaryEmailAddressId;
            const primaryEmail = clerkUser.emailAddresses.find(emailObj => emailObj.id === primaryEmailId);
            if (!primaryEmail?.emailAddress) {
                console.error(`No primary email found for Clerk user: ${clerkId}`);
                return res.status(400).json({
                    success: false,
                    message: 'User has no primary email address'
                });
            }
            // Check if user already exists in the database by authId (Clerk ID)
            const existingUserByAuthId = await prisma.user.findFirst({
                where: { authId: clerkId }
            });
            // Also check if user already exists by email
            const existingUserByEmail = !existingUserByAuthId ? await prisma.user.findFirst({
                where: { email: primaryEmail.emailAddress }
            }) : null;
            if (existingUserByAuthId) {
                console.log(`User already exists in database with ID: ${existingUserByAuthId.id}, authId: ${existingUserByAuthId.authId}`);
            }
            else if (existingUserByEmail) {
                console.log(`User exists in database with email: ${existingUserByEmail.email}, ID: ${existingUserByEmail.id}`);
            }
            else {
                console.log(`User not found in database, will create new user with Clerk ID: ${clerkId}`);
            }
            // Generate name from Clerk data
            const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User';
            let user;
            if (existingUserByAuthId) {
                // Update existing user identified by authId
                user = await prisma.user.update({
                    where: { id: existingUserByAuthId.id },
                    data: {
                        name,
                        email: primaryEmail.emailAddress,
                        emailVerified: emailVerifiedAt,
                        role,
                        isActive: true,
                        lastLoginAt: new Date(),
                        image: clerkUser.imageUrl || existingUserByAuthId.image,
                    }
                });
                console.log(`Updated existing user: ${user.id}`);
            }
            else if (existingUserByEmail) {
                // Link existing user found by email to this Clerk ID
                user = await prisma.user.update({
                    where: { id: existingUserByEmail.id },
                    data: {
                        authId: clerkId, // Link to Clerk account
                        name,
                        emailVerified: emailVerifiedAt,
                        role,
                        isActive: true,
                        lastLoginAt: new Date(),
                        image: clerkUser.imageUrl || existingUserByEmail.image,
                    }
                });
                console.log(`Linked existing user by email: ${user.id} with Clerk ID: ${clerkId}`);
            }
            else {
                // Create new user with properly generated username
                const timestamp = Date.now().toString().slice(-6);
                const firstName = clerkUser.firstName || '';
                const lastName = clerkUser.lastName || '';
                const baseUsername = `${firstName}${lastName}`.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
                // Create username with timestamp to ensure uniqueness
                const username = baseUsername.length < 3
                    ? `user_${timestamp}`
                    : `${baseUsername}_${timestamp}`;
                user = await prisma.user.create({
                    data: {
                        authId: clerkId,
                        name,
                        email: primaryEmail.emailAddress,
                        username,
                        password: '', // Empty since we're using Clerk
                        emailVerified: emailVerifiedAt,
                        role,
                        isActive: true,
                        lastLoginAt: new Date(),
                        image: clerkUser.imageUrl,
                    }
                });
                console.log(`Created new user: ${user.id} with authId: ${clerkId}`);
            }
            // Update Clerk metadata with the role and database ID
            try {
                await clerkClient.users.updateUser(clerkId, {
                    publicMetadata: {
                        role,
                        dbSynced: true,
                        dbUserId: user.id,
                        syncTimestamp: new Date().toISOString()
                    }
                });
                console.log(`Updated Clerk metadata for user ${user.id} with role: ${role}`);
            }
            catch (clerkError) {
                console.error('Error updating Clerk metadata:', clerkError);
                // Continue anyway as this is non-critical
            }
            return res.status(200).json({
                success: true,
                user,
                wasCreated: !existingUserByAuthId && !existingUserByEmail
            });
        }
        catch (error) {
            console.error(`Error during user sync:`, error);
            return res.status(500).json({
                success: false,
                message: 'Failed to sync user with Clerk',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    catch (error) {
        console.error('Unexpected error in syncUser:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
// Helper function to check if a field exists in a model
async function checkFieldExists(model, field) {
    try {
        // Use Prisma's raw query to check if the column exists
        const result = await prisma.$queryRaw `
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = ${model.toLowerCase()}
      AND column_name = ${field}
    `;
        return Array.isArray(result) && result.length > 0;
    }
    catch (error) {
        console.error(`Error checking if ${field} exists in ${model}:`, error);
        return false;
    }
}
// Create a test user (for development)
export const createTestUser = async (req, res) => {
    console.log('Creating test user:', req.body);
    const { name, email, role } = req.body;
    if (!name || !email) {
        return res.status(400).json({
            success: false,
            message: 'Name and email are required'
        });
    }
    try {
        const clerkId = `test_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        // Create or update user in database
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                name,
                role: role || Role.PATIENT,
                authId: clerkId,
                emailVerified: new Date(),
                isActive: true,
                lastLoginAt: new Date(),
            },
            create: {
                authId: clerkId,
                name,
                email,
                username: name.toLowerCase().replace(/\s+/g, '') || `user_${Date.now()}`,
                password: '', // Empty since we're using Clerk
                role: role,
                isActive: true,
                lastLoginAt: new Date(),
            }
        });
        console.log(`Test user successfully created with ID: ${user.id}`);
        return res.status(200).json({
            success: true,
            user
        });
    }
    catch (error) {
        console.error('Error creating test user:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create test user',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
// Handle 2FA code generation and sending via email
export const sendVerificationCode = async (req, res) => {
    console.log(`2FA: Send verification code request received for email: ${req.body?.email}`);
    try {
        const { email } = req.body;
        if (!email) {
            console.error('2FA: No email provided');
            return res.status(400).json({
                status: 'error',
                message: 'Email is required'
            });
        }
        // Look up the user by email
        console.log(`2FA: Looking up user with email: ${email}`);
        const user = await prisma.user.findFirst({
            where: { email: email.toLowerCase() }
        });
        if (!user) {
            console.error(`2FA: User not found with email: ${email}`);
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        if (!user.authId) {
            console.error(`2FA: User has no Clerk ID (authId): ${user.id}`);
            return res.status(400).json({
                status: 'error',
                message: 'User has no associated Clerk account'
            });
        }
        console.log(`2FA: User found: ${user.id}, authId: ${user.authId}`);
        // Instead of trying to directly use Clerk's API to send emails,
        // we should return the user's Clerk ID to the frontend
        // The frontend should handle the 2FA flow using Clerk's SDK directly
        console.log(`2FA: Returning Clerk ID for frontend to handle verification: ${user.authId}`);
        return res.status(200).json({
            status: 'success',
            message: 'User found. 2FA should be handled through Clerk in the frontend',
            clerkId: user.authId,
            userId: user.id
        });
    }
    catch (error) {
        console.error('2FA: Error processing verification request:', error);
        return res.status(500).json({
            status: 'error',
            message: 'An error occurred'
        });
    }
};
// Verify the 2FA code and complete authentication
export const verifyCode = async (req, res) => {
    console.log(`2FA: Verify code request received for email: ${req.body?.email}`);
    try {
        const { email, code, clerkId } = req.body;
        if (!email) {
            console.error('2FA: Missing email parameter');
            return res.status(400).json({
                status: 'error',
                message: 'Email is required'
            });
        }
        // Find user by email
        console.log(`2FA: Looking up user with email: ${email}`);
        const user = await prisma.user.findFirst({
            where: { email: email.toLowerCase() }
        });
        if (!user) {
            console.error(`2FA: User not found with email: ${email}`);
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        console.log(`2FA: User found: ${user.id}, authId: ${user.authId || 'none'}`);
        // This endpoint should primarily be used to update the user's lastLoginAt timestamp
        // and to update any necessary Clerk metadata
        // The actual code verification should be handled by Clerk in the frontend
        try {
            // Update the user's last login timestamp
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() }
            });
            console.log(`2FA: Updated last login time for user ${user.id}`);
            // Update Clerk metadata if this user has a Clerk ID
            if (user.authId) {
                try {
                    await clerkClient.users.updateUser(user.authId, {
                        publicMetadata: {
                            twoFactorVerified: true,
                            lastVerification: new Date().toISOString()
                        }
                    });
                    console.log(`2FA: Updated Clerk metadata for user ${user.id}, authId: ${user.authId}`);
                }
                catch (clerkError) {
                    console.error('2FA: Error updating Clerk metadata:', clerkError);
                    // Continue anyway as this is not critical
                }
            }
            return res.status(200).json({
                status: 'success',
                message: 'Verification successful',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            });
        }
        catch (dbError) {
            console.error('2FA: Database error updating user:', dbError);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to complete verification'
            });
        }
    }
    catch (error) {
        console.error('2FA: Error verifying code:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to verify code'
        });
    }
};
//# sourceMappingURL=auth.controller.js.map