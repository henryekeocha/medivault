import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET: Secret = process.env.JWT_SECRET!;

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    console.log('Login attempt details:', { email, attemptedPassword: password.slice(0, 1) + '***' });

    // Input validation
    if (!email || !password) {
      console.log('Missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    console.log('Searching for user with email:', email);
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // Check if user exists
    if (!user) {
      console.log('User not found for email:', email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    console.log('User found:', { 
      id: user.id,
      email: user.email, 
      role: user.role,
      hasPassword: !!user.password,
      passwordLength: user.password.length
    });

    // Verify password
    console.log('Attempting password verification...');
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Password verification result:', isValidPassword);

    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    console.log('Generating JWT token...');
    const token = jwt.sign(
      {
        sub: user.id,
        userId: user.id,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as SignOptions
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      {
        sub: user.id,
        userId: user.id,
        email: user.email,
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' } as SignOptions
    );

    // Return user data and token (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    console.log('Login successful for user:', { 
      id: user.id,
      email: user.email, 
      role: user.role,
      tokenGenerated: !!token,
      refreshTokenGenerated: !!refreshToken
    });
    
    // Set cookies for extra security
    const response = NextResponse.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token,
      refreshToken
    });

    // Set cookies with HttpOnly for better security
    // These will be backup to localStorage for middleware
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 day in seconds
      path: '/'
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      path: '/'
    });
    
    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
} 