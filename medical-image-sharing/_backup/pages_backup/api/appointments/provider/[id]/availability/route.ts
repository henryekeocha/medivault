import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { hipaaLogger } from '@/lib/hipaa';

// Define the user with settings type
interface UserWithSettings {
  id: string;
  name: string;
  email: string;
  role: string;
  settings?: {
    workingHours: string | WorkingHours | null;
  } | null;
  // Other user properties
}

const availabilityQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

interface WorkingHours {
  start: number;
  end: number;
  slotDuration: number;
}

interface UserSettings { 
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  messageNotifications: boolean;
  shareNotifications: boolean;
  theme: string;
  language: string;
  timezone: string;
  highContrast: boolean;
  fontSize: string;
  reduceMotion: boolean;
  profileVisibility: string;
  showOnlineStatus: boolean;
  workingHours: WorkingHours | null;
  updatedAt: Date;
}

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const WORKING_HOURS: WorkingHours = {
  start: 9, // 9 AM
  end: 17, // 5 PM
  slotDuration: 30, // 30 minutes
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = availabilityQuerySchema.parse({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    });

    // Validate provider exists
    const provider = await prisma.user.findUnique({
      where: {
        id: params.id,
        role: 'PROVIDER',
      },
      include: {
        settings: true
      }
    }) as unknown as UserWithSettings;

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Get existing appointments
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: params.id,
        startTime: {
          gte: new Date(query.startDate),
          lte: new Date(query.endDate),
        },
        status: { not: 'CANCELLED' },
      },
      select: {
        startTime: true,
      },
    }) as unknown as { startTime: Date }[];

    // Generate available time slots
    const workingHoursData = provider.settings?.workingHours 
      ? (typeof provider.settings.workingHours === 'string' 
        ? JSON.parse(provider.settings.workingHours) 
        : provider.settings.workingHours) as WorkingHours 
      : WORKING_HOURS;
    
    // Map the appointments to the format expected by generateTimeSlots
    const appointments = existingAppointments.map(apt => ({
      datetime: apt.startTime
    }));
    
    const availableSlots = generateTimeSlots(
      new Date(query.startDate),
      new Date(query.endDate),
      appointments,
      workingHoursData
    );

    await hipaaLogger.log({
      action: 'CHECK_PROVIDER_AVAILABILITY',
      userId: session.user.id,
      resourceId: provider.id,
      details: `Checked availability for provider ${provider.name}`,
    });

    return NextResponse.json({
      providerId: params.id,
      providerName: provider.name,
      availableSlots,
      workingHours: workingHoursData,
    });
  } catch (error) {
    console.error('Error checking provider availability:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateTimeSlots(
  startDate: Date,
  endDate: Date,
  existingAppointments: { datetime: Date }[],
  workingHours: WorkingHours
): string[] {
  const slots: string[] = [];
  const currentDate = new Date(startDate);
  const endDateTime = new Date(endDate);

  while (currentDate <= endDateTime) {
    // Skip weekends
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      for (
        let hour = workingHours.start;
        hour < workingHours.end;
        hour++
      ) {
        for (
          let minute = 0;
          minute < 60;
          minute += workingHours.slotDuration
        ) {
          const slotTime = new Date(currentDate);
          slotTime.setHours(hour, minute, 0, 0);

          // Check if slot is in the future and not already booked
          if (
            slotTime > new Date() &&
            !existingAppointments.some(
              (apt) =>
                apt.datetime.getTime() === slotTime.getTime()
            )
          ) {
            slots.push(slotTime.toISOString());
          }
        }
      }
    }
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }

  return slots;
} 