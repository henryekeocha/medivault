import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { authId: userId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: {
        id: params.id,
        OR: [
          { patientId: user.id },
          { doctorId: user.id },
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
      userId: user.id,
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { authId: userId },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = await validateRequest(req, updateAppointmentSchema);

    // Fetch the appointment first to check permissions
    const appointment = await prisma.appointment.findUnique({
      where: {
        id: params.id,
        OR: [
          { patientId: user.id },
          { doctorId: user.id },
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
    if (user.role === 'PATIENT') {
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
      userId: user.id,
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { authId: userId },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only providers can delete appointments
    if (user.role !== 'PROVIDER') {
      return NextResponse.json(
        { error: 'Only providers can delete appointments' },
        { status: 403 }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: {
        id: params.id,
        doctorId: user.id,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Prevent deleting past appointments
    if (new Date(appointment.startTime) < new Date()) {
      return NextResponse.json(
        { error: 'Cannot delete past appointments' },
        { status: 400 }
      );
    }

    await prisma.appointment.delete({
      where: { id: params.id },
    });

    await hipaaLogger.log({
      action: 'DELETE_APPOINTMENT',
      userId: user.id,
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