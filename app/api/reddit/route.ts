import { NextRequest, NextResponse } from 'next/server';
import { searchBusinessSubreddits } from '@/lib/reddit';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('q') || 'startup';
  const posts = await searchBusinessSubreddits(keyword);
  console.log(posts); // For testing
  return NextResponse.json(posts);
}