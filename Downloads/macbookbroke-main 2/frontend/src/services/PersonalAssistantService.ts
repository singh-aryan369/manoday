import { apiConfig } from '../config/apiConfig';
import { fetchTodayGoals } from './DailyGoalsService';
import { getReadableJournalMetrics, readRecentWriHistory } from './MoodScoreService';

type AssistantContext = {
  wriHistory?: Array<{ date: string; wri: number }>;
  latestWri?: number;
  chatHistory?: any[];
  wellnessData?: any;
  dailyGoals?: any[];
  journalMetrics?: {
    journal_streak: number;
    weekly_journal_count: number;
    last_journal_date: string | null;
    journal_entries_today: number;
  } | null;
};

export type AssistantResponse = {
  reply: string;
  expression?: string;
  toolCalls?: Array<{ name: string; status: string; summary?: string }>;
};

const safeJsonParse = (value: string) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse assistant response JSON:', error);
    return null;
  }
};

const fetchWellnessInsights = async (userEmail: string) => {
  try {
    const response = await fetch(apiConfig.getEncryptedInsights, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail, includeHistory: true })
    });
    if (!response.ok) {
      console.warn('Assistant: failed to fetch encrypted insights', response.status);
      return null;
    }
    const result = await response.json();
    return result?.data || null;
  } catch (error) {
    console.warn('Assistant: insights fetch error', error);
    return null;
  }
};

const buildContext = async (userEmail: string): Promise<AssistantContext> => {
  const [wriHistory, wellness, goals, journal] = await Promise.all([
    readRecentWriHistory(userEmail).catch((error) => {
      console.warn('Assistant: failed to read WRI history', error);
      return [];
    }),
    fetchWellnessInsights(userEmail),
    fetchTodayGoals(userEmail).catch((error) => {
      console.warn('Assistant: failed to fetch goals', error);
      return [];
    }),
    getReadableJournalMetrics(userEmail).catch((error) => {
      console.warn('Assistant: failed to fetch journal metrics', error);
      return null;
    })
  ]);

  const latestWri = wriHistory.length ? wriHistory[wriHistory.length - 1].wri : undefined;

  return {
    wriHistory,
    latestWri,
    chatHistory: wellness?.chatHistory || [],
    wellnessData: wellness?.wellnessData || {},
    dailyGoals: goals || [],
    journalMetrics: journal
  };
};

export const sendAssistantPrompt = async (userEmail: string, prompt: string): Promise<AssistantResponse> => {
  const context = await buildContext(userEmail);

  try {
    const response = await fetch(apiConfig.personalAssistantAgent, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail,
        prompt,
        context,
        tools: {
          available: [
            'getEncryptedInsights',
            'storeEncryptedInsights',
            'getJournalInsights',
            'storeJournalInsights',
            'journal',
            'professionalHelp',
            'automl',
            'gemini'
          ],
          description: 'Firebase callable functions exposed via Cloud Functions'
        },
        model: 'gemini'
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn('Assistant agent failed:', response.status, text);
      return {
        reply: 'I ran into an error reaching the assistant service. Please try again shortly.',
        expression: 'apologetic'
      };
    }

    const json = safeJsonParse(await response.text()) || {};
    return {
      reply: json.reply || 'How can I support you today?',
      expression: json.expression || 'neutral',
      toolCalls: json.toolCalls
    };
  } catch (error) {
    console.error('Assistant agent request error:', error);
    return {
      reply: 'Something interrupted my connection. Can you try that again?',
      expression: 'confused'
    };
  }
};
