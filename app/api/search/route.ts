import { NextRequest, NextResponse } from 'next/server';
import { searchSchema } from '@/lib/validation';
import { searchBusinessSubreddits } from '@/lib/reddit';
import { analyzeRedditPosts } from '@/lib/openai';

// Simple in-memory cache and rate limiter (per keyword, per IP)
const cache = new Map<string, { data: any; timestamp: number }>();
const rateLimit = new Map<string, number[]>(); // Changed to store an array of timestamps
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const RATE_LIMIT_WINDOW = 1000 * 60; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per window

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://yourdomain.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: Request) {
  try {
    // 1. Validate input with Zod
    const body = await request.json();
    const parsed = searchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
    }
    const { keyword } = parsed.data;

    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const rateKey = `${ip}`;
    const history = rateLimit.get(rateKey) || [];
    const recent = history.filter((t: number) => now - t < RATE_LIMIT_WINDOW);
    if (recent.length >= RATE_LIMIT_MAX) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    rateLimit.set(rateKey, [...recent, now]);

    // 2. Caching
    const cacheKey = keyword.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ ...cached.data, cached: true });
    }

    // 3. Fetch Reddit data
    const redditPosts = await searchBusinessSubreddits(keyword);
    if (!redditPosts.length) {
      return NextResponse.json({ error: 'No Reddit posts found' }, { status: 404 });
    }

    // 4. Analyze with OpenAI
    const analysis = await analyzeRedditPosts(keyword, redditPosts);
    if (!analysis) {
      return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
    }

    // 5. Return formatted results
    const result = {
      keyword,
      posts: redditPosts,
      analysis,
    };
    cache.set(cacheKey, { data: result, timestamp: now });

    return NextResponse.json(result, {
      headers: {
        'Access-Control-Allow-Origin': 'https://yourdomain.com',
      },
    });
  } catch (err: any) {
    console.error('API error:', err); // log full error
    return NextResponse.json(
      { error: 'Internal server error' }, // generic message
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': 'https://yourdomain.com',
        },
      }
    );
  }
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
  );
  return response;
}