import { NextRequest } from 'next/server';
import { z } from 'zod';

export async function validateRequest<T>(
  req: NextRequest,
  schema: z.Schema<T>
): Promise<T> {
  const data = await req.json();
  return schema.parse(data);
} 