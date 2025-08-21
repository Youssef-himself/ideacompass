import { z } from 'zod';
import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_MODEL = 'gpt-3.5-turbo';

export const analysisSchema = z.object({
  summary: z.string(),
  problems: z.array(z.string()),
  opportunities: z.array(z.string()),
  sentiment: z.number().min(-1).max(1),
  confidence: z.number().min(0).max(1),
});

type AnalysisResult = z.infer<typeof analysisSchema>;

function buildPrompt(keyword: string, redditData: any[]): string {
  const posts = redditData
    .map(
      (p, i) =>
        `${i + 1}. "${p.title}" by ${p.author} (${p.subreddit})\n   ${p.url}`
    )
    .join('\n');
  return `Analyze these Reddit discussions for business opportunities related to "${keyword}".\n\nPosts:\n${posts}\n\nReturn JSON with:\n- summary: Brief overview of findings\n- problems: Array of user problems identified\n- opportunities: Potential business solutions\n- sentiment: Overall sentiment score (-1 to 1)\n- confidence: Analysis confidence (0-1)`;
}

interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function analyzeRedditPosts(
  keyword: string,
  redditData: any[]
): Promise<AnalysisResult | null> {
  const prompt = buildPrompt(keyword, redditData);

  try {
    const response = await axios.post<OpenAIResponse>(
      'https://api.openai.com/v1/chat/completions',
      {
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a business analyst AI.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 512,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Token usage tracking for cost optimization
    const usage = response.data.usage;
    if (usage) {
      console.log(
        `OpenAI tokens used: prompt=${usage.prompt_tokens}, completion=${usage.completion_tokens}, total=${usage.total_tokens}`
      );
    }

    // Parse and validate JSON response
    const content = response.data.choices?.[0]?.message?.content || '';
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON found');
    const jsonString = content.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonString);
    return analysisSchema.parse(parsed);
  } catch (err: any) {
    console.error('OpenAI analysis failed:', err.message);
    // Fallback: return null or a default structure
    return null;
  }
}
