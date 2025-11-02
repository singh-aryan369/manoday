import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { computeWRI, normalizeInputs, WriOutput } from './MoodScoreService';

export type GoalTask = {
  id: string;
  title: string;
  description: string;
  category: 'mind' | 'body' | 'routine' | 'social' | 'emotion';
  xp: number;
  completed: boolean;
  duration?: string;
  flavor?: string;
  source: 'baseline' | 'sleep' | 'anger' | 'stress' | 'journal' | 'social' | 'custom' | 'daily' | 'weekly';
  wri_reduction?: number; // WRI points reduced when completed
  recommended_time?: string; // Suggested time to complete
  frequency?: 'daily' | 'weekly'; // Goal frequency
  reminder_time?: Date; // User-set reminder time
  calendar_event_id?: string; // Google Calendar event ID
  completed_dates?: string[]; // ISO date strings of completion
};

export type DailyGoalDoc = {
  date: string;
  tasks: GoalTask[];
  createdAt: Timestamp;
  lastUpdated: Timestamp;
};

export type GoalCompletionStats = {
  total_completions: number;
  current_streak: number;
  longest_streak: number;
  last_completed: string | null;
  total_wri_reduced: number;
  total_xp_earned: number;
};

const DAILY_GOALS_COLLECTION = 'daily_goals';

export const getTodayKey = () => new Date().toISOString().slice(0, 10);

// Remove undefined values from object (Firestore doesn't accept undefined)
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter(item => item !== undefined);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (value !== undefined) {
          cleaned[key] = removeUndefined(value);
        }
      }
    }
    return cleaned;
  }
  return obj;
};

// Predefined Daily Goals (refresh every day)
const dailyGoals: GoalTask[] = [
  {
    id: 'daily-hydration',
    title: '💧 Hydration Challenge',
    description: 'Drink 2-3 liters of water throughout the day. Track with a bottle or app.',
    category: 'body',
    xp: 10,
    wri_reduction: 1,
    completed: false,
    duration: 'All day',
    recommended_time: 'throughout_day',
    flavor: 'Hydration = Brain Power',
    source: 'daily',
    frequency: 'daily',
    completed_dates: []
  },
  {
    id: 'daily-mindfulness',
    title: '🧘 10-Minute Mindfulness',
    description: 'Start your day with 10 minutes of meditation, breathing, or mindful observation.',
    category: 'mind',
    xp: 20,
    wri_reduction: 2,
    completed: false,
    duration: '10 min',
    recommended_time: 'morning',
    flavor: 'Calm the chaos',
    source: 'daily',
    frequency: 'daily',
    completed_dates: []
  },
  {
    id: 'daily-sleep',
    title: '😴 Sleep 7-8 Hours',
    description: 'Prioritize quality sleep. Aim for 7-8 hours and track your bedtime.',
    category: 'routine',
    xp: 30,
    wri_reduction: 3,
    completed: false,
    duration: '7-8 hours',
    recommended_time: 'night',
    flavor: 'Sleep is your superpower',
    source: 'daily',
    frequency: 'daily',
    completed_dates: []
  },
  {
    id: 'daily-steps',
    title: '👟 Walk 3000 Steps',
    description: 'Get moving! Walk, jog, or pace around. Every step counts.',
    category: 'body',
    xp: 20,
    wri_reduction: 2,
    completed: false,
    duration: '20-30 min',
    recommended_time: 'evening',
    flavor: 'Move your body, clear your mind',
    source: 'daily',
    frequency: 'daily',
    completed_dates: []
  },
  {
    id: 'daily-gratitude',
    title: '✍️ Gratitude Note',
    description: 'Write one thing you\'re grateful for today. Keep it simple and sincere.',
    category: 'emotion',
    xp: 10,
    wri_reduction: 1,
    completed: false,
    duration: '2 min',
    recommended_time: 'night',
    flavor: 'Small wins, big shifts',
    source: 'daily',
    frequency: 'daily',
    completed_dates: []
  },
  {
    id: 'daily-screen-detox',
    title: '📵 No-Screen 30 Min Before Bed',
    description: 'Put away devices 30 minutes before sleep. Read, stretch, or reflect instead.',
    category: 'routine',
    xp: 10,
    wri_reduction: 1,
    completed: false,
    duration: '30 min',
    recommended_time: 'night',
    flavor: 'Better sleep starts here',
    source: 'daily',
    frequency: 'daily',
    completed_dates: []
  }
];

// Predefined Weekly Goals (refresh every week)
const weeklyGoals: GoalTask[] = [
  {
    id: 'weekly-jog',
    title: '🏃 45-Minute Jog/Walk',
    description: 'Go for a longer outdoor walk or jog. Enjoy nature and fresh air.',
    category: 'body',
    xp: 50,
    wri_reduction: 5,
    completed: false,
    duration: '45 min',
    recommended_time: 'weekend_morning',
    flavor: 'Weekend cardio boost',
    source: 'weekly',
    frequency: 'weekly',
    completed_dates: []
  },
  {
    id: 'weekly-hobby',
    title: '🎨 Attend Hobby/Class',
    description: 'Dedicate time to a hobby or attend a class you enjoy. Pursue your passion.',
    category: 'emotion',
    xp: 40,
    wri_reduction: 4,
    completed: false,
    duration: '1-2 hours',
    recommended_time: 'weekend',
    flavor: 'Feed your creative soul',
    source: 'weekly',
    frequency: 'weekly',
    completed_dates: []
  },
  {
    id: 'weekly-digital-detox',
    title: '📴 3-Hour Digital Detox',
    description: 'Completely disconnect from screens for 3 hours. No phone, no laptop.',
    category: 'routine',
    xp: 40,
    wri_reduction: 4,
    completed: false,
    duration: '3 hours',
    recommended_time: 'weekend',
    flavor: 'Reclaim your attention',
    source: 'weekly',
    frequency: 'weekly',
    completed_dates: []
  },
  {
    id: 'weekly-cleanup',
    title: '🧹 Room Cleanup',
    description: 'Organize and clean your living space. A tidy room = a tidy mind.',
    category: 'routine',
    xp: 30,
    wri_reduction: 3,
    completed: false,
    duration: '1 hour',
    recommended_time: 'sunday',
    flavor: 'Clear space, clear mind',
    source: 'weekly',
    frequency: 'weekly',
    completed_dates: []
  },
  {
    id: 'weekly-reflection',
    title: '📔 Weekly Self-Reflection',
    description: 'Review your week. What went well? What can improve? Write it down.',
    category: 'mind',
    xp: 30,
    wri_reduction: 3,
    completed: false,
    duration: '15 min',
    recommended_time: 'sunday_evening',
    flavor: 'Learn from your journey',
    source: 'weekly',
    frequency: 'weekly',
    completed_dates: []
  },
  {
    id: 'weekly-social',
    title: '🤝 Meet Someone Offline',
    description: 'Spend quality time with friends or family in person. Real connection matters.',
    category: 'social',
    xp: 50,
    wri_reduction: 5,
    completed: false,
    duration: '1-2 hours',
    recommended_time: 'weekend',
    flavor: 'Human connection unlocked',
    source: 'weekly',
    frequency: 'weekly',
    completed_dates: []
  }
];

// Legacy default tasks for personalization (kept for backward compatibility)
const defaultTasks: GoalTask[] = [
  {
    id: 'mindful-minute',
    title: 'Mindful Minute',
    description: 'Pause for 60 seconds, breathe in for 4, hold for 2, breathe out for 6.',
    category: 'mind',
    xp: 20,
    wri_reduction: 2,
    completed: false,
    duration: '1 min',
    flavor: 'Boost focus +2%',
    source: 'baseline'
  },
  {
    id: 'gratitude-boost',
    title: 'Gratitude Boost',
    description: 'Write down three small wins or kind moments from today.',
    category: 'mind',
    xp: 25,
    wri_reduction: 2,
    completed: false,
    duration: '4 min',
    flavor: 'Unlock 🌟 Calm Badge progress',
    source: 'baseline'
  },
  {
    id: 'movement-break',
    title: 'Movement Break',
    description: 'Stand, stretch shoulders and neck, and take 200 steps indoors.',
    category: 'body',
    xp: 25,
    wri_reduction: 2,
    completed: false,
    duration: '5 min',
    flavor: '+5 stamina, -3 stress',
    source: 'baseline'
  }
];

const addTaskOnce = (tasks: GoalTask[], task: GoalTask) => {
  if (!tasks.find(t => t.id === task.id)) {
    tasks.push(task);
  }
};

// Get the current week number for weekly goals
const getWeekNumber = (date: Date = new Date()): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

export const generatePersonalizedTasks = (wellnessData: any | undefined, wriSnapshot?: WriOutput | null): GoalTask[] => {
  // Start with daily goals (always included)
  const tasks: GoalTask[] = JSON.parse(JSON.stringify([...dailyGoals, ...weeklyGoals, ...defaultTasks]));

  if (!wellnessData) {
    return tasks;
  }

  const normalized = normalizeInputs(wellnessData);
  const wri = wriSnapshot || computeWRI(normalized, undefined, false);
  const moodRaw = String(wellnessData.mood || '').toLowerCase();
  const sleepDeviation = Math.abs((normalized.sleep_hours ?? 7) - 8);

  if (sleepDeviation >= 1.5 || (wri?.subscores?.sleep ?? 0) >= 0.5) {
    addTaskOnce(tasks, {
      id: 'sleep-reset',
      title: 'Sleep Reset Ritual',
      description: 'Pick a target lights-out time tonight. Power down screens 30 minutes before and jot one calming thought.',
      category: 'routine',
      xp: 35,
      wri_reduction: 2,
      completed: false,
      duration: '10 min',
      flavor: '+10 recovery when done 3 nights in a row',
      source: 'sleep'
    });
  }

  if (moodRaw === 'angry' || moodRaw === 'irritated' || moodRaw === 'frustrated') {
    addTaskOnce(tasks, {
      id: 'anger-cooldown',
      title: 'Anger Cooldown Quest',
      description: 'Follow a 5-minute anti-anger routine: box breathing, label the trigger, and shake out tension. Repeat daily for 7 days.',
      category: 'emotion',
      xp: 45,
      wri_reduction: 2,
      completed: false,
      duration: '5 min',
      flavor: 'Unlock 🔥 Resilience track (Day 1 of 7)',
      source: 'anger'
    });
  }

  if ((wri?.subscores?.stress_level ?? 0) >= 0.5 || (wri?.subscores?.academic_pressure ?? 0) >= 0.5) {
    addTaskOnce(tasks, {
      id: 'stress-reset',
      title: 'Stress Reset Break',
      description: 'Take a 7-minute walk or stretch, then rate your stress before and after to track the drop.',
      category: 'mind',
      xp: 40,
      wri_reduction: 2,
      completed: false,
      duration: '7 min',
      flavor: '+12 focus, -8 stress',
      source: 'stress'
    });
  }

  if (normalized.journal_writing === 'no') {
    addTaskOnce(tasks, {
      id: 'micro-journal',
      title: 'Micro Journal',
      description: 'Write 3 bullet points: feeling, trigger, one helpful action. Bonus XP if you log it in the Journal tab.',
      category: 'mind',
      xp: 30,
      wri_reduction: 2,
      completed: false,
      duration: '3 min',
      flavor: 'Unlock ✍️ Reflector badge',
      source: 'journal'
    });
  }

  if ((wri?.flags?.social_isolation ?? false) || (wri?.subscores?.social_support ?? 0) >= 0.5 || (wri?.subscores?.loneliness ?? 0) >= 0.5) {
    addTaskOnce(tasks, {
      id: 'reach-out',
      title: 'Reach-Out Mission',
      description: 'Send a voice note or meme to someone you trust. Bonus: schedule a 10-minute catch-up.',
      category: 'social',
      xp: 30,
      wri_reduction: 2,
      completed: false,
      duration: '5 min',
      flavor: '+8 connection, unlock 🧑‍🤝‍🧑 Support badge',
      source: 'social'
    });
  }

  return tasks;
};

// LocalStorage key for goals backup
const getLocalStorageKey = (userEmail: string, dateKey: string) => 
  `manoday_goals_${userEmail}_${dateKey}`;

export const fetchTodayGoals = async (userEmail: string, dateKey: string = getTodayKey()): Promise<GoalTask[] | null> => {
  try {
    const ref = doc(db, DAILY_GOALS_COLLECTION, userEmail, 'days', dateKey);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      // Try localStorage as fallback
      const localStorageKey = getLocalStorageKey(userEmail, dateKey);
      const localData = localStorage.getItem(localStorageKey);
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          const tasks = parsed.tasks || [];
          console.log('✅ Loaded goals from localStorage:', tasks.length);
          return tasks.map((task: any) => ({
            ...task,
            reminder_time: task.reminder_time ? new Date(task.reminder_time) : undefined,
            completed: Boolean(task.completed)
          })) as GoalTask[];
        } catch (e) {
          console.warn('Failed to parse localStorage goals:', e);
        }
      }
      return null;
    }
    
    const data = snap.data() as Partial<DailyGoalDoc>;
    if (!Array.isArray(data.tasks)) return null;
    
    // Parse reminder_time from ISO string to Date object if it exists
    const tasks = data.tasks.map(task => ({
      ...task,
      reminder_time: task.reminder_time 
        ? (typeof task.reminder_time === 'string' ? new Date(task.reminder_time) : task.reminder_time)
        : undefined,
      completed: Boolean(task.completed) // Ensure boolean
    })) as GoalTask[];
    
    // Also save to localStorage as backup
    const localStorageKey = getLocalStorageKey(userEmail, dateKey);
    localStorage.setItem(localStorageKey, JSON.stringify({ tasks, date: dateKey }));
    
    return tasks;
  } catch (error) {
    console.error('Error fetching goals from Firestore:', error);
    // Try localStorage as fallback
    const localStorageKey = getLocalStorageKey(userEmail, dateKey);
    const localData = localStorage.getItem(localStorageKey);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        const tasks = parsed.tasks || [];
        console.log('✅ Loaded goals from localStorage (fallback):', tasks.length);
        return tasks.map((task: any) => ({
          ...task,
          reminder_time: task.reminder_time ? new Date(task.reminder_time) : undefined,
          completed: Boolean(task.completed)
        })) as GoalTask[];
      } catch (e) {
        console.warn('Failed to parse localStorage goals:', e);
      }
    }
    return null;
  }
};

export const saveTodayGoals = async (
  userEmail: string,
  tasks: GoalTask[],
  dateKey: string = getTodayKey(),
  options?: { setCreatedAt?: boolean }
): Promise<void> => {
  try {
    // CRITICAL: Verify user is authenticated before attempting to save
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('User is not authenticated. Please log in again.');
    }
    
    // Verify email matches authenticated user's email
    const authEmail = currentUser.email;
    if (!authEmail || authEmail !== userEmail) {
      console.warn(`⚠️ Email mismatch - provided: ${userEmail}, authenticated: ${authEmail}`);
      // Use authenticated email instead
      if (authEmail) {
        userEmail = authEmail;
      } else {
        throw new Error('User email not found in authentication token.');
      }
    }
    
    console.log(`🔐 Authentication verified - User: ${userEmail}`);
    console.log(`   - Auth state: ${currentUser ? 'authenticated' : 'not authenticated'}`);
    console.log(`   - User ID: ${currentUser.uid}`);
    console.log(`   - Email: ${currentUser.email}`);
    
    const ref = doc(db, DAILY_GOALS_COLLECTION, userEmail, 'days', dateKey);
    const now = Timestamp.now();
    
    // Serialize tasks, converting Date objects to ISO strings for Firestore
    // CRITICAL: Remove undefined values - Firestore doesn't accept undefined
    const serializedTasks = tasks.map(task => {
      const cleanedTask: any = {
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        xp: task.xp || 0,
        completed: Boolean(task.completed),
        source: task.source
      };
      
      // Only include optional fields if they have values (not undefined)
      if (task.duration !== undefined) cleanedTask.duration = task.duration;
      if (task.flavor !== undefined) cleanedTask.flavor = task.flavor;
      if (task.wri_reduction !== undefined) cleanedTask.wri_reduction = task.wri_reduction;
      if (task.recommended_time !== undefined) cleanedTask.recommended_time = task.recommended_time;
      if (task.frequency !== undefined) cleanedTask.frequency = task.frequency;
      if (task.reminder_time !== undefined && task.reminder_time !== null) {
        cleanedTask.reminder_time = task.reminder_time instanceof Date 
          ? task.reminder_time.toISOString() 
          : task.reminder_time;
      }
      if (task.calendar_event_id !== undefined) cleanedTask.calendar_event_id = task.calendar_event_id;
      if (task.completed_dates !== undefined) {
        cleanedTask.completed_dates = Array.isArray(task.completed_dates) ? task.completed_dates : [];
      }
      
      return cleanedTask;
    });
    
    const payload: Record<string, unknown> = {
      date: dateKey,
      tasks: serializedTasks,
      lastUpdated: now
    };
    if (options?.setCreatedAt) {
      payload.createdAt = now;
    }
    
    // CRITICAL: Remove all undefined values from payload before saving
    const cleanedPayload = removeUndefined(payload);
    
    // Save to Firestore
    console.log(`📤 Saving goals to Firestore: ${DAILY_GOALS_COLLECTION}/${userEmail}/days/${dateKey}`);
    console.log(`   - Tasks count: ${serializedTasks.length}`);
    console.log(`   - User authenticated: ${currentUser ? 'YES' : 'NO'}`);
    console.log(`   - Database: ${db.app.options.projectId}`);
    
    // CRITICAL: Actually save to Firestore (use cleaned payload without undefined values)
    console.log(`📦 Payload cleaned - tasks: ${cleanedPayload.tasks?.length || 0}, hasUndefined: ${JSON.stringify(payload).includes('undefined')}`);
    await setDoc(ref, cleanedPayload, { merge: true });
    
    // CRITICAL: Verify save succeeded by reading it back
    const verifyRef = doc(db, DAILY_GOALS_COLLECTION, userEmail, 'days', dateKey);
    const verifySnap = await getDoc(verifyRef);
    
    if (!verifySnap.exists()) {
      throw new Error('Failed to verify save - document does not exist after save');
    }
    
    const savedData = verifySnap.data();
    const savedTasks = (savedData?.tasks || []) as GoalTask[];
    
    console.log('✅ Saved goals to Firestore successfully!');
    console.log(`   - Collection path: ${DAILY_GOALS_COLLECTION}`);
    console.log(`   - Document path: ${userEmail}/days/${dateKey}`);
    console.log(`   - Verified: ${savedTasks.length} tasks saved`);
    console.log(`   - Check Firebase Console → ${DAILY_GOALS_COLLECTION} → ${userEmail} → days → ${dateKey}`);
    
    // Also save to localStorage as backup (always, even if Firestore succeeds)
    const localStorageKey = getLocalStorageKey(userEmail, dateKey);
    localStorage.setItem(localStorageKey, JSON.stringify({ 
      tasks: serializedTasks, 
      date: dateKey,
      lastUpdated: now.toMillis()
    }));
    console.log('✅ Saved goals to localStorage as backup');
  } catch (error: any) {
    console.error('❌ Error saving goals to Firestore:', error);
    console.error('   Error details:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      stack: error?.stack
    });
    console.error('   Collection path attempted:', `${DAILY_GOALS_COLLECTION}/${userEmail}/days/${dateKey}`);
    console.warn('⚠️ Falling back to localStorage only - goals will NOT persist in database!');
    // Still try to save to localStorage as backup
    try {
      const localStorageKey = getLocalStorageKey(userEmail, dateKey);
      // CRITICAL: Remove undefined values before saving to localStorage
      const serializedTasks = tasks.map(task => {
        const cleaned: any = {
          id: task.id,
          title: task.title,
          description: task.description,
          category: task.category,
          xp: task.xp || 0,
          completed: Boolean(task.completed),
          source: task.source
        };
        
        // Only include optional fields if they have values
        if (task.duration !== undefined) cleaned.duration = task.duration;
        if (task.flavor !== undefined) cleaned.flavor = task.flavor;
        if (task.wri_reduction !== undefined) cleaned.wri_reduction = task.wri_reduction;
        if (task.recommended_time !== undefined) cleaned.recommended_time = task.recommended_time;
        if (task.frequency !== undefined) cleaned.frequency = task.frequency;
        if (task.reminder_time !== undefined && task.reminder_time !== null) {
          cleaned.reminder_time = task.reminder_time instanceof Date 
            ? task.reminder_time.toISOString() 
            : task.reminder_time;
        }
        if (task.calendar_event_id !== undefined) cleaned.calendar_event_id = task.calendar_event_id;
        if (task.completed_dates !== undefined) {
          cleaned.completed_dates = Array.isArray(task.completed_dates) ? task.completed_dates : [];
        }
        
        return cleaned;
      });
      localStorage.setItem(localStorageKey, JSON.stringify({ 
        tasks: serializedTasks, 
        date: dateKey,
        lastUpdated: Date.now()
      }));
      console.log('✅ Saved goals to localStorage (Firestore failed)');
    } catch (localError) {
      console.error('❌ Failed to save to localStorage:', localError);
      throw new Error('Failed to save goals to both Firestore and localStorage');
    }
  }
};

// Initialize or ensure goal stats exist in Firestore
export const initializeGoalStats = async (userEmail: string): Promise<GoalCompletionStats> => {
  const statsRef = doc(db, DAILY_GOALS_COLLECTION, userEmail, 'meta', 'stats');
  const snap = await getDoc(statsRef);
  
  if (!snap.exists()) {
    const initialStats: GoalCompletionStats = {
      total_completions: 0,
      current_streak: 0,
      longest_streak: 0,
      last_completed: null,
      total_wri_reduced: 0,
      total_xp_earned: 0
    };
    
    // Create the stats document in Firestore
    await setDoc(statsRef, initialStats);
    console.log('✅ Initialized goal stats for user:', userEmail);
    return initialStats;
  }
  
  return snap.data() as GoalCompletionStats;
};

// Calculate goal completion statistics
export const calculateGoalStats = async (userEmail: string): Promise<GoalCompletionStats> => {
  const statsRef = doc(db, DAILY_GOALS_COLLECTION, userEmail, 'meta', 'stats');
  const snap = await getDoc(statsRef);
  
  if (!snap.exists()) {
    // If stats don't exist, initialize them
    return await initializeGoalStats(userEmail);
  }
  
  return snap.data() as GoalCompletionStats;
};

// Update goal completion stats and calculate WRI reduction
export const updateGoalCompletionStats = async (
  userEmail: string,
  completedTask: GoalTask,
  dateKey: string = getTodayKey()
): Promise<number> => {
  const statsRef = doc(db, DAILY_GOALS_COLLECTION, userEmail, 'meta', 'stats');
  const currentStats = await calculateGoalStats(userEmail);
  
  const wriReduction = completedTask.wri_reduction || 0;
  const now = Timestamp.now();
  
  // Calculate streak
  let newStreak = currentStats.current_streak;
  if (currentStats.last_completed) {
    const lastDate = new Date(currentStats.last_completed);
    const today = new Date(dateKey);
    const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      // Consecutive day
      newStreak += 1;
    } else if (daysDiff === 0) {
      // Same day, keep streak
      newStreak = currentStats.current_streak;
    } else {
      // Streak broken
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }
  
  // Streak bonuses (same formula as journal bonuses)
  let streakBonus = 0;
  if (newStreak >= 3) {
    streakBonus = 2; // 3-day streak bonus
  }
  if (newStreak >= 7) {
    streakBonus = 3; // 1-week streak bonus
  }
  
  const totalWriReduction = wriReduction + streakBonus;
  
  const updatedStats: GoalCompletionStats = {
    total_completions: currentStats.total_completions + 1,
    current_streak: newStreak,
    longest_streak: Math.max(newStreak, currentStats.longest_streak),
    last_completed: dateKey,
    total_wri_reduced: currentStats.total_wri_reduced + totalWriReduction,
    total_xp_earned: currentStats.total_xp_earned + completedTask.xp
  };
  
  console.log('📊 Updating goal stats in Firestore:');
  console.log('  Path:', `daily_goals/${userEmail}/meta/stats`);
  console.log('  Previous stats:', currentStats);
  console.log('  Updated stats:', updatedStats);
  
  await setDoc(statsRef, updatedStats);
  
  console.log(`✅ Stats saved to Firestore! XP earned: ${completedTask.xp}, WRI reduction: ${wriReduction} + streak bonus: ${streakBonus} = ${totalWriReduction}`);
  
  return totalWriReduction;
};

// Calculate total WRI reduction from today's completed goals
export const calculateTodayWriReduction = (tasks: GoalTask[]): number => {
  return tasks
    .filter(task => task.completed && task.wri_reduction)
    .reduce((sum, task) => sum + (task.wri_reduction || 0), 0);
};
