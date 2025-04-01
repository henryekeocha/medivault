import { NextRequest, NextResponse } from 'next/server';
import { WebhookEvent } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';
import { Role } from '@prisma/client';

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 100; // Maximum requests per minute

export async function POST(req: NextRequest) {
  try {
    // Get the IP for rate limiting
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    // Rate limiting check
    const now = Date.now();
    const rateLimit = rateLimitMap.get(ip);
    
    if (rateLimit) {
      if (now - rateLimit.timestamp > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(ip, { count: 1, timestamp: now });
      } else if (rateLimit.count >= MAX_REQUESTS) {
        console.error(`Rate limit exceeded for IP: ${ip}`);
        return new Response(JSON.stringify({ error: 'Too many requests' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        });
      } else {
        rateLimit.count++;
      }
    } else {
      rateLimitMap.set(ip, { count: 1, timestamp: now });
    }

    // Get the body
    let payload;
    let evt: WebhookEvent;
    
    try {
      payload = await req.json();
      evt = payload as WebhookEvent;
    } catch (jsonError) {
      console.error('Error parsing request body:', jsonError);
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Get the event type
    const eventType = evt.type;
    console.log(`Clerk event received: ${eventType}`);

    // Handle the event
    try {
      // Handle Factor (MFA) events
      if (eventType.startsWith('factor.')) {
        const data = evt.data as any; // Use any type for flexibility with webhook data
        const userId = data.user_id;
        const status = data.status;
        
        console.log(`Clerk: ${eventType} event received`, { id: data.id, userId, status });
        
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Missing user ID' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }
        
        // Get user from database
        const dbUser = await prisma.user.findFirst({
          where: { authId: userId }
        });
        
        if (!dbUser) {
          console.error(`User not found in database for Clerk ID: ${userId}`);
          return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }
        
        // MFA status is now handled by Clerk - no need to store it in our database
        const isEnabled = (eventType as string).startsWith('factor.') && 
                         ((eventType as string) === 'factor.created' || 
                         ((eventType as string) === 'factor.verified' && status === 'verified'));
        
        console.log(`MFA status changed for user ${dbUser.id}: ${isEnabled ? 'enabled' : 'disabled'}`);
        
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      
      if (eventType === 'user.created') {
        const { id, email_addresses, first_name, last_name, image_url, unsafe_metadata } = evt.data;
        
        console.log('Clerk: user.created event received', { id, email: email_addresses?.[0]?.email_address });
        console.log('Clerk: user metadata', unsafe_metadata);
        
        // Validate required fields
        if (!id || !email_addresses?.[0]?.email_address) {
          console.error('Clerk: Missing required fields');
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }

        // Get email address
        const email = email_addresses[0].email_address;
        const emailVerified = email_addresses[0]?.verification?.status === 'verified' ? 
          new Date() : null;

        // Get role from unsafe_metadata or default to PATIENT
        const role = (unsafe_metadata?.role as Role) || Role.PATIENT;
        console.log('Clerk: Using role:', role);
        
        // Validate role - only allow PATIENT or PROVIDER
        if (role !== Role.PATIENT && role !== Role.PROVIDER) {
          console.error(`Invalid role attempted: ${role}`);
          return new Response(JSON.stringify({ error: 'Invalid role' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }

        // Format name
        const name = `${first_name || ''} ${last_name || ''}`.trim();
        
        // Generate a unique username
        const baseUsername = `${first_name || ''}${last_name || ''}`.toLowerCase().replace(/\s+/g, '') || `user_${Date.now().toString().slice(-6)}`;
        const timestamp = Date.now().toString().slice(-6);
        const username = `${baseUsername}_${timestamp}`;

        try {
          // Retry logic for database operations
          let retries = 0;
          const maxRetries = 3;
          let user = null;

          while (retries < maxRetries && !user) {
            try {
              // Check if user already exists first
              const existingUser = await prisma.user.findFirst({
                where: { authId: id }
              });

              if (existingUser) {
                console.log('User already exists:', existingUser);
                
                // Update existing user with the latest information
                user = await prisma.user.update({
                  where: { id: existingUser.id },
                  data: {
                    email,
                    name,
                    role,
                    image: image_url,
                    lastLoginAt: new Date(),
                    emailVerified: emailVerified || existingUser.emailVerified,
                  }
                });
                
                console.log('Updated existing user:', user);
              } else {
                // Create user in database
                user = await prisma.user.create({
                  data: {
                    authId: id,
                    email,
                    name,
                    username,
                    image: image_url,
                    role,
                    password: '', // Empty password since we're using Clerk
                    isActive: true,
                    emailVerified: emailVerified || new Date(),
                    lastLoginAt: new Date(),
                  },
                });

                console.log('Created user in database:', user);
              }
              
              // Update Clerk metadata with the role from database
              console.log('Updating Clerk metadata with role:', role);
              try {
                await fetch(`https://api.clerk.dev/v1/users/${id}`, {
                  method: 'PATCH',
                  headers: {
                    'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    public_metadata: { 
                      role: user!.role,
                      dbSynced: true,
                      dbUserId: user!.id
                    }
                  })
                });
                console.log('Clerk metadata updated successfully with role:', user!.role);
              } catch (metadataError) {
                console.error('Error updating Clerk metadata:', metadataError);
                // Still return success since user was created in the database
              }
              
              break; // Success, exit the retry loop
            } catch (dbError) {
              retries++;
              console.error(`Database operation failed (attempt ${retries}/${maxRetries}):`, dbError);
              
              if (retries >= maxRetries) {
                throw dbError; // Rethrow after max retries
              }
              
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
            }
          }

          return new Response(JSON.stringify({ user }), {
            status: user?.id ? 200 : 201,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } catch (error) {
          console.error('Error in user.created event:', error);
          return new Response(JSON.stringify({ 
            error: 'Failed to create or update user',
            details: error instanceof Error ? error.message : String(error)
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }
      }

      if (eventType === 'user.updated') {
        const { id, email_addresses, first_name, last_name, image_url, public_metadata, unsafe_metadata } = evt.data;
        
        console.log('Clerk: user.updated event received', { id });
        console.log('Clerk: user metadata', { public_metadata, unsafe_metadata });
        
        // Validate required fields
        if (!id) {
          return new Response(JSON.stringify({ error: 'Missing user ID' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }

        // Get user from database first
        const dbUser = await prisma.user.findFirst({
          where: { authId: id }
        });

        if (!dbUser) {
          console.error(`User not found in database for Clerk ID: ${id}`);
          return new Response(JSON.stringify({ error: 'User not found' }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }

        // Validate role if it's being updated
        if (public_metadata?.role) {
          const newRole = public_metadata.role as Role;
          if (newRole !== Role.PATIENT && newRole !== Role.PROVIDER) {
            console.error(`Invalid role attempted: ${newRole}`);
            return new Response(JSON.stringify({ error: 'Invalid role' }), {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
              },
            });
          }
        }

        // Update user in database
        const user = await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            email: email_addresses?.[0]?.email_address || dbUser.email,
            name: `${first_name || ''} ${last_name || ''}`.trim() || dbUser.name,
            image: image_url,
            role: public_metadata?.role || dbUser.role,
          },
        });

        // Update Clerk metadata with role from database
        await fetch(`https://api.clerk.dev/v1/users/${id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            public_metadata: { role: user.role }
          })
        });

        return new Response(JSON.stringify({ user }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }

      if (eventType === 'user.deleted') {
        const { id } = evt.data;

        if (!id) {
          return new Response(JSON.stringify({ error: 'Missing user ID' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }

        // Delete user by authId
        await prisma.user.deleteMany({
          where: { authId: id },
        });

        return new Response(null, { status: 204 });
      }

      // Return 200 for other event types
      return new Response(null, { status: 200 });
    } catch (error) {
      console.error('Error handling Clerk event:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error) {
    console.error('Error processing Clerk event:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
} 