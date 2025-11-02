import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendAssistantPrompt } from '../services/PersonalAssistantService';
import { getTodayKey } from '../services/DailyGoalsService';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  expression?: string;
  timestamp: string;
};

const expressionImages: Record<string, string> = {
  shocked: `${process.env.PUBLIC_URL}/assistant-expressions/shocked.png`,
  crying: `${process.env.PUBLIC_URL}/assistant-expressions/crying.png`,
  pleading: `${process.env.PUBLIC_URL}/assistant-expressions/pleading.png`,
  scared: `${process.env.PUBLIC_URL}/assistant-expressions/scared.png`,
  info: `${process.env.PUBLIC_URL}/assistant-expressions/info.png`,
  neutral: `${process.env.PUBLIC_URL}/assistant-expressions/neutral.png`,
  cheerful: `${process.env.PUBLIC_URL}/assistant-expressions/cheerful.png`,
  apologetic: `${process.env.PUBLIC_URL}/assistant-expressions/apologetic.png`,
  confused: `${process.env.PUBLIC_URL}/assistant-expressions/confused.png`
};

const PersonalAssistantPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const assistantName = useMemo(() => 'Wellness Companion', []);
  const dateKey = useMemo(() => getTodayKey(), []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!currentUser) return;
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: `Hi ${currentUser.isAnonymous ? 'there' : currentUser.displayName || 'friend'}! I’m your personal wellness assistant. Ask me anything about your goals, mood trends, or journal insights and I’ll help with a plan.`,
        expression: 'cheerful',
        timestamp: new Date().toISOString()
      }
    ]);
  }, [currentUser]);

  const handleSend = async () => {
    if (!currentUser?.email || !input.trim() || loading) return;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: input.trim(),
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    const prompt = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    const assistantTyping: ChatMessage = {
      id: `assistant-typing-${Date.now()}`,
      role: 'assistant',
      text: 'Thinking...',
      expression: 'neutral',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, assistantTyping]);

    try {
      const response = await sendAssistantPrompt(currentUser.email, prompt);
      setMessages(prev => [
        ...prev.filter(msg => msg.id !== assistantTyping.id),
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: response.reply,
          expression: response.expression || 'neutral',
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (assistantError: any) {
      console.error('Assistant prompt failed:', assistantError);
      setError(assistantError?.message || 'Unable to reach the assistant right now.');
      setMessages(prev => prev.filter(msg => msg.id !== assistantTyping.id));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 text-white">
        <div className="bg-white/10 border border-white/20 px-6 py-4 rounded-2xl">
          Please sign in to access the personal assistant.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="bg-gradient-to-r from-purple-600/60 to-indigo-600/60 border border-purple-400/40 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{assistantName}</h1>
              <p className="text-indigo-100/80">
                Your AI teammate uses today’s insights, journal streaks, WRI trends, and goal progress to guide you.
              </p>
            </div>
            <div className="bg-black/20 border border-white/10 rounded-2xl px-5 py-4 text-sm">
              <div className="uppercase tracking-widest text-indigo-200">Context Snapshot</div>
              <div className="mt-1 text-indigo-100/80">Date Key: {dateKey}</div>
              <div className="text-xs text-indigo-200/70 mt-1">
                Expressions map to images in <code>public/assistant-expressions/</code>
              </div>
            </div>
          </div>
        </header>

        <main className="bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm p-6 flex flex-col space-y-4">
          <div className="flex-1 overflow-y-auto max-h-[60vh] pr-3">
            {messages.map(message => {
              const imageSrc = message.expression ? expressionImages[message.expression] : undefined;
              return (
                <div
                  key={message.id}
                  className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="mr-3">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={message.expression || 'assistant expression'}
                          className="h-12 w-12 rounded-full object-cover border border-white/20 bg-black/30"
                          onError={(event) => {
                            (event.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-purple-500/40 border border-white/20 flex items-center justify-center text-xs uppercase tracking-widest">
                          AI
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-xl px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-lg ${
                      message.role === 'assistant'
                        ? 'bg-purple-500/20 border border-purple-300/30 text-purple-100'
                        : 'bg-blue-500/20 border border-blue-300/30 text-blue-100'
                    }`}
                  >
                    <div className="text-xs uppercase tracking-widest mb-1">
                      {message.role === 'assistant' ? assistantName : 'You'}
                    </div>
                    <div className="whitespace-pre-line">{message.text}</div>
                  </div>
                  {message.role === 'user' && (
                    <div className="ml-3">
                      <div className="h-10 w-10 rounded-full bg-blue-500/20 border border-white/20 flex items-center justify-center text-xs uppercase tracking-widest">
                        You
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {loading && (
              <div className="text-xs text-white/60 mt-2 px-3">Assistant is crafting a response…</div>
            )}
            <div ref={scrollRef} />
          </div>

          {error && (
            <div className="text-xs text-red-300 bg-red-900/30 border border-red-500/40 px-4 py-2 rounded-xl">
              {error}
            </div>
          )}

          <div className="border-t border-white/10 pt-4">
            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder="Ask the assistant for guidance..."
                className="flex-1 bg-black/30 border border-white/20 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm resize-none"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 px-6 py-3 rounded-2xl font-semibold shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PersonalAssistantPage;
