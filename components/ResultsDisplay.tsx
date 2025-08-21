import React from 'react';

type RedditPost = {
  id: string;
  title: string;
  url: string;
  author: string;
  subreddit: string;
  created_utc: number;
  score: number;
  num_comments: number;
};

type Analysis = {
  summary: string;
  problems: string[];
  opportunities: string[];
  sentiment: number; // -1 to 1
  confidence: number; // 0 to 1
};

type Props = {
  posts: RedditPost[];
  analysis: Analysis | null; // <-- allow null
  loading?: boolean;
  error?: string | null;
};

function getSentimentColor(sentiment: number) {
  if (sentiment > 0.3) return 'text-green-600';
  if (sentiment < -0.3) return 'text-red-600';
  return 'text-yellow-600';
}

function getOpportunityLevel(confidence: number) {
  if (confidence > 0.8) return { label: 'High', color: 'bg-green-200 text-green-800' };
  if (confidence > 0.5) return { label: 'Medium', color: 'bg-yellow-200 text-yellow-800' };
  return { label: 'Low', color: 'bg-red-200 text-red-800' };
}

export default function ResultsDisplay({ posts, analysis, loading, error }: Props) {
  if (error) {
    return (
      <div className="w-full max-w-md mx-auto p-4 bg-red-100 text-red-700 rounded shadow">
        <strong>Error:</strong> {error}
        <button
          className="ml-4 underline text-blue-700"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!loading && !error && (!posts?.length || !analysis)) {
    return (
      <div className="w-full max-w-md mx-auto p-4 bg-yellow-50 text-yellow-700 rounded shadow text-center">
        No results found. Try a different keyword!
      </div>
    );
  }

  if (!analysis || !posts?.length) return null;

  const sentimentColor = getSentimentColor(analysis.sentiment);
  const opportunity = getOpportunityLevel(analysis.confidence);

  return (
    <div className="w-full max-w-3xl mx-auto mt-6 flex flex-col gap-6">
      {/* Analysis Card */}
      <div className="bg-white rounded shadow p-6 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className={`font-bold ${sentimentColor}`}>
            Sentiment: {analysis.sentiment.toFixed(2)}
          </span>
          <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${opportunity.color}`}>
            Opportunity: {opportunity.label}
          </span>
          <span className="ml-auto text-gray-500 text-xs">
            Confidence: {(analysis.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div>
          <div className="font-semibold mb-1">Summary</div>
          <div className="text-gray-800">{analysis.summary}</div>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="font-semibold mb-1">Problems Identified</div>
            <ul className="list-disc list-inside text-gray-700">
              {analysis.problems.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
          <div className="flex-1">
            <div className="font-semibold mb-1">Opportunities</div>
            <ul className="list-disc list-inside text-gray-700">
              {analysis.opportunities.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Reddit Posts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded shadow p-4 flex flex-col gap-2">
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-700 hover:underline"
            >
              {post.title}
            </a>
            <div className="text-xs text-gray-500">
              by {post.author} in r/{post.subreddit} • {new Date(post.created_utc * 1000).toLocaleDateString()}
            </div>
            <div className="flex gap-4 text-xs text-gray-600">
              <span>Score: {post.score}</span>
              <span>Comments: {post.num_comments}</span>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="w-full flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-blue-600 font-semibold">Analyzing...</span>
        </div>
      )}
    </div>
  );
}