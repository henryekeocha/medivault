import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { validateRequest } from '@/lib/validation';
import { hipaaLogger } from '@/lib/hipaa';
import { Role } from '@prisma/client';

// Validation schemas
const createAppointmentSchema = z.object({
  datetime: z.string().datetime(),
  doctorId: z.string().uuid(),
  notes: z.string().optional(),
  imageId: z.string().uuid().optional(),
});

const getAppointmentsQuerySchema = z.object({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().min(1).default(1), 
  limit: z.coerce.number().min(1).max(100).default(10),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { authId: userId },
      select: { id: true, role: true }
    });

    if (!user || user.role !== Role.PROVIDER) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const data = await validateRequest(req, createAppointmentSchema);
    const { datetime, doctorId, notes, imageId } = data;

    // Additional validation
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId, role: 'PROVIDER' },
    });

    if (!doctor) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Check if slot is available
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId,
        startTime: new Date(datetime),
        status: { not: 'CANCELLED' },
      },
    });

    if (existingAppointment) {
      return NextResponse.json(
        { error: 'Time slot is not available' },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        startTime: new Date(datetime),
        endTime: (() => {
          const end = new Date(datetime);
          end.setMinutes(end.getMinutes() + 30); // Default 30-minute slots
          return end;
        })(),
        patientId: user.id,
        doctorId,
        notes,
        imageId,
        status: 'SCHEDULED',
      },
      include: {
        patient: {
          select: {
            name: true,
            email: true,
          },
        },
        doctor: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    await hipaaLogger.log({
      action: 'CREATE_APPOINTMENT',
      userId: user.id,
      resourceId: appointment.id,
      details: `Appointment created with provider ${doctorId}`,
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { authId: userId },
      select: { id: true, role: true }
    });

    if (!user || user.role !== Role.PROVIDER) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = getAppointmentsQuerySchema.parse({
      status: searchParams.get('status'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    const where = {
      ...(user.role === Role.PROVIDER
        ? { doctorId: user.id }
        : { patientId: user.id }),
      ...(query.status && { status: query.status }),
      ...(query.startDate && {
        startTime: {
          gte: new Date(query.startDate),
          ...(query.endDate && { lte: new Date(query.endDate) }),
        },
      }),
    };

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
              email: true,
              specialty: true,
            },
          },
          image: {
            select: {
              id: true,
              type: true,
            },
          },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: {
          startTime: 'asc',
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    await hipaaLogger.log({
      action: 'VIEW_APPOINTMENTS',
      userId: user.id,
      details: `Retrieved appointments list`,
    });

    return NextResponse.json({
      appointments,
      pagination: {
        currentPage: query.page,
        totalPages: Math.ceil(total / query.limit),
        totalItems: total,
        itemsPerPage: query.limit,
      },
    });
  } catch (error) {
    console.error('Error retrieving appointments:', error);
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