import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { apiConfig } from '../config/apiConfig';
import { normalizeInputs, computeWRI, readRecentWriHistory, writeTodayWri, calculateJournalMetrics, storeJournalInsights, getEncryptedJournalInsights, getReadableJournalMetrics, WriOutput } from '../services/MoodScoreService';
import { MeditationService } from '../services/MeditationService';
import { WriGaugeCard } from './wri';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import LanguageSelector from './LanguageSelector';

const meditationService = new MeditationService();

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend);

const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [wri, setWri] = useState<WriOutput|null>(null);
  const [historySeries, setHistorySeries] = useState<Array<{ date: string; wri: number }>>([]);
  const [sessionSeries, setSessionSeries] = useState<Array<{ dateTime: string; wri: number }>>([]);
  const [journalMetrics, setJournalMetrics] = useState<{
    journal_streak: number;
    weekly_journal_count: number;
    last_journal_date: string | null;
    journal_entries_today: number;
  } | null>(null);
  const [meditationStats, setMeditationStats] = useState<any>(null);
  const [meditationWRIReduction, setMeditationWRIReduction] = useState<number>(0);

    const run = async () => {
      if (!currentUser?.email) return;
      setLoading(true); setError(null);
      try {
        // 1) Load recent history
        const history = await readRecentWriHistory(currentUser.email);

        // 2) Load journal metrics - try readable metrics first, then encrypted, then calculate
        console.log('🔍 DASHBOARD: Current user info:', {
          email: currentUser.email,
          uid: currentUser.uid,
          displayName: currentUser.displayName
        });
        
        // Always calculate FRESH journal metrics to ensure real-time accuracy
        console.log('📊 DASHBOARD: Calculating FRESH journal metrics for accurate WRI...');
        let journalData = await calculateJournalMetrics(currentUser.email);
        console.log('📊 FRESH journal metrics calculated:', journalData);
        
        // Fallback to cached data only if fresh calculation fails
        if (!journalData) {
          console.log('⚠️ Fresh calculation failed, trying cached data...');
          const readableMetrics = await getReadableJournalMetrics(currentUser.email);
          console.log('🔍 DASHBOARD: Fallback readable metrics:', readableMetrics);
          
          if (readableMetrics) {
            journalData = readableMetrics;
          } else {
            console.log('⚠️ No readable metrics, trying encrypted insights...');
            const encryptedMetrics = await getEncryptedJournalInsights(currentUser.email);
            console.log('🔍 DASHBOARD: Fallback encrypted insights:', encryptedMetrics);
            if (encryptedMetrics) {
              journalData = encryptedMetrics;
            }
          }
        }
        
        // Ensure we have valid data structure
        if (!journalData) {
          journalData = {
            journal_streak: 0,
            weekly_journal_count: 0,
            last_journal_date: null,
            journal_entries_today: 0
          };
          console.log('📊 Using default journal metrics:', journalData);
        }
        
        setJournalMetrics(journalData);
        console.log('📊 Final journal metrics set in state:', journalData);

        // 2.5) Fetch meditation stats and WRI reduction
        let meditationWRIReductionValue = 0;
        if (currentUser?.uid) {
          try {
            const meditationStatsResponse = await meditationService.getMeditationStats(currentUser.uid);
            if (meditationStatsResponse.success && meditationStatsResponse.stats) {
              setMeditationStats(meditationStatsResponse.stats);
              console.log('🧘‍♀️ Meditation stats loaded:', meditationStatsResponse.stats);
            }

            const meditationWRIResponse = await meditationService.getMeditationWRIReduction(currentUser.uid);
            if (meditationWRIResponse.success) {
              meditationWRIReductionValue = meditationWRIResponse.wriReduction;
              setMeditationWRIReduction(meditationWRIReductionValue);
              console.log('🧘‍♀️ Meditation WRI reduction:', meditationWRIReductionValue);
            }
          } catch (err) {
            console.error('Error fetching meditation data:', err);
          }
        }

        // 2.6) Fetch goal completions and calculate WRI reduction
        let goalWRIReductionValue = 0;
        try {
          const { fetchTodayGoals, calculateTodayWriReduction } = await import('../services/DailyGoalsService');
          const todayKey = new Date().toISOString().slice(0, 10);
          const todayGoals = await fetchTodayGoals(currentUser.email, todayKey);
          if (todayGoals && todayGoals.length > 0) {
            goalWRIReductionValue = calculateTodayWriReduction(todayGoals);
            console.log('🎯 Goal WRI reduction:', goalWRIReductionValue, 'from', todayGoals.filter(t => t.completed && t.wri_reduction).length, 'completed goals');
          }
        } catch (err) {
          console.warn('Error fetching goal completions:', err);
        }

        // 3) Load latest decrypted wellness insights via existing endpoint
        // Reuse getEncryptedInsights endpoint and request full history
        const res = await fetch(apiConfig.getEncryptedInsights, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userEmail: currentUser.email, includeHistory: true })
        });
        const data = await res.json();
        const wellness = data?.data?.wellnessData || {};
        // Filter sessions to only include meaningful conversations (4+ parameters) and unique session IDs
        console.log('🔍 RAW CHAT HISTORY:', data?.data?.chatHistory?.length, 'sessions');
        
        const sessions: Array<{ timestamp?: any; wellnessData?: any; sessionId?: string }> = (data?.data?.chatHistory || [])
          .filter((s: any) => {
            if (!s?.wellnessData) return false;
            
            // Count non-empty wellness parameters
            const paramCount = Object.values(s.wellnessData).filter(val => 
              val !== null && val !== undefined && val !== '' && val !== 'undefined'
            ).length;
            
            console.log(`🔍 Session filter: ${paramCount} parameters found`, {
              sessionId: s.sessionId,
              timestamp: s.timestamp,
              paramCount,
              wellnessData: s.wellnessData
            });
            return paramCount >= 4; // Only use sessions with meaningful data
          })
          .filter((session, index, array) => {
            // Remove duplicate sessions by sessionId - keep only the latest one
            console.log('🔍 Session data:', { 
              index, 
              sessionId: session.sessionId, 
              timestamp: session.timestamp,
              hasSessionId: !!session.sessionId 
            });
            
            if (!session.sessionId) {
              console.log('⚠️ Session without sessionId, skipping:', session);
              return false; // Skip sessions without sessionId
            }
            
            // Find all sessions with the same sessionId
            const duplicateSessions = array.filter(s => s.sessionId === session.sessionId);
            console.log(`🔍 Found ${duplicateSessions.length} sessions with ID ${session.sessionId}`);
            
            if (duplicateSessions.length === 1) {
              return true; // Unique session
            }
            
            // For duplicates, keep only the one with the latest timestamp
            const latestSession = duplicateSessions.reduce((latest, current) => {
              const latestTime = latest.timestamp?.seconds || latest.timestamp || 0;
              const currentTime = current.timestamp?.seconds || current.timestamp || 0;
              return currentTime > latestTime ? current : latest;
            });
            
            const isLatest = session === latestSession;
            if (!isLatest) {
              console.log(`🚫 Removing duplicate session: ${session.sessionId} (older)`);
            }
            return isLatest;
          });

        // 3) Compute per-session WRI as a detailed series (keep time to show multiple points per day)
        const sessionHistoryDetailed: Array<{ dateTime: string; wri: number }> = [];
        sessions.forEach((s: any) => {
          const inputs = normalizeInputs(s.wellnessData);
          const c = computeWRI(inputs);
          const ts = s.timestamp?._seconds ? new Date(s.timestamp._seconds * 1000) : new Date();
          const dt = ts.toISOString().slice(0,16); // yyyy-mm-ddThh:mm
          sessionHistoryDetailed.push({ dateTime: dt, wri: c.wri });
        });
        sessionHistoryDetailed.sort((a,b)=>a.dateTime.localeCompare(b.dateTime));

        // 3a) Calculate journal bonuses (for avg WRI reduction, not graph points)
        // Daily cap: 17. First journal: base(5) + 3*entries + streakBonus. Subsequent journals add only +3 each.
        const entriesToday = journalData.journal_entries_today || 0;
        const streak = journalData.journal_streak || 0;
        let streakBonus = 0;
        if (streak >= 30) streakBonus = 40; else if (streak >= 14) streakBonus = 25; else if (streak >= 7) streakBonus = 15; else if (streak >= 3) streakBonus = 8; else if (streak >= 1) streakBonus = 2;
        const baseBonus = entriesToday > 0 ? 5 : 0;
        const frequencyBonus = Math.min(10, entriesToday * 3);
        const totalJournalBonus = baseBonus + frequencyBonus + streakBonus;
        
        console.log('📊 JOURNAL BONUS for AVG WRI:', {
          entriesToday,
          streak,
          baseBonus,
          frequencyBonus,
          streakBonus,
          totalJournalBonus
        });

        // Keep the graph as-is (no synthetic points for journal bonus)
        const adjustedSeries: Array<{ dateTime: string; wri: number }> = [...sessionHistoryDetailed];

        // Also build a daily merged series to compute indices
        const dayMap = new Map<string, number[]>();
        sessionHistoryDetailed.forEach(s => {
          const d = s.dateTime.slice(0,10);
          const arr = dayMap.get(d) || [];
          arr.push(s.wri);
          dayMap.set(d, arr);
        });
        const sessionHistory: Array<{ date: string; wri: number }> = Array.from(dayMap.entries())
          .map(([date, arr]) => ({ date, wri: arr.reduce((a,b)=>a+b,0)/arr.length }))
          .sort((a,b)=>a.date.localeCompare(b.date));

        // Merge existing stored history with session-derived history
        const mergedHistory = [...history, ...sessionHistory]
          .sort((a,b)=>a.date.localeCompare(b.date))
          .filter((v,i,arr)=> i===0 || v.date !== arr[i-1].date);

        // 4) Compute dashboard WRI as the mean of the sessions shown in the graph
        // Apply journal bonus to the AVERAGE (gauge) not individual points (graph)
        const lastSessions = adjustedSeries.slice(-30);
        const lastSessionWrIs = lastSessions.map(s => s.wri);
        const baseAvgWri = lastSessionWrIs.length ? Number((lastSessionWrIs.reduce((a,b)=>a+b,0)/lastSessionWrIs.length).toFixed(1)) : undefined;
        
        // Apply journal bonus, meditation bonus, and goal bonus to avg WRI (displayed in gauge)
        let avgWri = baseAvgWri;
        if (avgWri !== undefined) {
          avgWri = Math.max(0, Number((avgWri - totalJournalBonus).toFixed(1)));
          avgWri = Math.max(0, Number((avgWri - meditationWRIReductionValue).toFixed(1)));
          avgWri = Math.max(0, Number((avgWri - goalWRIReductionValue).toFixed(1)));
        }
        
        console.log('📊 AVG WRI CALCULATION:', {
          baseAvgWri,
          totalJournalBonus,
          meditationWRIReduction: meditationWRIReductionValue,
          goalWRIReduction: goalWRIReductionValue,
          finalAvgWri: avgWri
        });

        // TRACE: end-to-end inputs -> history -> decisions
        console.groupCollapsed('🧭 WRI TRACE (Dashboard)');
        console.log('User:', currentUser.email);
        console.log('Wellness inputs (chat only):', wellness);
        console.log('Readable Journal metrics used for storage (not for WRI here):', journalData);
        console.log('Firestore daily history (mood_scores → daily):', history);
        console.log('Session-derived per-chat WRIs (after filters):', sessionHistoryDetailed);
        console.log('Graph data (no journal bonus applied):', adjustedSeries);
        console.log('Merged history (daily dates):', mergedHistory);
        console.log('Per-chat WRIs used for average (last 30):', lastSessionWrIs);
        console.log('Base avg WRI (before journal bonus):', baseAvgWri);
        console.log('Journal bonus applied to avg:', totalJournalBonus);
        console.log('Final avg WRI (gauge):', avgWri);

        let currentInputs = normalizeInputs(wellness); // inputs needed for flags/copy
        // Add meditation and goal WRI reductions to inputs so computeWRI can use them
        (currentInputs as any).meditation_wri_reduction = meditationWRIReductionValue;
        (currentInputs as any).goal_wri_reduction = goalWRIReductionValue;
        const base = computeWRI(currentInputs, mergedHistory, true); // compute WITH all bonuses (journal, meditation, goals)
        console.log('Base WRI (with all bonuses):', base.wri, 'band:', base.risk_band);
        console.log('Applied bonuses:', {
          journal: totalJournalBonus,
          meditation: meditationWRIReductionValue,
          goal: goalWRIReductionValue
        });

        const bandForAvg: WriOutput['risk_band'] = (avgWri ?? base.wri) <= 24 ? 'green' : (avgWri ?? base.wri) <= 49 ? 'yellow' : (avgWri ?? base.wri) <= 74 ? 'orange' : 'red';
        const computed: WriOutput = avgWri !== undefined ? { ...base, wri: avgWri, risk_band: bandForAvg } : base;
        console.log('Display WRI used for gauge:', computed.wri, 'band:', computed.risk_band, 'source:', avgWri !== undefined ? 'avg(last 30 chats)' : 'base compute');
        console.groupEnd();
        
        // ❌ REMOVED: Dashboard should ONLY READ data, not write it!
        // Writing on every dashboard load was creating duplicate WRI entries on refresh
        // WRI storage happens ONLY in Chatbot.tsx when user provides 4+ parameters

        // Use the journal-adjusted WRI as the current score (no aggregation override)
        // The computed WRI already includes journal bonuses and is the most accurate current state
        console.log('🎯 DASHBOARD: Using journal-adjusted WRI:', computed.wri, 'instead of aggregated mean');
        
        // Set the journal-adjusted WRI as the display score
        setWri(computed); // Use the actual computed WRI with journal bonuses
        setHistorySeries(mergedHistory);
        setSessionSeries(sessionHistoryDetailed);

        // 5) Do not persist snapshot from dashboard refresh to avoid graph progression
      } catch (e:any) {
        setError(e?.message || 'Failed to compute WRI');
      } finally {
        setLoading(false);
      }
    };

  // Initial load and window focus refresh
  useEffect(() => {
    run();
    
    const handleFocus = () => {
      console.log('📱 DASHBOARD: Window focused, refreshing data...');
      run();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentUser?.email]);

  // Live subscription: update chart as mood_scores change
  useEffect(() => {
    if (!currentUser?.email) return;
    const col = collection(db, 'mood_scores', currentUser.email, 'daily');
    const unsub = onSnapshot(query(col, orderBy('date', 'asc')), (snap) => {
      const arr: Array<{ date: string; wri: number }> = [];
      snap.forEach(d => { const data:any=d.data(); if (typeof data?.wri === 'number' && typeof data?.date === 'string') arr.push({ date: data.date, wri: data.wri }); });
      setHistorySeries(arr);
    });
    return () => unsub();
  }, [currentUser?.email, wri]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Please sign in to view your dashboard.</div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            🧠 {t('mood_dashboard')}
          </h1>
          <p className="text-gray-400 mt-2">{t('mental_wellness_insights')}</p>
        </div>
        <div className="flex items-center space-x-4">
          <LanguageSelector />
          <button
            onClick={() => navigate('/chat')}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            💬 {t('back_to_chat')}
          </button>
        </div>
      </div>
      
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-gray-300">{t('loading')}</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-6 py-4 rounded-xl mb-6 backdrop-blur-sm">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <div className="font-semibold">{t('error')}</div>
              <div className="text-sm opacity-90">{error}</div>
            </div>
          </div>
        </div>
      )}
      
      {wri && (
        <div className="space-y-8">
          {/* Modern WRI Gauge */}
          <div className="flex justify-center">
            <WriGaugeCard 
              score={wri.wri}
              title={t('todays_wri')}
              showLegend={true}
              className="max-w-lg w-full"
            />
          </div>

          {/* Top Contributors */}
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/30 shadow-xl">
            <div className="flex items-center mb-6">
              <span className="text-3xl mr-3">📊</span>
              <h2 className="text-2xl font-bold text-white">{t('top_contributors')}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(wri.subscores)
                .sort((a,b)=>b[1]-a[1])
                .slice(0,4)
                .map(([k,v], i) => {
                  const colors = [
                    'from-yellow-500 to-orange-500',
                    'from-green-500 to-emerald-500',
                    'from-orange-600 to-red-600',
                    'from-purple-600 to-violet-600'
                  ];
                  const colorClass = colors[i % colors.length];
                  
                  return (
                    <div key={k} className="group relative overflow-hidden rounded-3xl transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gray-800">
                      {/* Animated Background Circle */}
                      <div className={`absolute -top-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-br ${colorClass} transition-transform duration-500 group-hover:scale-[10] opacity-90`}></div>
                      
                      {/* Card Content */}
                      <div className="relative z-10 p-4 text-center">
                        {/* Icon */}
                        <div className="mb-3 text-white opacity-90">
                          <div className="text-2xl">
                            {k === 'mood' ? '😊' : k === 'sleep' ? '😴' : k === 'stress_level' ? '😰' : k === 'academic_pressure' ? '📚' : k === 'social_support' ? '👥' : k === 'loneliness' ? '😔' : k === 'confidence' ? '💪' : '📝'}
                          </div>
                        </div>
                        
                        {/* Title */}
                        <h3 className="text-white font-bold text-sm mb-2 capitalize">{k.replace('_', ' ')}</h3>
                        
                        {/* Value */}
                        <div className="text-white">
                          <div className="text-xs opacity-80 mb-1">Score:</div>
                          <div className={`text-xl font-bold bg-gradient-to-r ${colorClass} bg-clip-text text-transparent group-hover:text-white transition-colors duration-500`}>
                            {v.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* WRI Trend Chart */}
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/30 shadow-xl">
            <div className="flex items-center mb-6">
              <span className="text-3xl mr-3">📈</span>
              <h2 className="text-2xl font-bold text-white">{t('wri_trend')}</h2>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-6">
              <Line
                data={{
                  labels: sessionSeries.slice(-30).map(h => h.dateTime.replace('T',' ').slice(5)),
                  datasets: [
                    { 
                      label: t('per_chat_wri'), 
                      data: sessionSeries.slice(-30).map(h => h.wri), 
                      borderColor: 'rgb(34,197,94)', 
                      backgroundColor: 'rgba(34,197,94,0.2)', 
                      tension: 0.2, 
                      pointRadius: 4,
                      pointBackgroundColor: 'rgb(34,197,94)',
                      pointBorderColor: 'white',
                      pointBorderWidth: 2
                    },
                    { 
                      label: t('daily_wri'), 
                      data: historySeries.slice(-30).map(h => h.wri), 
                      borderColor: 'rgb(59,130,246)', 
                      backgroundColor: 'rgba(59,130,246,0.15)', 
                      tension: 0.3,
                      pointRadius: 3,
                      pointBackgroundColor: 'rgb(59,130,246)',
                      pointBorderColor: 'white',
                      pointBorderWidth: 2
                    }
                  ]
                }}
                options={{ 
                  responsive: true, 
                  plugins: { 
                    legend: { 
                      display: true,
                      labels: {
                        color: 'white',
                        font: { size: 14 }
                      }
                    } 
                  }, 
                  scales: { 
                    y: { 
                      suggestedMin: 0, 
                      suggestedMax: 100,
                      grid: { color: 'rgba(255,255,255,0.1)' },
                      ticks: { color: 'white' }
                    },
                    x: {
                      grid: { color: 'rgba(255,255,255,0.1)' },
                      ticks: { color: 'white' }
                    }
                  } 
                }}
              />
            </div>
          </div>

          {/* Screening Flags */}
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/30 shadow-xl">
            <div className="flex items-center mb-6">
              <span className="text-3xl mr-3">🚩</span>
              <h2 className="text-2xl font-bold text-white">{t('screening_flags')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { key: 'depressive_symptoms', label: t('depression'), icon: '😔', value: wri.flags.depressive_symptoms },
                { key: 'anxiety_symptoms', label: t('anxiety'), icon: '😰', value: wri.flags.anxiety_symptoms },
                { key: 'burnout_academic_strain', label: t('burnout_strain'), icon: '🔥', value: String(wri.flags.burnout_academic_strain) },
                { key: 'social_isolation', label: t('social_isolation'), icon: '🏝️', value: String(wri.flags.social_isolation) },
                { key: 'help_readiness', label: t('help_readiness'), icon: '🤝', value: String(wri.flags.help_readiness) }
              ].map((flag) => (
                <div key={flag.key} className="bg-gray-700/50 rounded-xl p-4 transform hover:scale-105 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{flag.icon}</span>
                      <div>
                        <div className="text-white font-semibold">{flag.label}</div>
                        <div className={`text-sm font-medium ${
                          flag.value === 'none' || flag.value === 'false' ? 'text-green-400' :
                          flag.value === 'present' || flag.value === 'true' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {flag.value}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default DashboardPage;


