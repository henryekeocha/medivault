import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { validateRequest } from '@/lib/validation';
import { hipaaLogger } from '@/lib/hipaa';

const updateAppointmentSchema = z.object({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  notes: z.string().optional(),
  imageId: z.string().uuid().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: {
        id: params.id,
        OR: [
          { patientId: session.user.id },
          { doctorId: session.user.id },
        ],
      },
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
            fileType: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    await hipaaLogger.log({
      action: 'VIEW_APPOINTMENT',
      userId: session.user.id,
      resourceId: appointment.id,
      details: `Viewed appointment details`,
    });

    return NextResponse.json(appointment);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await validateRequest(req, updateAppointmentSchema);

    // Fetch the appointment first to check permissions
    const appointment = await prisma.appointment.findUnique({
      where: {
        id: params.id,
        OR: [
          { patientId: session.user.id },
          { doctorId: session.user.id },
        ],
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Validate permissions based on role and status change
    if (session.user.role === 'PATIENT') {
      if (data.status && data.status !== 'CANCELLED') {
        return NextResponse.json(
          { error: 'Patients can only cancel appointments' },
          { status: 403 }
        );
      }
    }

    // Prevent modifications to past appointments
    if (new Date(appointment.startTime) < new Date()) {
      return NextResponse.json(
        { error: 'Cannot modify past appointments' },
        { status: 400 }
      );
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: params.id },
      data,
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
      },
    });

    await hipaaLogger.log({
      action: 'UPDATE_APPOINTMENT',
      userId: session.user.id,
      resourceId: appointment.id,
      details: `Updated appointment status to ${data.status || 'no status change'}`,
    });

    return NextResponse.json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only providers can delete appointments
    if (session.user.role !== 'PROVIDER') {
      return NextResponse.json(
        { error: 'Only providers can delete appointments' },
        { status: 403 }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: {
        id: params.id,
        doctorId: session.user.id,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    await prisma.appointment.delete({
      where: { id: params.id },
    });

    await hipaaLogger.log({
      action: 'DELETE_APPOINTMENT',
      userId: session.user.id,
      resourceId: appointment.id,
      details: `Deleted appointment`,
    });

    return NextResponse.json(
      { message: 'Appointment deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 