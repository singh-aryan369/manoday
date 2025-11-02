import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiConfig } from '../config/apiConfig';
import {
  fetchTodayGoals,
  generatePersonalizedTasks,
  getTodayKey,
  GoalTask,
  saveTodayGoals,
  calculateGoalStats,
  calculateTodayWriReduction,
  GoalCompletionStats,
  initializeGoalStats,
  updateGoalCompletionStats
} from '../services/DailyGoalsService';
import {
  loadGoogleAPI,
  authenticateGoogleCalendar,
  isGoogleCalendarAuthenticated,
  checkAndRestoreCalendarConnection,
  createGoalReminder,
  updateGoalReminder,
  getRecommendedReminderTime,
  signOutGoogleCalendar
} from '../services/GoogleCalendarService';
import { BellIcon, CalendarIcon, FireIcon, TrophyIcon } from '@heroicons/react/24/outline';

type WellnessSnapshot = {
  mood?: string;
  sleepHours?: string | number;
  stressLevel?: string;
};

const categoryColors: Record<GoalTask['category'], string> = {
  mind: 'from-indigo-500 to-purple-500',
  body: 'from-green-500 to-emerald-500',
  routine: 'from-amber-500 to-orange-500',
  social: 'from-blue-500 to-cyan-500',
  emotion: 'from-rose-500 to-pink-500'
};

// GoalCard Component
const GoalCard: React.FC<{
  task: GoalTask;
  onToggle: (id: string) => void;
  onSetReminder: (task: GoalTask) => void;
  onQuickSetReminder: (task: GoalTask) => void;
  calendarConnected: boolean;
}> = ({ task, onToggle, onSetReminder, onQuickSetReminder, calendarConnected }) => {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur transition transform hover:-translate-y-1 hover:shadow-2xl`}>
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className={`absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r ${categoryColors[task.category]}`}></div>
      </div>
      <div className="relative p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <button
            onClick={() => onToggle(task.id)}
            className={`mt-1 h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full border-2 transition ${
              task.completed
                ? 'border-emerald-400 bg-emerald-500/30 text-emerald-200'
                : 'border-white/30 text-white/60'
            }`}
            aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {task.completed ? '✓' : ''}
          </button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold">{task.title}</h3>
              <span className={`text-xs uppercase tracking-widest px-2 py-1 rounded-full bg-white/10`}>
                {task.category}
              </span>
              <span className="text-xs uppercase tracking-widest px-2 py-1 rounded-full bg-blue-500/20 text-blue-200">
                {task.xp} XP
              </span>
              {task.wri_reduction && (
                <span className="text-xs uppercase tracking-widest px-2 py-1 rounded-full bg-green-500/20 text-green-200 flex items-center gap-1">
                  <TrophyIcon className="h-3 w-3" />
                  -{task.wri_reduction} WRI
                </span>
              )}
              {task.frequency && (
                <span className="text-xs uppercase tracking-widest px-2 py-1 rounded-full bg-purple-500/20 text-purple-200">
                  {task.frequency}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-200/90">{task.description}</p>
            {task.flavor && (
              <p className="mt-2 text-xs uppercase tracking-widest text-indigo-200/90">✨ {task.flavor}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-300/80">
              {task.duration && <span>⏱️ {task.duration}</span>}
              {task.recommended_time && !task.calendar_event_id && (
                <span>🕐 Best time: {task.recommended_time.replace(/_/g, ' ')}</span>
              )}
              {task.calendar_event_id && task.reminder_time && (
                <div className="flex items-center gap-2">
                  <span className="text-green-300 font-semibold">📅 Reminder:</span>
                  <span className="text-green-200 bg-green-500/20 px-2 py-0.5 rounded-full border border-green-400/40">
                    {new Date(task.reminder_time).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              )}
              {task.calendar_event_id && !task.reminder_time && (
                <span className="text-green-300">📅 Reminder set</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col md:items-end gap-2">
          <button
            onClick={() => onToggle(task.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition whitespace-nowrap ${
              task.completed
                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
                : 'bg-purple-500/20 text-purple-200 border border-purple-400/40 hover:bg-purple-500/30'
            }`}
          >
            {task.completed ? '✓ Completed' : 'Complete'}
          </button>
          
          {!task.completed && (
            <div className="flex gap-2">
              {task.calendar_event_id ? (
                <button
                  onClick={() => onSetReminder(task)}
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 hover:bg-indigo-500/30 transition whitespace-nowrap"
                  title="Edit reminder time"
                >
                  <CalendarIcon className="h-3 w-3" />
                  Edit Reminder
                </button>
              ) : calendarConnected ? (
                <>
                  <button
                    onClick={() => onQuickSetReminder(task)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-200 border border-green-400/40 hover:bg-green-500/30 transition whitespace-nowrap"
                    title="Set reminder with smart auto-generated time"
                  >
                    <BellIcon className="h-3 w-3" />
                    Quick Reminder
                  </button>
                  <button
                    onClick={() => onSetReminder(task)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 hover:bg-indigo-500/30 transition whitespace-nowrap"
                    title="Choose your own reminder time"
                  >
                    <CalendarIcon className="h-3 w-3" />
                    Custom
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onSetReminder(task)}
                  className="flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-amber-500/20 text-amber-200 border border-amber-400/40 hover:bg-amber-500/30 transition whitespace-nowrap"
                >
                  <BellIcon className="h-3 w-3" />
                  Connect Calendar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DailyGoalsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<GoalTask[]>([]);
  const [wellnessSnapshot, setWellnessSnapshot] = useState<WellnessSnapshot | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState<GoalTask['category']>('mind');
  const [goalStats, setGoalStats] = useState<GoalCompletionStats | null>(null);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalTask | null>(null);
  const [reminderDateTime, setReminderDateTime] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const todayKey = useMemo(() => getTodayKey(), []);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const totalXp = tasks.reduce((sum, task) => sum + (task.xp || 0), 0);
    const earnedXp = tasks.filter(task => task.completed).reduce((sum, task) => sum + (task.xp || 0), 0);
    const percent = total ? Math.round((completed / total) * 100) : 0;
    const wriReduction = calculateTodayWriReduction(tasks);
    
    // Separate daily and weekly goals
    const dailyGoals = tasks.filter(t => t.frequency === 'daily');
    const weeklyGoals = tasks.filter(t => t.frequency === 'weekly');
    const otherGoals = tasks.filter(t => !t.frequency || (t.frequency !== 'daily' && t.frequency !== 'weekly'));
    
    return { 
      total, 
      completed, 
      totalXp, 
      earnedXp, 
      percent, 
      wriReduction,
      dailyGoals,
      weeklyGoals,
      otherGoals
    };
  }, [tasks]);

  useEffect(() => {
    // Initialize Google Calendar API and check for existing connection
    const initCalendar = async () => {
      try {
        await loadGoogleAPI();
        // Wait a bit for Google API to fully initialize
        setTimeout(async () => {
          const isConnected = await checkAndRestoreCalendarConnection();
          setCalendarConnected(isConnected || isGoogleCalendarAuthenticated());
        }, 1000);
      } catch (error) {
        console.warn('Google Calendar API not available:', error);
      }
    };
    initCalendar();
  }, []);

  useEffect(() => {
    const loadGoals = async () => {
      if (!currentUser?.email) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Initialize goal stats if they don't exist (creates meta/stats collection)
        await initializeGoalStats(currentUser.email);
        
        // Load goal completion stats
        const stats = await calculateGoalStats(currentUser.email);
        setGoalStats(stats);
        
        let wellnessData: any = null;
        try {
          const response = await fetch(apiConfig.getEncryptedInsights, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userEmail: currentUser.email })
          });
          if (response.ok) {
            const result = await response.json();
            wellnessData = result?.data?.wellnessData || null;
            setWellnessSnapshot({
              mood: result?.data?.wellnessData?.mood,
              sleepHours: result?.data?.wellnessData?.sleepHours,
              stressLevel: result?.data?.wellnessData?.stressLevel
            });
          } else {
            console.warn('Failed to fetch wellness insights for goals:', await response.text());
          }
        } catch (insightsError) {
          console.warn('Error fetching wellness insights for goals:', insightsError);
        }

        // Step 1: Try to fetch existing goals from Firestore/localStorage
        let existing = await fetchTodayGoals(currentUser.email, todayKey);
        const existingTasks = (existing || []).map(task => ({
          ...task,
          completed: Boolean(task.completed), // Ensure boolean
          completed_dates: task.completed_dates || []
        }));

        console.log(`📥 Loaded ${existingTasks.length} existing goals from Firestore/localStorage`);

        // Step 2: Always generate personalized tasks (includes predefined daily/weekly goals)
        // This will work even if wellnessData is null/undefined
        let personalized: GoalTask[] = [];
        try {
          personalized = generatePersonalizedTasks(wellnessData || undefined, undefined);
          console.log(`✅ Generated ${personalized.length} personalized goals (including predefined daily/weekly goals)`);
        } catch (genError) {
          console.error('❌ Error generating personalized tasks:', genError);
          // If generation fails, still try to show existing tasks
          personalized = [];
        }

        // Step 3: Ensure we always have predefined goals, even if generation returned empty
        if (personalized.length === 0) {
          console.warn('⚠️ No goals generated, regenerating with minimal data...');
          try {
            personalized = generatePersonalizedTasks(undefined, undefined);
            console.log(`✅ Regenerated ${personalized.length} goals after empty result`);
          } catch (retryError) {
            console.error('❌ Failed to regenerate goals:', retryError);
          }
        }

        // Step 4: Merge existing tasks with newly generated tasks
        const existingMap = new Map(existingTasks.map(task => [task.id, task]));
        
        // Merge: prioritize stored data over new personalized tasks
        // This ensures completed state, reminders, XP, etc. are preserved
        const merged: GoalTask[] = personalized.map(task => {
          const stored = existingMap.get(task.id);
          if (stored) {
            // Stored task exists - merge but prioritize stored values
            return {
              ...task,              // Base from personalized (ensures all fields are present)
              ...stored,            // Override with stored values (completed, reminder_time, etc.)
              completed: Boolean(stored.completed), // Explicitly preserve completed state
              reminder_time: stored.reminder_time || task.reminder_time,
              calendar_event_id: stored.calendar_event_id || task.calendar_event_id,
              completed_dates: stored.completed_dates || task.completed_dates || [],
              // Preserve XP and WRI reduction from stored if they exist, otherwise use task defaults
              xp: stored.xp || task.xp,
              wri_reduction: stored.wri_reduction !== undefined ? stored.wri_reduction : task.wri_reduction
            };
          }
          // New task - use as-is
          return task;
        });
        
        // Step 5: Add custom tasks that aren't in personalized list
        const custom = existingTasks.filter(task => 
          !merged.find(t => t.id === task.id) && 
          (task.source === 'custom' || !personalized.find(p => p.id === task.id))
        );
        const finalTasks = [...merged, ...custom];

        console.log(`📊 Final tasks: ${finalTasks.length} total`);
        console.log(`   - Daily goals: ${finalTasks.filter(t => t.frequency === 'daily').length}`);
        console.log(`   - Weekly goals: ${finalTasks.filter(t => t.frequency === 'weekly').length}`);
        console.log(`   - Personalized: ${finalTasks.filter(t => !t.frequency && t.source !== 'custom').length}`);
        console.log(`   - Custom: ${custom.length}`);
        console.log(`   - Completed: ${finalTasks.filter(t => t.completed).length}`);

        // Step 6: Set tasks in state
        setTasks(finalTasks);
        
        // Step 7: Check if any goals have reminders set - if so, calendar was connected before
        const hasReminders = finalTasks.some(task => task.calendar_event_id);
        if (hasReminders && !calendarConnected) {
          setCalendarConnected(true);
        }

        // Step 8: ALWAYS save goals to Firestore to ensure persistence
        // This is critical for production - ensures goals are stored in database
        // We always save to ensure predefined goals are persisted for every user
        const isFirstLoad = !existing || existing.length === 0;
        
        // ALWAYS save if we have tasks (which we should always have after generation)
        if (finalTasks.length > 0) {
          try {
            await saveTodayGoals(currentUser.email, finalTasks, todayKey, { setCreatedAt: isFirstLoad });
            console.log(`✅ Saved ${finalTasks.length} goals to Firestore (${finalTasks.filter(t => t.completed).length} completed)`);
            console.log(`   - First load: ${isFirstLoad}`);
            console.log(`   - User: ${currentUser.email}`);
            console.log(`   - Date: ${todayKey}`);
          } catch (saveError: any) {
            console.error('❌ Error saving goals to Firestore:', saveError);
            console.error('   Error details:', {
              message: saveError?.message,
              code: saveError?.code,
              stack: saveError?.stack
            });
            
            // Still save to localStorage as backup
            const localStorageKey = `manoday_goals_${currentUser.email}_${todayKey}`;
            const serializedTasks = finalTasks.map(task => ({
              ...task,
              reminder_time: task.reminder_time instanceof Date 
                ? task.reminder_time.toISOString() 
                : task.reminder_time
            }));
            localStorage.setItem(localStorageKey, JSON.stringify({ 
              tasks: serializedTasks, 
              date: todayKey
            }));
            console.log(`✅ Saved ${finalTasks.length} goals to localStorage as backup`);
            
            // Show error to user
            setError(`Failed to save goals to database: ${saveError?.message || 'Unknown error'}. Goals saved locally.`);
          }
        } else {
          console.warn('⚠️ No tasks to save - this should not happen!');
          setError('Failed to generate goals. Please refresh the page.');
        }
      } catch (err: any) {
        console.error('Failed to load daily goals:', err);
        setError(err?.message || 'Failed to load daily goals');
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, [currentUser?.email, todayKey]);

  const persistTasks = async (nextTasks: GoalTask[], options?: { setCreatedAt?: boolean }) => {
    if (!currentUser?.email) return;
    setTasks(nextTasks);
    setSaving(true);
    try {
      await saveTodayGoals(currentUser.email, nextTasks, todayKey, options);
      console.log(`✅ Saved ${nextTasks.length} tasks (${nextTasks.filter(t => t.completed).length} completed)`);
    } catch (persistError: any) {
      console.error('❌ Failed to save daily goals:', persistError);
      setError(`Failed to save your progress: ${persistError?.message || 'Unknown error'}. Data saved to localStorage as backup.`);
      // Tasks are still updated in state, so UI reflects changes
      // localStorage backup should have saved them
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    const taskToToggle = tasks.find(t => t.id === taskId);
    if (!taskToToggle) return;
    
    const nextTasks = tasks.map(task => {
      if (task.id === taskId) {
        const newCompleted = !task.completed;
        const completedDates = task.completed_dates || [];
        const todayStr = todayKey;
        
        // Update completed_dates array
        if (newCompleted) {
          // Add today's date if not already present
          if (!completedDates.includes(todayStr)) {
            completedDates.push(todayStr);
          }
        } else {
          // Remove today's date if uncompleting
          const index = completedDates.indexOf(todayStr);
          if (index > -1) {
            completedDates.splice(index, 1);
          }
        }
        
        return {
          ...task,
          completed: newCompleted,
          completed_dates: completedDates
        };
      }
      return task;
    });
    
    await persistTasks(nextTasks);
    
    // Update goal completion stats when completing a task
    const updatedTask = nextTasks.find(t => t.id === taskId);
    if (updatedTask && updatedTask.completed && !taskToToggle.completed && currentUser?.email) {
      try {
        const wriReduction = await updateGoalCompletionStats(currentUser.email, updatedTask, todayKey);
        console.log(`🎯 Task "${updatedTask.title}" completed! WRI reduction: -${wriReduction}, XP earned: +${updatedTask.xp}`);
        
        // Reload stats to show updated values
        const updatedStats = await calculateGoalStats(currentUser.email);
        setGoalStats(updatedStats);
        
        // Show success message
        setSuccessMessage(`🎉 Quest completed! +${updatedTask.xp} XP, -${wriReduction} WRI`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (error) {
        console.error('Error updating goal stats:', error);
      }
    }
    
    console.log(`✅ Task ${taskId} ${nextTasks.find(t => t.id === taskId)?.completed ? 'completed' : 'uncompleted'}`);
  };

  const handleAddCustomTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customTitle.trim()) return;
    const newTask: GoalTask = {
      id: `custom-${Date.now()}`,
      title: customTitle.trim(),
      description: 'Player-created quest. Make it yours!',
      category: customCategory,
      xp: 20,
      wri_reduction: 2, // Custom quests also reduce WRI by 2 points
      completed: false,
      source: 'custom',
      flavor: 'Earn style points for originality',
      completed_dates: []
    };
    setCustomTitle('');
    const nextTasks = [...tasks, newTask];
    await persistTasks(nextTasks);
    console.log(`✅ Added custom quest: "${newTask.title}" with WRI reduction: ${newTask.wri_reduction}`);
  };

  const handleConnectCalendar = async () => {
    try {
      await authenticateGoogleCalendar();
      setCalendarConnected(true);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Google Calendar');
    }
  };

  const handleDisconnectCalendar = () => {
    signOutGoogleCalendar();
    setCalendarConnected(false);
  };

  const handleSetReminder = (goal: GoalTask) => {
    if (!calendarConnected) {
      handleConnectCalendar();
      return;
    }
    setSelectedGoal(goal);
    // If reminder already exists, use that time; otherwise use recommended time
    const reminderTime = goal.reminder_time 
      ? new Date(goal.reminder_time)
      : getRecommendedReminderTime(goal);
    setReminderDateTime(reminderTime.toISOString().slice(0, 16));
    setReminderModalOpen(true);
  };

  const handleQuickSetReminder = async (goal: GoalTask) => {
    if (!calendarConnected) {
      setError('Please connect Google Calendar first');
      return;
    }
    
    try {
      setSaving(true);
      const recommendedTime = getRecommendedReminderTime(goal);
      const eventId = await createGoalReminder(goal, recommendedTime, currentUser!.email!);
      
      const nextTasks = tasks.map(task =>
        task.id === goal.id
          ? { ...task, calendar_event_id: eventId, reminder_time: recommendedTime }
          : task
      );
      await persistTasks(nextTasks);
      
      const formattedTime = recommendedTime.toLocaleString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      setSuccessMessage(`✅ Reminder set for "${goal.title}" on ${formattedTime}. You'll receive emails 30 min before AND at the exact time!`);
      setTimeout(() => setSuccessMessage(null), 8000);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to create reminder');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmReminder = async () => {
    if (!selectedGoal || !currentUser?.email) return;
    
    try {
      setSaving(true);
      const reminderTime = new Date(reminderDateTime);
      
      // If reminder already exists, update it; otherwise create new one
      let eventId = selectedGoal.calendar_event_id;
      if (eventId) {
        // Update existing reminder
        await updateGoalReminder(eventId, selectedGoal, reminderTime);
      } else {
        // Create new reminder
        eventId = await createGoalReminder(selectedGoal, reminderTime, currentUser.email);
      }
      
      // Update task with calendar event ID and new time
      const nextTasks = tasks.map(task =>
        task.id === selectedGoal.id
          ? { ...task, calendar_event_id: eventId, reminder_time: reminderTime }
          : task
      );
      await persistTasks(nextTasks);
      
      const formattedTime = reminderTime.toLocaleString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      setSuccessMessage(`✅ Reminder ${eventId === selectedGoal.calendar_event_id ? 'updated' : 'set'} for "${selectedGoal.title}" on ${formattedTime}!`);
      setTimeout(() => setSuccessMessage(null), 8000);
      
      setReminderModalOpen(false);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to create reminder');
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div>Please sign in to view your goals.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="bg-gradient-to-r from-purple-600/60 to-indigo-600/60 border border-purple-400/40 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">Daily Quest Log</h1>
                {goalStats && goalStats.current_streak >= 1 && (
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full border ${
                    goalStats.current_streak >= 7 
                      ? 'bg-orange-500/30 border-orange-400/60' 
                      : goalStats.current_streak >= 3
                      ? 'bg-orange-500/20 border-orange-400/40'
                      : 'bg-orange-500/10 border-orange-400/30'
                  }`}>
                    <FireIcon className="h-5 w-5 text-orange-400" />
                    <span className="text-orange-200 font-bold">
                      {goalStats.current_streak} Day{goalStats.current_streak > 1 ? ' Streak!' : ''}
                      {goalStats.current_streak >= 7 && ' 🔥'}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-indigo-100/80">
                Complete quests to earn XP, reduce WRI, and level up your wellness streak.
              </p>
              {wellnessSnapshot && (
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  {wellnessSnapshot.mood && (
                    <span className="bg-white/10 px-3 py-1 rounded-full">
                      Mood: <strong className="text-white/90">{wellnessSnapshot.mood}</strong>
                    </span>
                  )}
                  {wellnessSnapshot.sleepHours && (
                    <span className="bg-white/10 px-3 py-1 rounded-full">
                      Sleep: <strong className="text-white/90">{wellnessSnapshot.sleepHours}h</strong>
                    </span>
                  )}
                  {wellnessSnapshot.stressLevel && (
                    <span className="bg-white/10 px-3 py-1 rounded-full">
                      Stress: <strong className="text-white/90">{wellnessSnapshot.stressLevel}</strong>
                    </span>
                  )}
                </div>
              )}
              
              {/* Google Calendar Connection */}
              <div className="mt-4">
                {calendarConnected ? (
                  <button
                    onClick={handleDisconnectCalendar}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-400/40 rounded-xl text-green-200 hover:bg-green-500/30 transition-colors text-sm"
                  >
                    <CalendarIcon className="h-5 w-5" />
                    <span>Calendar Connected ✓</span>
                  </button>
                ) : (
                  <button
                    onClick={handleConnectCalendar}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-200 hover:bg-indigo-500/30 transition-colors text-sm"
                  >
                    <CalendarIcon className="h-5 w-5" />
                    <span>Connect Google Calendar for Reminders</span>
                  </button>
                )}
              </div>
            </div>
            
            {/* Stats Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-4">
              {/* Streak Card */}
              <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/40 rounded-2xl px-6 py-4 text-center">
                <div className="text-sm uppercase tracking-widest text-orange-200 flex items-center justify-center gap-1">
                  <FireIcon className="h-4 w-4" />
                  Streak
                </div>
                <div className="text-4xl font-black mt-1 text-orange-300">
                  {goalStats?.current_streak || 0}
                </div>
                <div className="mt-2 text-xs text-orange-100/80">
                  {goalStats?.longest_streak ? `Best: ${goalStats.longest_streak} days` : 'Start your streak!'}
                </div>
              </div>

              {/* Total XP Card */}
              <div className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-400/40 rounded-2xl px-6 py-4 text-center">
                <div className="text-sm uppercase tracking-widest text-purple-200">Total XP</div>
                <div className="text-4xl font-black mt-1 text-purple-300">
                  {goalStats?.total_xp_earned || 0}
                </div>
                <div className="mt-2 text-xs text-purple-100/80">
                  All-time earned
                </div>
              </div>
              
              {/* Today's XP Card */}
              <div className="bg-black/20 border border-white/10 rounded-2xl px-6 py-4 text-center">
                <div className="text-sm uppercase tracking-widest text-indigo-200">Today's XP</div>
                <div className="text-4xl font-black mt-1">
                  {stats.earnedXp}
                  <span className="text-indigo-200 text-base font-semibold ml-1">/ {stats.totalXp}</span>
                </div>
                <div className="mt-2 text-xs text-indigo-100/80">{stats.completed} / {stats.total} complete</div>
              </div>
              
              {/* Today's WRI Card */}
              <div className="bg-black/20 border border-white/10 rounded-2xl px-6 py-4 text-center">
                <div className="text-sm uppercase tracking-widest text-green-200 flex items-center justify-center gap-1">
                  <TrophyIcon className="h-4 w-4" />
                  Today's WRI
                </div>
                <div className="text-4xl font-black mt-1 text-green-400">
                  -{stats.wriReduction}
                </div>
                <div className="mt-2 text-xs text-green-100/80">
                  {goalStats ? `Total: -${goalStats.total_wri_reduced}` : 'Today\'s progress'}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 transition-all duration-500"
                style={{ width: `${stats.percent}%` }}
              ></div>
            </div>
            <div className="mt-2 text-xs uppercase tracking-widest text-indigo-200">{stats.percent}% completion</div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-300 hover:text-red-100">✕</button>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/40 text-green-200 px-4 py-3 rounded-xl flex items-center justify-between animate-slide-up">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="text-green-300 hover:text-green-100">✕</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin h-12 w-12 border-4 border-purple-300 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {/* Daily Goals Section */}
            {stats.dailyGoals.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-3xl">☀️</span> Daily Goals
                </h2>
                <div className="grid gap-4">
                  {stats.dailyGoals.map(task => (
                    <GoalCard 
                      key={task.id} 
                      task={task} 
                      onToggle={handleToggleTask} 
                      onSetReminder={handleSetReminder}
                      onQuickSetReminder={handleQuickSetReminder}
                      calendarConnected={calendarConnected} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Goals Section */}
            {stats.weeklyGoals.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-3xl">📅</span> Weekly Goals
                </h2>
                <div className="grid gap-4">
                  {stats.weeklyGoals.map(task => (
                    <GoalCard 
                      key={task.id} 
                      task={task} 
                      onToggle={handleToggleTask} 
                      onSetReminder={handleSetReminder}
                      onQuickSetReminder={handleQuickSetReminder}
                      calendarConnected={calendarConnected} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Goals (Personalized) */}
            {stats.otherGoals.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-3xl">✨</span> Personalized Quests
                </h2>
                <div className="grid gap-4">
                  {stats.otherGoals.map(task => (
                    <GoalCard 
                      key={task.id} 
                      task={task} 
                      onToggle={handleToggleTask} 
                      onSetReminder={handleSetReminder}
                      onQuickSetReminder={handleQuickSetReminder}
                      calendarConnected={calendarConnected} 
                    />
                  ))}
                </div>
              </div>
            )}

            {tasks.length === 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center text-white/70">
                No quests yet. Check back after your next chat or create your own quest below!
              </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-semibold mb-4">Create Your Own Quest</h3>
              <form onSubmit={handleAddCustomTask} className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  className="flex-1 bg-black/30 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Add your own daily quest..."
                  value={customTitle}
                  onChange={(event) => setCustomTitle(event.target.value)}
                  disabled={saving}
                />
                <select
                  className="bg-black/30 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value as GoalTask['category'])}
                  disabled={saving}
                >
                  <option value="mind">Mind</option>
                  <option value="body">Body</option>
                  <option value="routine">Routine</option>
                  <option value="social">Social</option>
                  <option value="emotion">Emotion</option>
                </select>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 px-6 py-3 rounded-xl font-semibold shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={saving}
                >
                  Add Quest
                </button>
              </form>
              {saving && (
                <div className="text-xs text-white/60 mt-2">Saving your quest...</div>
              )}
            </div>
          </>
        )}

        {/* Reminder Modal */}
        {reminderModalOpen && selectedGoal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-400/40 rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    <BellIcon className="h-6 w-6 text-indigo-400" />
                    {selectedGoal.calendar_event_id ? 'Edit Reminder' : 'Set Reminder'}
                  </h3>
                  {selectedGoal.reminder_time && (
                    <p className="text-sm text-green-300 mt-1">
                      Current reminder: {new Date(selectedGoal.reminder_time).toLocaleString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setReminderModalOpen(false)}
                  className="text-gray-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-lg font-semibold text-white mb-2">{selectedGoal.title}</p>
                <p className="text-sm text-gray-300">{selectedGoal.description}</p>
                {selectedGoal.wri_reduction && (
                  <p className="text-sm text-green-300 mt-2">💎 Completing this reduces WRI by {selectedGoal.wri_reduction} points</p>
                )}
              </div>

              <div className="mb-6 bg-indigo-500/10 border border-indigo-400/30 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-indigo-200 mb-2">📧 Gmail Notifications</h4>
                <div className="space-y-1 text-xs text-gray-300">
                  <p>✅ <strong>30 minutes before:</strong> Email to your Gmail</p>
                  <p>✅ <strong>At exact reminder time:</strong> Email to your Gmail</p>
                  <p>✅ <strong>10 minutes before:</strong> Popup notification</p>
                  <p className="text-indigo-200 mt-2">📅 Event will appear in your Google Calendar immediately</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ⏰ Select Date & Time for Reminder
                </label>
                <input
                  type="datetime-local"
                  value={reminderDateTime}
                  onChange={(e) => setReminderDateTime(e.target.value)}
                  className="w-full bg-black/30 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-amber-300">
                    💡 <strong>Smart suggestion:</strong> {selectedGoal.recommended_time?.replace(/_/g, ' ') || 'anytime'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Based on goal type and optimal completion time
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setReminderModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReminder}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold transition disabled:opacity-50"
                  disabled={saving || !reminderDateTime}
                >
                  {saving ? 'Setting...' : 'Set Reminder'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyGoalsPage;
