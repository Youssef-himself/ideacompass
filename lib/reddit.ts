import axios from 'axios';

const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID!;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET!;
const REDDIT_USER_AGENT = process.env.REDDIT_USER_AGENT || 'ideacompass/0.1';

let accessToken: string | null = null;
let tokenExpiresAt = 0;

// Type for Reddit OAuth2 token response
type RedditTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

// Type for Reddit search API response
type RedditSearchResponse = {
  data: {
    children: {
      data: {
        id: string;
        title: string;
        permalink: string;
        author: string;
        created_utc: number;
        subreddit: string;
        score: number;
        num_comments: number;
      };
    }[];
  };
};

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }
  const credentials = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
  const res = await axios.post<RedditTokenResponse>(
    'https://www.reddit.com/api/v1/access_token',
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': REDDIT_USER_AGENT,
      },
    }
  );
  accessToken = res.data.access_token;
  tokenExpiresAt = Date.now() + (res.data.expires_in - 60) * 1000; // refresh 1 min early
  return accessToken;
}

export type RedditPost = {
  id: string;
  title: string;
  url: string;
  author: string;
  created_utc: number;
  subreddit: string;
  score: number;
  num_comments: number;
};

export async function searchBusinessSubreddits(keyword: string): Promise<RedditPost[]> {
  const token = await getAccessToken();
  // Example: search in r/Entrepreneur, r/startups, r/smallbusiness
  const subreddits = ['Entrepreneur', 'startups', 'smallbusiness'];
  const results: RedditPost[] = [];

  for (const subreddit of subreddits) {
    try {
      const res = await axios.get<RedditSearchResponse>(
        `https://oauth.reddit.com/r/${subreddit}/search`,
        {
          params: {
            q: keyword,
            restrict_sr: 1,
            sort: 'relevance',
            limit: 10,
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': REDDIT_USER_AGENT,
          },
        }
      );
      const posts = res.data.data.children.map((c) => ({
        id: c.data.id,
        title: c.data.title,
        url: `https://reddit.com${c.data.permalink}`,
        author: c.data.author,
        created_utc: c.data.created_utc,
        subreddit: c.data.subreddit,
        score: c.data.score,
        num_comments: c.data.num_comments,
      }));
      results.push(...posts);
      // Respect Reddit API rate limits
      await new Promise((r) => setTimeout(r, 1100));
    } catch (err: any) {
      if (err.response && err.response.status === 429) {
        // Too many requests, wait and retry
        await new Promise((r) => setTimeout(r, 3000));
      } else {
        console.error(`Error fetching from r/${subreddit}:`, err.message);
      }
    }
  }
  return results;
}