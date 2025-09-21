import { db } from '../firebase/config';
import { collection, doc, getDocs, getDoc, orderBy, limit, query, setDoc, Timestamp } from 'firebase/firestore';

export type NormalizedInputs = {
  mood: 'happy'|'neutral'|'sad'|'anxious'|'depressed';
  sleep_hours: number; // 1..10
  stress_level: 'low'|'medium'|'high';
  academic_pressure: 'low'|'medium'|'high';
  social_support: 'weak'|'medium'|'strong';
  loneliness: 'often'|'sometimes'|'hardly';
  confidence: 'low'|'medium'|'high';
  hobby: 'sports'|'arts'|'music'|'travelling'|'reading';
  journal_writing: 'yes'|'no';
  willingness_for_professional_support: 'yes'|'no';
};

export type WriOutput = {
  wri: number;
  risk_band: 'green'|'yellow'|'orange'|'red';
  subscores: Record<string, number>;
  flags: {
    depressive_symptoms: 'none'|'present'|'high_priority';
    anxiety_symptoms: 'none'|'present'|'high_priority';
    burnout_academic_strain: boolean;
    social_isolation: boolean;
    help_readiness: boolean;
  };
  recommendations: Array<{ code: 'A1'|'A2'|'A3'|'A4'|'A5'|'A6'; title: string; why: string; personalization?: string }>;
  copy: { one_liner: string; band_explainer: string; trend_note?: string };
  history_indexes?: { weekly_index?: number; monthly_index?: number; volatility?: number };
};

// Mapping helpers for existing dataset → spec enums
export function normalizeInputs(raw: any): NormalizedInputs {
  const toLower = (v: any) => String(v || '').toLowerCase();

  const moodMap: Record<string, NormalizedInputs['mood']> = {
    happy: 'happy', neutral: 'neutral', sad: 'sad', anxious: 'anxious', depressed: 'depressed',
    stressed: 'anxious'
  };
  const supportMap: Record<string, NormalizedInputs['social_support']> = { weak: 'weak', average: 'medium', strong: 'strong' };
  const lonelyMap: Record<string, NormalizedInputs['loneliness']> = { never: 'hardly', sometimes: 'sometimes', often: 'often' };
  const hobbyMap: Record<string, NormalizedInputs['hobby']> = { sports: 'sports', music: 'music', reading: 'reading', art: 'arts', travel: 'travelling', none: 'reading' };

  const normalized = {
    mood: moodMap[toLower(raw.mood)] || 'neutral',
    sleep_hours: Math.max(1, Math.min(10, Number(raw.sleepHours || raw.sleep_hours || 7))),
    stress_level: (toLower(raw.stressLevel) as any) || 'medium',
    academic_pressure: (toLower(raw.academicPressure) as any) || 'medium',
    social_support: supportMap[toLower(raw.socialSupport)] || 'medium',
    loneliness: lonelyMap[toLower(raw.loneliness)] || 'sometimes',
    confidence: (toLower(raw.confidenceLevel) as any) || 'medium',
    hobby: hobbyMap[toLower(raw.hobbiesInterest)] || 'reading',
    journal_writing: toLower(raw.opennessToJournaling || raw.journal_writing) === 'yes' ? 'yes' : 'no',
    willingness_for_professional_support: toLower(raw.willingForProfessionalHelp) === 'yes' ? 'yes' : 'no'
  };

  // Preserve journal metrics for bonus calculation
  const result = { ...normalized } as any;
  if (raw.journal_entries_today !== undefined) result.journal_entries_today = Number(raw.journal_entries_today);
  if (raw.journal_streak !== undefined) result.journal_streak = Number(raw.journal_streak);
  if (raw.weekly_journal_count !== undefined) result.weekly_journal_count = Number(raw.weekly_journal_count);
  if (raw.last_journal_date !== undefined) result.last_journal_date = raw.last_journal_date;

  console.log('🔄 normalizeInputs - Journal fields preserved:', {
    input: {
      journal_entries_today: raw.journal_entries_today,
      journal_streak: raw.journal_streak,
      weekly_journal_count: raw.weekly_journal_count
    },
    output: {
      journal_entries_today: result.journal_entries_today,
      journal_streak: result.journal_streak,
      weekly_journal_count: result.weekly_journal_count
    }
  });

  return result;
}

// Compute subscores and WRI per the provided spec
export function computeWRI(inputs: NormalizedInputs, history?: Array<{ date: string; wri: number }>, applyJournalBonus: boolean = true): WriOutput {
  const mapMood: Record<NormalizedInputs['mood'], number> = { happy: 0.0, neutral: 0.25, sad: 0.6, anxious: 0.75, depressed: 1.0 };
  const map3: Record<'low'|'medium'|'high', number> = { low: 0.0, medium: 0.5, high: 1.0 };
  const mapSupport: Record<'weak'|'medium'|'strong', number> = { weak: 1.0, medium: 0.5, strong: 0.0 };
  const mapLonely: Record<'hardly'|'sometimes'|'often', number> = { hardly: 0.0, sometimes: 0.5, often: 1.0 };
  const mapYesNo: Record<'yes'|'no', number> = { yes: 0.0, no: 0.5 }; // Journal 'no' should add penalty, not full 1.0
  const mapWilling: Record<'yes'|'no', number> = { yes: 0.0, no: 0.5 };

  const sleep = Math.min(Math.abs(inputs.sleep_hours - 8) / 4, 1);
  const subscores = {
    mood: mapMood[inputs.mood],
    sleep,
    stress_level: map3[inputs.stress_level],
    academic_pressure: map3[inputs.academic_pressure],
    social_support: mapSupport[inputs.social_support],
    loneliness: mapLonely[inputs.loneliness],
    confidence: map3[inputs.confidence],
    journal_writing: mapYesNo[inputs.journal_writing],
    willingness_for_professional_support: mapWilling[inputs.willingness_for_professional_support]
  } as Record<string, number>;

  const w = { mood: .18, sleep: .14, stress_level: .14, academic_pressure: .09, social_support: .09, loneliness: .09, confidence: .09, journal_writing: .12, willingness_for_professional_support: .06 };
  let wri = Number((100 * (
    subscores.mood * w.mood +
    subscores.sleep * w.sleep +
    subscores.stress_level * w.stress_level +
    subscores.academic_pressure * w.academic_pressure +
    subscores.social_support * w.social_support +
    subscores.loneliness * w.loneliness +
    subscores.confidence * w.confidence +
    subscores.journal_writing * w.journal_writing +
    subscores.willingness_for_professional_support * w.willingness_for_professional_support
  )).toFixed(1));

  // Apply journal bonuses (separate calculation system) - only if explicitly enabled
  let totalJournalBonus = 0;

  if (applyJournalBonus) {
    const journalEntriesToday = (inputs as any).journal_entries_today || 0;
    const journalStreak = (inputs as any).journal_streak || 0;
    const weeklyJournalCount = (inputs as any).weekly_journal_count || 0;
    const hasJournalActivity = journalEntriesToday > 0 || journalStreak > 0 || weeklyJournalCount > 0;

    console.log('🔍 JOURNAL BONUS DEBUG (enabled):', {
      journalEntriesToday,
      journalStreak, 
      weeklyJournalCount,
      hasJournalActivity,
      inputsKeys: Object.keys(inputs),
      fullInputs: inputs
    });

    if (hasJournalActivity) {
    console.log('🎯 APPLYING JOURNAL BONUSES:', { journalEntriesToday, journalStreak, weeklyJournalCount, hasJournalActivity });
    console.log('🎯 INPUTS OBJECT:', inputs);
    
    // Base journaling bonus for any journal activity
    if (journalEntriesToday > 0) {
      totalJournalBonus += 5; // Base 5 point bonus for journaling today
      console.log(`📝 Base journal bonus: 5 points`);
    }
    
    // Frequency bonus based on today's entries
    if (journalEntriesToday > 0) {
      const frequencyBonus = Math.min(10, journalEntriesToday * 3); // Up to 10 points (3 per entry)
      totalJournalBonus += frequencyBonus;
      console.log(`📝 Daily frequency bonus: ${journalEntriesToday} entries = ${frequencyBonus} points`);
    }
    
    // Streak bonus system - escalating rewards
    if (journalStreak > 0) {
      let streakBonus = 0;
      if (journalStreak >= 1 && journalStreak < 3) {
        streakBonus = 2; // 1-2 day streak: 2 points
      } else if (journalStreak >= 3 && journalStreak < 7) {
        streakBonus = 8; // 3-6 day streak: 8 points
      } else if (journalStreak >= 7 && journalStreak < 14) {
        streakBonus = 15; // 1-2 week streak: 15 points
      } else if (journalStreak >= 14 && journalStreak < 30) {
        streakBonus = 25; // 2-4 week streak: 25 points
      } else if (journalStreak >= 30) {
        streakBonus = 40; // 1+ month streak: 40 points
      }
      
      totalJournalBonus += streakBonus;
      console.log(`🔥 Journal streak bonus: ${journalStreak} days = ${streakBonus} points`);
    }
    
    // Weekly frequency bonus for consistent journaling
    if (weeklyJournalCount >= 3) {
      const weeklyBonus = Math.min(15, weeklyJournalCount * 2); // Up to 15 points (2 per weekly entry)
      totalJournalBonus += weeklyBonus;
      console.log(`📅 Weekly frequency bonus: ${weeklyJournalCount} entries = ${weeklyBonus} points`);
    }
    
      // Apply the total journal bonus
      if (totalJournalBonus > 0) {
        console.log(`🏆 TOTAL JOURNAL BONUS: ${totalJournalBonus} points reduction (WRI: ${wri} → ${Math.max(0, wri - totalJournalBonus)})`);
        wri = Math.max(0, wri - totalJournalBonus);
      }
    } else {
      console.log('📝 No journal activity detected - no bonuses applied');
    }
  } else {
    console.log('📝 Journal bonus calculation DISABLED for this WRI computation');
  }

  const band: WriOutput['risk_band'] = wri <= 24 ? 'green' : wri <= 49 ? 'yellow' : wri <= 74 ? 'orange' : 'red';

  // Flags
  const depressive_present = ((inputs.mood === 'sad' || inputs.mood === 'depressed') || wri >= 50) && (subscores.loneliness >= .5 || subscores.social_support >= .5 || subscores.confidence >= .5 || subscores.sleep >= .5);
  const depressive_high = (inputs.mood === 'depressed' && wri >= 75);
  const anxiety_present = (inputs.mood === 'anxious' || subscores.stress_level >= .5 || subscores.academic_pressure >= .5) && (subscores.sleep >= .5 || subscores.confidence >= .5);
  const anxiety_high = (inputs.stress_level === 'high' && inputs.academic_pressure === 'high');
  const burnout = (inputs.stress_level === 'high' && inputs.academic_pressure === 'high' && subscores.sleep >= .5);
  const isolation = (inputs.social_support === 'weak' || inputs.loneliness === 'often');
  const help_ready = (inputs.willingness_for_professional_support === 'yes');

  const flags: WriOutput['flags'] = {
    depressive_symptoms: depressive_high ? 'high_priority' : depressive_present ? 'present' : 'none',
    anxiety_symptoms: anxiety_high ? 'high_priority' : anxiety_present ? 'present' : 'none',
    burnout_academic_strain: burnout,
    social_isolation: isolation,
    help_readiness: help_ready
  };

  // Recommendations per policy
  const recs: Array<{ code: WriOutput['recommendations'][number]['code']; title: string; why: string; personalization?: string }> = [];
  const add = (code: any, title: string, why: string, personalization?: string) => {
    if (!recs.find(r => r.code === code)) recs.push({ code, title, why, personalization });
  };
  if (wri >= 75 || flags.depressive_symptoms === 'high_priority' || flags.anxiety_symptoms === 'high_priority') {
    add('A1', 'Professional help', 'High risk indicators; a counselor can provide structured support and planning.');
  }
  if (inputs.stress_level === 'high' || flags.anxiety_symptoms !== 'none') {
    add('A3', 'Meditation & yoga', 'Stress/anxiety signals present and sleep deviation; short daily practice can reduce arousal.');
  }
  if (inputs.academic_pressure !== 'low' || inputs.confidence !== 'high') {
    add('A2', 'Goal tracker (micro-goals)', 'Academic pressure and/or reduced confidence benefit from small, time-boxed steps.');
  }
  if (inputs.journal_writing === 'no' && wri >= 25) {
    add('A4', 'Journaling', 'Risk is elevated and journaling is off; brief daily reflection can offload worry and track triggers.');
  }
  if (flags.social_isolation) {
    const hobbyText = inputs.hobby === 'music' ? 'group jam or choir trial' : inputs.hobby === 'sports' ? 'beginner sports circle' : inputs.hobby === 'arts' ? 'art club meetup' : inputs.hobby === 'reading' ? 'reading circle' : 'beginner group';
    add('A5', 'Hobbies (group-based)', 'Social isolation indicators; group-based hobby can rebuild support.', `Match to hobby=${inputs.hobby} → suggest ${hobbyText}.`);
  }
  if (wri < 50) {
    add('A6', 'Wanderlust / light outings', 'Lower risk band; light outings can stabilize routine and mood.');
  }
  // Limit to 5, drop lowest-weight sourced ones last
  if (recs.length > 5) {
    const priority = { A1: 1, A3: 2, A2: 3, A5: 4, A6: 5, A4: 6 } as any; // drop later items first
    recs.sort((a,b)=>priority[a.code]-priority[b.code]);
    recs.splice(5);
  }

  // Copy
  const copy: WriOutput['copy'] = {
    one_liner: band === 'red' ? 'High stress indicators—let’s combine support with small daily wins.' : band === 'orange' ? 'Risk is elevated; consistent routines can help this week.' : band === 'yellow' ? 'Moderate risk—small adjustments can improve your days.' : 'You’re in the green—keep nurturing your habits.',
    band_explainer: band === 'red' ? 'Red band = prioritize support and structure now.' : band === 'orange' ? 'Orange band = elevated signals; add supportive routines.' : band === 'yellow' ? 'Yellow band = watchful mode; keep an eye on patterns.' : 'Green band = stable; maintain helpful activities.',
    trend_note: undefined
  };

  // History indices (if provided)
  let weekly_index: number|undefined, monthly_index: number|undefined, volatility: number|undefined;
  if (history && history.length) {
    const last7 = history.slice(-7).map(h=>h.wri);
    const last28 = history.slice(-28).map(h=>h.wri);
    const mean = (arr: number[]) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : undefined;
    weekly_index = mean(last7);
    monthly_index = mean(last28);
    if (last7.length) {
      const m = mean(last7)!; const varsum = last7.reduce((a,b)=>a+(b-m)*(b-m),0)/last7.length; volatility = Math.sqrt(varsum);
    }
    if (weekly_index !== undefined && last7.length===7) {
      const prev = history.slice(-14,-7).map(h=>h.wri); const pm = mean(prev);
      if (pm !== undefined) {
        const delta = Number((weekly_index - pm).toFixed(1));
        copy.trend_note = delta >= 5 ? 'Trending up.' : delta <= -5 ? 'Trending down, let’s tighten routines.' : undefined;
      }
    }
  }

  return { wri, risk_band: band, subscores, flags, recommendations: recs, copy, history_indexes: { weekly_index, monthly_index, volatility } };
}

export async function readRecentWriHistory(userEmail: string): Promise<Array<{ date: string; wri: number }>> {
  const col = collection(db, 'mood_scores', userEmail, 'daily');
  const snap = await getDocs(query(col, orderBy('date', 'asc'), limit(60)));
  const out: Array<{ date: string; wri: number }>=[];
  snap.forEach(d=>{ const data:any=d.data(); if (typeof data?.wri === 'number' && typeof data?.date === 'string') out.push({ date: data.date, wri: data.wri });});
  return out;
}

// Calculate journal streak and weekly activity from journal entries
export async function calculateJournalMetrics(userEmail: string): Promise<{
  journal_streak: number;
  weekly_journal_count: number;
  last_journal_date: string | null;
  journal_entries_today: number;
}> {
  try {
    console.log('🔍 CALCULATING JOURNAL METRICS for:', userEmail);
    
    // Use JournalService API with correct format (same as working JournalService)
    console.log('🔍 Making API call with userEmail:', userEmail);
    const response = await fetch(`https://journal-tipjtjdkwq-uc.a.run.app?action=list`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': userEmail // Backend expects this header
      },
      body: JSON.stringify({
        userId: userEmail, // User ID in body
        limit: 200, // Get enough journals for calculation
        offset: 0
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch journals:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return { journal_streak: 0, weekly_journal_count: 0, last_journal_date: null, journal_entries_today: 0 };
    }
    
    const data = await response.json();
    console.log('🔍 API Response structure:', data);
    
    // Check if it's the same structure as JournalService response
    const journals = data.journals || data.data?.journals || [];
    
    console.log('📚 Total journals fetched from API:', journals.length);
    console.log('🔍 RAW JOURNAL DATA:', journals);
    
    const entries: Array<{ date: string; userId: string; timestamp: Date }> = [];
    journals.forEach((journal: any) => {
      console.log('🔍 Journal entry data:', { 
        id: journal.id, 
        userId: journal.userId, 
        userEmail: userEmail,
        match: journal.userId === userEmail,
        createdAt: journal.createdAt 
      });
      // Check both userId and userEmail fields for flexibility
      if ((journal.userId === userEmail || journal.userEmail === userEmail) && journal.createdAt) {
        let timestamp: Date;
        if (journal.createdAt._seconds) {
          timestamp = new Date(journal.createdAt._seconds * 1000);
        } else if (journal.createdAt.toDate) {
          timestamp = journal.createdAt.toDate();
        } else if (journal.createdAt instanceof Date) {
          timestamp = journal.createdAt;
        } else {
          timestamp = new Date(journal.createdAt);
        }
        const date = timestamp.toISOString().slice(0, 10);
        entries.push({ date, userId: journal.userId, timestamp });
      }
    });

    console.log(`📊 Found ${entries.length} journal entries for user ${userEmail}`);

    // Group by date and count entries per day
    const dateMap = new Map<string, number>();
    entries.forEach(entry => {
      const count = dateMap.get(entry.date) || 0;
      dateMap.set(entry.date, count + 1);
    });

    const dateSet = new Set(Array.from(dateMap.keys()));
    const sortedDates = Array.from(dateSet).sort();
    
    const today = new Date().toISOString().slice(0, 10);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    // Calculate streak (consecutive days with entries) - start from today and go backwards
    let streak = 0;
    let checkDate = new Date();
    
    // Start checking from today or yesterday if today has no entries
    if (!dateSet.has(today)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (dateSet.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
      // Safety check to avoid infinite loop
      if (streak > 365) break;
    }
    
    // Count entries in last 7 days
    const weeklyCount = sortedDates.filter(date => date >= oneWeekAgo && date <= today).length;
    
    // Count entries today
    const todayCount = dateMap.get(today) || 0;
    
    // Find last journal date
    const lastDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
    
    const metrics = {
      journal_streak: streak,
      weekly_journal_count: weeklyCount,
      last_journal_date: lastDate,
      journal_entries_today: todayCount
    };
    
    console.log('📊 Calculated journal metrics:', metrics);
    
    return metrics;
  } catch (error) {
    console.error('❌ Error calculating journal metrics:', error);
    return {
      journal_streak: 0,
      weekly_journal_count: 0,
      last_journal_date: null,
      journal_entries_today: 0
    };
  }
}

// Store journal insights in encrypted form
export async function storeJournalInsights(userEmail: string, journalMetrics: {
  journal_streak: number;
  weekly_journal_count: number;
  last_journal_date: string | null;
  journal_entries_today: number;
}): Promise<void> {
  try {
    console.log('📤 STORING JOURNAL INSIGHTS:', { userEmail, journalMetrics });
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net'}/storeJournalInsights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail,
        journalData: journalMetrics
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Journal insights stored successfully:', result);
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to store journal insights:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ Failed to store encrypted journal insights:', error);
  }
}

// Get readable journal metrics directly from Firestore (faster than API)
export async function getReadableJournalMetrics(userEmail: string): Promise<{
  journal_streak: number;
  weekly_journal_count: number;
  last_journal_date: string | null;
  journal_entries_today: number;
} | null> {
  try {
    console.log('🔍 READING JOURNAL METRICS from Firestore for:', userEmail);
    const today = new Date().toISOString().slice(0, 10);
    const docRef = doc(db, 'Journal_insights', userEmail, 'daily', today);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.metrics) {
        console.log('✅ Found readable journal metrics:', data.metrics);
        return data.metrics;
      }
    }
    
    console.log('📭 No readable journal metrics found for today');
    return null;
  } catch (error) {
    console.error('❌ Failed to read journal metrics from Firestore:', error);
    return null;
  }
}

// Retrieve encrypted journal insights (for dashboard only)
export async function getEncryptedJournalInsights(userEmail: string): Promise<{
  journal_streak: number;
  weekly_journal_count: number;
  last_journal_date: string | null;
  journal_entries_today: number;
} | null> {
  try {
    console.log('🔍 FETCHING JOURNAL INSIGHTS for:', userEmail);
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net'}/getJournalInsights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail })
    });
    
    console.log('🔍 JOURNAL INSIGHTS RESPONSE:', response.status, response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Retrieved encrypted journal insights:', data);
      return data?.journalData || null;
    } else {
      const errorText = await response.text();
      console.log('❌ Failed to retrieve journal insights:', response.status, errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to retrieve encrypted journal insights:', error);
    return null;
  }
}

export async function writeTodayWri(userEmail: string, output: WriOutput): Promise<void> {
  const today = new Date();
  const key = today.toISOString().slice(0,10);
  const ref = doc(db, 'mood_scores', userEmail, 'daily', key);
  
  // Sanitize all data to remove undefined values
  const sanitizeObject = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          sanitized[key] = sanitizeObject(value);
        }
      }
      return sanitized;
    }
    return obj;
  };

  const payload = sanitizeObject({
    date: key,
    wri: output.wri,
    risk_band: output.risk_band,
    subscores: output.subscores,
    flags: output.flags,
    recommendations: output.recommendations,
    history_indexes: output.history_indexes ? {
      weekly_index: output.history_indexes.weekly_index ?? null,
      monthly_index: output.history_indexes.monthly_index ?? null,
      volatility: output.history_indexes.volatility ?? null,
    } : null,
    computedAt: Timestamp.now()
  });
  
  await setDoc(ref, payload, { merge: true });
}


