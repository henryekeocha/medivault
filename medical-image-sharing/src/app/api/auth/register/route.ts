import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role, ProviderSpecialty } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { name, email, password, role, specialty, username } = await req.json();
    console.log('Received registration data:', { name, email, role, specialty, username });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword,
        role: role as Role || Role.PATIENT,
        specialty: specialty as ProviderSpecialty,
      },
    });

    console.log('User created successfully:', { id: user.id, email: user.email, role: user.role });

    return NextResponse.json({ 
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialty: user.specialty
      }
    });

  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'A user with this email or username already exists' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Error creating user' },
      { status: 500 }
    );
  }
}