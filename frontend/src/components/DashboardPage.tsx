import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeInputs, computeWRI, readRecentWriHistory, writeTodayWri, calculateJournalMetrics, storeJournalInsights, getEncryptedJournalInsights, getReadableJournalMetrics, WriOutput } from '../services/MoodScoreService';
import { WriGaugeCard } from './wri';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import LanguageSelector from './LanguageSelector';

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

        // 3) Load latest decrypted wellness insights via existing endpoint
        // Reuse getEncryptedInsights endpoint and request full history
        const res = await fetch(`https://getencryptedinsights-tipjtjdkwq-uc.a.run.app`, {
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

        // 3a) Apply journal bonuses as a separate synthetic point derived from the latest chat
        // Daily cap: 17. First journal: base(5) + 3*entries + streakBonus. Subsequent journals add only +3 each.
        const entriesToday = journalData.journal_entries_today || 0;
        const streak = journalData.journal_streak || 0;
        let streakBonus = 0;
        if (streak >= 30) streakBonus = 40; else if (streak >= 14) streakBonus = 25; else if (streak >= 7) streakBonus = 15; else if (streak >= 3) streakBonus = 8; else if (streak >= 1) streakBonus = 2;
        const baseAndFreq = entriesToday > 0 ? 5 + (entriesToday * 3) : 0; // base + 3 per entry
        const totalJournalBonus = Math.min(17, (entriesToday > 0 ? (5 + (entriesToday * 3) + streakBonus) : 0));

        // If there is at least one chat point and any journal activity, append a synthetic adjusted point
        const adjustedSeries: Array<{ dateTime: string; wri: number }> = [...sessionHistoryDetailed];
        if (sessionHistoryDetailed.length && totalJournalBonus > 0) {
          const lastPoint = sessionHistoryDetailed[sessionHistoryDetailed.length - 1];
          const adjustedWri = Math.max(0, Number((lastPoint.wri - totalJournalBonus).toFixed(1)));
          const nowIso = new Date().toISOString().slice(0,16);
          adjustedSeries.push({ dateTime: nowIso, wri: adjustedWri });
          console.log('🧮 JOURNAL ADJUSTMENT → lastChat:', lastPoint.wri, 'entriesToday:', entriesToday, 'streak:', streak, 'streakBonus:', streakBonus, 'totalBonusApplied:', totalJournalBonus, 'adjustedWri:', adjustedWri);
        }

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

        // 4) Compute dashboard WRI as the mean of the sessions shown in the graph (no journal bonus)
        const lastSessions = adjustedSeries.slice(-30);
        const lastSessionWrIs = lastSessions.map(s => s.wri);
        const avgWri = lastSessionWrIs.length ? Number((lastSessionWrIs.reduce((a,b)=>a+b,0)/lastSessionWrIs.length).toFixed(1)) : undefined;

        // TRACE: end-to-end inputs -> history -> decisions
        console.groupCollapsed('🧭 WRI TRACE (Dashboard)');
        console.log('User:', currentUser.email);
        console.log('Wellness inputs (chat only):', wellness);
        console.log('Readable Journal metrics used for storage (not for WRI here):', journalData);
        console.log('Firestore daily history (mood_scores → daily):', history);
        console.log('Session-derived per-chat WRIs (after filters):', sessionHistoryDetailed);
        console.log('Session-derived with journal-adjusted synthetic point (if any):', adjustedSeries);
        console.log('Merged history (daily dates):', mergedHistory);
        console.log('Per-chat WRIs used for average (last 30):', lastSessionWrIs, 'avgWri =', avgWri);

        let currentInputs = normalizeInputs(wellness); // inputs needed for flags/copy
        const base = computeWRI(currentInputs, mergedHistory, false); // compute without journal bonus
        console.log('Base WRI (no journal bonus):', base.wri, 'band:', base.risk_band);

        const bandForAvg: WriOutput['risk_band'] = (avgWri ?? base.wri) <= 24 ? 'green' : (avgWri ?? base.wri) <= 49 ? 'yellow' : (avgWri ?? base.wri) <= 74 ? 'orange' : 'red';
        const computed: WriOutput = avgWri !== undefined ? { ...base, wri: avgWri, risk_band: bandForAvg } : base;
        console.log('Display WRI used for gauge:', computed.wri, 'band:', computed.risk_band, 'source:', avgWri !== undefined ? 'avg(last 30 chats)' : 'base compute');
        console.groupEnd();
        
        // Store ONLY chat wellness data (no journal metrics mixed in)
        try {
          await fetch(`https://storeencryptedinsights-tipjtjdkwq-uc.a.run.app`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userEmail: currentUser.email,
              wellnessData: wellness // Store only chat wellness, not journal metrics
            })
          });
          console.log('✅ Chat wellness data stored to insights (journal metrics stored separately):', wellness);
          
          // Also store journal insights separately in encrypted form
          await storeJournalInsights(currentUser.email, journalData);
          
        } catch (insightsError) {
          console.warn('⚠️ Failed to store enhanced wellness data:', insightsError);
        }

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

          {/* Journal Metrics & Rewards */}
          {journalMetrics && (
            <div className="bg-gradient-to-r from-purple-800/50 to-indigo-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-600/30 shadow-xl">
              <div className="flex items-center mb-6">
                <span className="text-3xl mr-3">🔥</span>
                <h2 className="text-2xl font-bold text-white">Journal Streak & Rewards</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Current Streak */}
                <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl p-6 text-center transform hover:scale-105 transition-all duration-300 border border-orange-500/30">
                  <div className="text-4xl mb-3">🔥</div>
                  <div className="text-white font-semibold mb-2">Current Streak</div>
                  <div className="text-3xl font-bold text-orange-400">{journalMetrics.journal_streak}</div>
                  <div className="text-sm text-orange-300 mt-1">
                    {journalMetrics.journal_streak === 0 ? 'Start today!' : 
                     journalMetrics.journal_streak === 1 ? '1 day' : `${journalMetrics.journal_streak} days`}
                  </div>
                </div>

                {/* Weekly Progress */}
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-6 text-center transform hover:scale-105 transition-all duration-300 border border-green-500/30">
                  <div className="text-4xl mb-3">📅</div>
                  <div className="text-white font-semibold mb-2">This Week</div>
                  <div className="text-3xl font-bold text-green-400">{journalMetrics.weekly_journal_count}/7</div>
                  <div className="text-sm text-green-300 mt-1">
                    {journalMetrics.weekly_journal_count >= 5 ? '🏆 Active!' : 'Keep going!'}
                  </div>
                </div>

                {/* Today's Progress */}
                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-6 text-center transform hover:scale-105 transition-all duration-300 border border-blue-500/30">
                  <div className="text-4xl mb-3">📝</div>
                  <div className="text-white font-semibold mb-2">Today</div>
                  <div className="text-3xl font-bold text-blue-400">{journalMetrics.journal_entries_today}</div>
                  <div className="text-sm text-blue-300 mt-1">
                    {journalMetrics.journal_entries_today === 0 ? 'No entries yet' : 
                     journalMetrics.journal_entries_today === 1 ? '1 entry' : `${journalMetrics.journal_entries_today} entries`}
                </div>
              </div>

                {/* WRI Bonus Points */}
                <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-xl p-6 text-center transform hover:scale-105 transition-all duration-300 border border-yellow-500/30">
                  <div className="text-4xl mb-3">💎</div>
                  <div className="text-white font-semibold mb-2">WRI Bonus</div>
                  <div className="text-3xl font-bold text-yellow-400">
                    {(() => {
                      // Calculate total journal bonus points based on current metrics
                      let totalBonus = 0;
                      
                      // Base journal bonus
                      if (journalMetrics.journal_entries_today > 0) {
                        totalBonus += 5; // Base 5 points
                      }
                      
                      // Frequency bonus (3 points per entry, max 10)
                      if (journalMetrics.journal_entries_today > 0) {
                        totalBonus += Math.min(10, journalMetrics.journal_entries_today * 3);
                      }
                      
                      // Streak bonus
                      if (journalMetrics.journal_streak >= 1 && journalMetrics.journal_streak < 3) {
                        totalBonus += 2;
                      } else if (journalMetrics.journal_streak >= 3 && journalMetrics.journal_streak < 7) {
                        totalBonus += 8;
                      } else if (journalMetrics.journal_streak >= 7 && journalMetrics.journal_streak < 14) {
                        totalBonus += 15;
                      } else if (journalMetrics.journal_streak >= 14 && journalMetrics.journal_streak < 30) {
                        totalBonus += 25;
                      } else if (journalMetrics.journal_streak >= 30) {
                        totalBonus += 40;
                      }
                      
                      // Weekly frequency bonus (2 points per weekly entry, max 15, minimum 3 entries)
                      if (journalMetrics.weekly_journal_count >= 3) {
                        totalBonus += Math.min(15, journalMetrics.weekly_journal_count * 2);
                      }
                      
                      return totalBonus;
                    })()}
                  </div>
                  <div className="text-sm text-yellow-300 mt-1">
                    {journalMetrics.journal_entries_today > 0 ? 'Points Earned!' :
                     journalMetrics.journal_streak >= 1 ? 'Streak Active!' : 'Start journaling!'}
                      </div>
                  {/* Bonus Breakdown */}
                  <div className="mt-3 text-xs text-yellow-200/80 space-y-1">
                    {journalMetrics.journal_entries_today > 0 && (
                      <div>Base: +5 pts, Daily: +{Math.min(10, journalMetrics.journal_entries_today * 3)} pts</div>
                    )}
                    {journalMetrics.journal_streak > 0 && (
                      <div>Streak: +{
                        journalMetrics.journal_streak >= 30 ? 40 :
                        journalMetrics.journal_streak >= 14 ? 25 :
                        journalMetrics.journal_streak >= 7 ? 15 :
                        journalMetrics.journal_streak >= 3 ? 8 : 2
                      } pts</div>
                    )}
                    {journalMetrics.weekly_journal_count >= 3 && (
                      <div>Weekly: +{Math.min(15, journalMetrics.weekly_journal_count * 2)} pts</div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Progress Towards Next Milestone */}
              <div className="mt-6 bg-gray-700/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Next Milestone</span>
                  <span className="text-gray-300 text-sm">
                    {journalMetrics.journal_streak >= 30 ? '🏆 Max streak bonus reached!' :
                     journalMetrics.journal_streak >= 14 ? `${30 - journalMetrics.journal_streak} days to Master (40 pts)` :
                     journalMetrics.journal_streak >= 7 ? `${14 - journalMetrics.journal_streak} days to Champion (25 pts)` :
                     journalMetrics.journal_streak >= 3 ? `${7 - journalMetrics.journal_streak} days to Hero (15 pts)` :
                     journalMetrics.journal_streak >= 1 ? `${3 - journalMetrics.journal_streak} days to Rising (8 pts)` :
                     `Start journaling to begin earning rewards!`}
                  </span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (journalMetrics.journal_streak / (
                        journalMetrics.journal_streak >= 30 ? 30 :
                        journalMetrics.journal_streak >= 14 ? 30 :
                        journalMetrics.journal_streak >= 7 ? 14 :
                        journalMetrics.journal_streak >= 3 ? 7 : 3
                      )) * 100)}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

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
                .map(([k,v], i) => (
                  <div key={k} className="bg-gray-700/50 rounded-xl p-4 text-center transform hover:scale-105 transition-all duration-300">
                    <div className="text-2xl mb-2">
                      {k === 'mood' ? '😊' : k === 'sleep' ? '😴' : k === 'stress_level' ? '😰' : k === 'academic_pressure' ? '📚' : k === 'social_support' ? '👥' : k === 'loneliness' ? '😔' : k === 'confidence' ? '💪' : '📝'}
                    </div>
                    <div className="text-white font-semibold capitalize">{k.replace('_', ' ')}</div>
                    <div className="text-2xl font-bold text-blue-400">{v.toFixed(2)}</div>
                  </div>
                ))}
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

          {/* Recommendations */}
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/30 shadow-xl">
            <div className="flex items-center mb-6">
              <span className="text-3xl mr-3">💡</span>
              <h2 className="text-2xl font-bold text-white">{t('personalized_recommendations')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wri.recommendations.map((r, i) => {
                const to = r.code === 'A1' ? '/professionalHelp' : r.code === 'A4' ? '/journal' : r.code === 'A2' ? '/journal' : r.code === 'A3' ? '/professionalHelp' : r.code === 'A5' ? '/professionalHelp' : '/chat';
                const icons = { A1: '🏥', A2: '🎯', A3: '🧘', A4: '📝', A5: '🎨', A6: '🌍' };
                return (
                  <a key={i} href={to} className="block">
                    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border border-green-500/30 rounded-xl p-6 transform hover:scale-105 transition-all duration-300 cursor-pointer">
                      <div className="flex items-start space-x-4">
                        <div className="text-3xl">{icons[r.code as keyof typeof icons]}</div>
                        <div className="flex-1">
                          <div className="text-xl font-bold text-green-300 mb-2">{r.title}</div>
                          <div className="text-green-100 mb-3 leading-relaxed">{r.why}</div>
                          {r.personalization && (
                            <div className="text-sm text-green-200/80 italic">{r.personalization}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;


