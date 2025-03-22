import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../app/api/auth/[...nextauth]/route';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';

// This is a temporary implementation that stores files locally
// In production, you would use a real S3-compatible storage service

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const providedKey = formData.get('key') as string;
    const accessLevel = formData.get('accessLevel') as string || 'public';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Generate a unique filename if no key is provided
    const key = providedKey || `uploads/${session.user.id}/${uuidv4()}_${file.name}`;
    
    // Get file as buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // In a real implementation, you would upload to S3 or another storage service
    // For demo purposes, we'll save to the local filesystem
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const filePath = join(uploadsDir, key.replace(/\//g, '_'));
    
    await writeFile(filePath, buffer);
    
    // Store file metadata in database
    await prisma.fileUpload.create({
      data: {
        key,
        filename: file.name,
        contentType: file.type,
        size: buffer.length,
        userId: session.user.id,
        url: `/uploads/${key.replace(/\//g, '_')}`,
        accessLevel,
        createdAt: new Date(),
      }
    });

    // Return the file info
    return NextResponse.json({
      key,
      url: `/uploads/${key.replace(/\//g, '_')}`,
      filename: file.name,
      contentType: file.type,
      size: buffer.length,
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'An error occurred uploading the file' },
      { status: 500 }
    );
  }
} 