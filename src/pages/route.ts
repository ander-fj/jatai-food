import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const data = await db.getAssets();
  return NextResponse.json(data);
}