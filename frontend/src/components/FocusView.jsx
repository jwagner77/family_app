import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Zap,
  Sparkles,
  Trophy,
  Coffee,
  Volume2,
  VolumeX,
  Plus,
  Clock
} from 'lucide-react';

export default function FocusView({ showToast, permissions }) {
  const [todayTasks, setTodayTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [sessionType, setSessionType] = useState('pomodoro'); // 'pomodoro', 'short_break', 'long_break'
  
  // Timer settings (in seconds) loaded from DB settings or fallbacks
  const [workDuration, setWorkDuration] = useState(1500); // 25 mins
  const [shortBreak, setShortBreak] = useState(300); // 5 mins
  const [longBreak, setLongBreak] = useState(900); // 15 mins
  const [customDuration, setCustomDuration] = useState(1500); // 25 mins
  
  const [timeLeft, setTimeLeft] = useState(1500);
  const [timerRunning, setTimerRunning] = useState(false);
  const [tickingSound, setTickingSound] = useState(false);

  // Procrastination Buster Wizard
  const [busterOpen, setBusterOpen] = useState(false);
  const [busterSteps, setBusterSteps] = useState([]);
  const [busterStepTitle, setBusterStepTitle] = useState('');
  const [activeBusterStepIdx, setActiveBusterStepIdx] = useState(null);
  const [busterTimeLeft, setBusterTimeLeft] = useState(120); // 2 minutes for micro-steps
  const [busterTimerRunning, setBusterTimerRunning] = useState(false);

  // Confetti particles for dopamine hits
  const [confetti, setConfetti] = useState([]);

  // Audio Context Ref
  const audioContextRef = useRef(null);

  const isReadOnly = permissions === 'read';

  useEffect(() => {
    fetchSettings();
    fetchTodayTasks();
  }, []);

  // Sync main countdown timer
  useEffect(() => {
    let interval = null;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          if (tickingSound) {
            playTickSound();
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft, tickingSound]);

  // Sync buster countdown timer
  useEffect(() => {
    let interval = null;
    if (busterTimerRunning && busterTimeLeft > 0) {
      interval = setInterval(() => {
        setBusterTimeLeft(prev => {
          if (prev <= 1) {
            handleBusterTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [busterTimerRunning, busterTimeLeft]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/focusflow/settings');
      if (res.ok) {
        const settings = await res.json();
        const workSec = Number(settings.pomodoro_work_duration) || 1500;
        const shortSec = Number(settings.pomodoro_short_break) || 300;
        const longSec = Number(settings.pomodoro_long_break) || 900;
        
        setWorkDuration(workSec);
        setShortBreak(shortSec);
        setLongBreak(longSec);
        setTickingSound(settings.focus_ticking_sound === 'true');
        
        // Default timer starting state
        setTimeLeft(workSec);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTodayTasks = async () => {
    try {
      const res = await fetch('/api/focusflow/tasks?status=today');
      if (res.ok) {
        const data = await res.json();
        const pendingToday = data.filter(t => t.status !== 'completed');
        setTodayTasks(pendingToday);
        if (pendingToday.length > 0) {
          setSelectedTaskId(String(pendingToday[0].id));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Sound: soft ticking
  const playTickSound = () => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime); // click frequency
      
      gain.gain.setValueAtTime(0.015, ctx.currentTime); // very low volume
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05); // quick decay
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      console.error(e);
    }
  };

  // Sound: cheerful arpeggio chime
  const playCompleteChime = () => {
    try {
      const ctx = getAudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
      const noteDuration = 0.15;
      
      notes.forEach((freq, idx) => {
        const time = ctx.currentTime + idx * noteDuration;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.5);
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleTimerComplete = async () => {
    setTimerRunning(false);
    playCompleteChime();
    triggerConfetti(70);

    const durationCompleted = getActiveDuration();

    try {
      if (!isReadOnly) {
        // Record focus session in DB
        await fetch('/api/focusflow/focus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_id: selectedTaskId ? Number(selectedTaskId) : null,
            type: sessionType,
            duration: durationCompleted,
            completed: true
          })
        });
      }

      if (sessionType === 'pomodoro' || sessionType === 'custom') {
        showToast(`Focus session completed! Time for a break. 🎯`, 'success');
        // Switch to short break
        setSessionType('short_break');
        setTimeLeft(shortBreak);
      } else {
        showToast(`Break completed! Ready to focus? ⚡`, 'success');
        setSessionType('pomodoro');
        setTimeLeft(workDuration);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTimerReset = () => {
    setTimerRunning(false);
    // We want to reset to the active type's duration
    const dur = sessionType === 'pomodoro' ? workDuration : sessionType === 'short_break' ? shortBreak : sessionType === 'long_break' ? longBreak : customDuration;
    setTimeLeft(dur);
  };

  const handleSkipTimer = () => {
    handleTimerComplete();
  };

  const selectSessionType = (type) => {
    setSessionType(type);
    setTimerRunning(false);
    const dur = type === 'pomodoro' ? workDuration : type === 'short_break' ? shortBreak : type === 'long_break' ? longBreak : customDuration;
    setTimeLeft(dur);
  };

  const triggerConfetti = (count = 50) => {
    const newConfetti = [];
    for (let i = 0; i < count; i++) {
      newConfetti.push({
        id: Math.random(),
        x: Math.random() * 100,
        y: -10,
        size: Math.random() * 10 + 6,
        color: `hsl(${Math.random() * 360}, 90%, 60%)`,
        delay: Math.random() * 0.5,
        duration: Math.random() * 1.5 + 1.0,
        shape: Math.random() > 0.5 ? 'circle' : 'square'
      });
    }
    setConfetti(newConfetti);
    setTimeout(() => setConfetti([]), 2500);
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getActiveDuration = () => {
    if (sessionType === 'pomodoro') return workDuration;
    if (sessionType === 'short_break') return shortBreak;
    if (sessionType === 'long_break') return longBreak;
    return customDuration;
  };

  // --- Procrastination Buster Logic ---
  const handleOpenBuster = () => {
    setBusterOpen(true);
    setBusterSteps([]);
    setBusterStepTitle('');
    setActiveBusterStepIdx(null);
    setBusterTimerRunning(false);
  };

  const handleAddBusterStep = () => {
    if (!busterStepTitle.trim()) return;
    setBusterSteps([...busterSteps, { title: busterStepTitle.trim(), completed: false }]);
    setBusterStepTitle('');
  };

  const handleStartBusterStep = (idx) => {
    setActiveBusterStepIdx(idx);
    setBusterTimeLeft(120); // 2 minutes
    setBusterTimerRunning(true);
  };

  const handleCompleteBusterStep = (idx) => {
    const next = [...busterSteps];
    next[idx].completed = true;
    setBusterSteps(next);
    setBusterTimerRunning(false);
    triggerConfetti(25);
    
    // Auto-advance to next step
    const nextIdx = idx + 1;
    if (nextIdx < next.length) {
      handleStartBusterStep(nextIdx);
    } else {
      // Completed all buster steps! Momentum is unlocked.
      showToast('Awesome! You broke the paralysis. Ready to start the main timer? 🚀', 'success');
      setBusterOpen(false);
      setTimerRunning(true); // Auto start main Pomodoro
    }
  };

  const handleBusterTimerComplete = () => {
    setBusterTimerRunning(false);
    playCompleteChime();
    showToast("2 minutes is up! Did you finish the step? You can check it off or add more time.", 'info');
  };

  // SVG circular ring helper variables
  const currentDuration = getActiveDuration();
  const progressPercent = currentDuration > 0 ? (currentDuration - timeLeft) / currentDuration : 0;
  const strokeDash = 628;
  const strokeOffset = strokeDash - (progressPercent * strokeDash);

  return (
    <div className="focus-view animate-fade-in" style={{ position: 'relative' }}>
      
      {/* Confetti Overlay */}
      {confetti.map(c => (
        <div 
          key={c.id} 
          className="confetti-particle"
          style={{
            position: 'fixed',
            left: `${c.x}vw`,
            top: `${c.y}vh`,
            width: `${c.size}px`,
            height: `${c.size}px`,
            backgroundColor: c.color,
            borderRadius: c.shape === 'circle' ? '50%' : '2px',
            pointerEvents: 'none',
            zIndex: 9999,
            animation: `confettiFall ${c.duration}s linear ${c.delay}s forwards`
          }}
        />
      ))}

      <div className="content-header">
        <div>
          <h2>Distraction-Free Focus</h2>
          <p>Time tracking and timer intervals tailored to ADHD focus patterns.</p>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        maxWidth: '100%',
        margin: '0 auto'
      }}>
        
        {/* Active Task Selector */}
        <div className="card" style={{ width: '100%', marginBottom: '2rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--muted-foreground)', display: 'block', marginBottom: '0.25rem' }}>
              FOCUS TARGET TASK
            </label>
            {todayTasks.length === 0 ? (
              <span style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                No active tasks on your Today list.
              </span>
            ) : (
              <select 
                className="input-control" 
                style={{ border: 'none', background: 'none', paddingLeft: 0, fontWeight: '600', fontSize: '0.95rem', height: '2rem' }}
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
              >
                {todayTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            )}
          </div>

          <button 
            className="btn btn-outline" 
            style={{ 
              height: '2.25rem', 
              color: '#d97706', 
              borderColor: '#f59e0b44', 
              background: '#f59e0b11',
              fontWeight: '600'
            }}
            onClick={handleOpenBuster}
          >
            ⚡ Procrastination Buster
          </button>
        </div>

        {/* Timer Panel */}
        <div className="card" style={{ 
          width: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          padding: '3rem 2rem',
          boxShadow: 'var(--shadow-lg)'
        }}>
          
          {/* Tab selector for Pomodoro work vs breaks */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', backgroundColor: 'var(--muted)', padding: '0.25rem', borderRadius: '8px' }}>
            <button 
              className="btn" 
              style={{ 
                height: '2rem', 
                fontSize: '0.8rem', 
                padding: '0 1rem', 
                backgroundColor: sessionType === 'pomodoro' ? 'var(--card)' : 'transparent',
                color: sessionType === 'pomodoro' ? 'var(--foreground)' : 'var(--muted-foreground)',
                border: 'none',
                boxShadow: sessionType === 'pomodoro' ? 'var(--shadow-sm)' : 'none'
              }}
              onClick={() => selectSessionType('pomodoro')}
            >
              Focus Session
            </button>
            <button 
              className="btn" 
              style={{ 
                height: '2rem', 
                fontSize: '0.8rem', 
                padding: '0 1rem', 
                backgroundColor: sessionType === 'short_break' ? 'var(--card)' : 'transparent',
                color: sessionType === 'short_break' ? 'var(--foreground)' : 'var(--muted-foreground)',
                border: 'none',
                boxShadow: sessionType === 'short_break' ? 'var(--shadow-sm)' : 'none'
              }}
              onClick={() => selectSessionType('short_break')}
            >
              Short Break
            </button>
            <button 
              className="btn" 
              style={{ 
                height: '2rem', 
                fontSize: '0.8rem', 
                padding: '0 1rem', 
                backgroundColor: sessionType === 'long_break' ? 'var(--card)' : 'transparent',
                color: sessionType === 'long_break' ? 'var(--foreground)' : 'var(--muted-foreground)',
                border: 'none',
                boxShadow: sessionType === 'long_break' ? 'var(--shadow-sm)' : 'none'
              }}
              onClick={() => selectSessionType('long_break')}
            >
              Long Break
            </button>
            <button 
              className="btn" 
              style={{ 
                height: '2rem', 
                fontSize: '0.8rem', 
                padding: '0 1rem', 
                backgroundColor: sessionType === 'custom' ? 'var(--card)' : 'transparent',
                color: sessionType === 'custom' ? 'var(--foreground)' : 'var(--muted-foreground)',
                border: 'none',
                boxShadow: sessionType === 'custom' ? 'var(--shadow-sm)' : 'none'
              }}
              onClick={() => selectSessionType('custom')}
            >
              Custom
            </button>
          </div>

          {sessionType === 'custom' && !timerRunning && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              marginBottom: '1rem', 
              background: 'var(--muted)', 
              padding: '0.35rem 0.75rem', 
              borderRadius: 'var(--radius)', 
              border: '1px solid var(--border)',
              fontSize: '0.8rem'
            }}>
              <span style={{ fontWeight: '600' }}>Custom Time (mins):</span>
              <input 
                type="number" 
                min="1" 
                max="720"
                value={Math.round(customDuration / 60)} 
                onChange={(e) => {
                  const mins = Math.max(1, parseInt(e.target.value) || 1);
                  setCustomDuration(mins * 60);
                  setTimeLeft(mins * 60);
                }}
                style={{ 
                  width: '60px', 
                  padding: '0.15rem 0.35rem', 
                  borderRadius: '4px', 
                  border: '1px solid var(--border)', 
                  background: 'var(--background)', 
                  color: 'var(--foreground)',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  textAlign: 'center'
                }}
              />
            </div>
          )}

          {/* SVG Animated Circular Ring & Digital Clock */}
          <div style={{ position: 'relative', width: '250px', height: '250px', marginBottom: '2.5rem' }}>
            
            <svg width="250" height="250" viewBox="0 0 250 250">
              <circle cx="125" cy="125" r="100" stroke="var(--border)" strokeWidth="8" fill="transparent" />
              <circle 
                cx="125" 
                cy="125" 
                r="100" 
                stroke={sessionType === 'pomodoro' ? 'var(--primary)' : sessionType === 'custom' ? '#f59e0b' : '#10b981'} 
                strokeWidth="8" 
                fill="transparent"
                strokeDasharray={strokeDash}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round" 
                transform="rotate(-90 125 125)" 
                style={{ transition: 'stroke-dashoffset 1s linear' }} 
              />
            </svg>

            {/* Inner text: Timer & Mode icon */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              {sessionType === 'pomodoro' ? (
                <Zap size={22} style={{ color: 'var(--primary)', marginBottom: '0.25rem' }} />
              ) : sessionType === 'custom' ? (
                <Clock size={22} style={{ color: '#f59e0b', marginBottom: '0.25rem' }} />
              ) : (
                <Coffee size={22} style={{ color: '#10b981', marginBottom: '0.25rem' }} />
              )}
              <span style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                {formatTimer(timeLeft)}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--muted-foreground)', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {sessionType === 'pomodoro' ? 'Work Interval' : sessionType === 'custom' ? 'Custom Session' : 'Rest Break'}
              </span>
            </div>

          </div>

          {/* Timer Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: '300px' }}>
            <button 
              className="btn btn-outline" 
              style={{ width: '2.5rem', height: '2.5rem', padding: 0 }}
              onClick={handleTimerReset}
              title="Reset Timer"
            >
              <RotateCcw size={16} />
            </button>

            <button 
              className="btn btn-primary" 
              style={{ 
                flex: 1, 
                height: '2.75rem', 
                fontSize: '1rem', 
                backgroundColor: timerRunning ? 'var(--foreground)' : 'var(--primary)',
                borderColor: timerRunning ? 'var(--foreground)' : 'var(--primary)'
              }}
              onClick={() => { getAudioContext(); setTimerRunning(!timerRunning); }}
            >
              {timerRunning ? (
                <><Pause size={18} fill="currentColor" /> Pause</>
              ) : (
                <><Play size={18} fill="currentColor" /> Start Focus</>
              )}
            </button>

            <button 
              className="btn btn-outline" 
              style={{ height: '2.5rem', fontSize: '0.8rem', padding: '0 0.75rem' }}
              onClick={handleSkipTimer}
              title="Skip Interval"
            >
              Skip
            </button>
          </div>

          {/* Audio options */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
            <button 
              type="button" 
              style={{ background: 'none', border: 'none', color: 'currentColor', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              onClick={() => setTickingSound(!tickingSound)}
            >
              {tickingSound ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>Rhythmic Heartbeat Tick ({tickingSound ? 'ON' : 'OFF'})</span>
            </button>
          </div>

        </div>

      </div>

      {/* Procrastination Buster Wizard Modal Overlay */}
      {busterOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--popover)', color: 'var(--popover-foreground)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d97706' }}>
                <Sparkles size={20} /> Procrastination Buster
              </h3>
              <button 
                className="btn btn-outline" 
                style={{ height: '1.5rem', width: '1.5rem', padding: 0, border: 'none', background: 'none' }}
                onClick={() => setBusterOpen(false)}
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              Initiation paralysis happens when a task feels too big or vague. 
              Let's defeat it by defining 3 **ridiculously tiny micro-steps** that take under 2 minutes each.
            </p>

            {activeBusterStepIdx === null ? (
              // Step 1: Write down 3 micro-steps
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input 
                    type="text" 
                    className="input-control" 
                    placeholder="e.g. Open Word document, type 1 word..." 
                    value={busterStepTitle}
                    onChange={(e) => setBusterStepTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBusterStep(); } }}
                  />
                  <button type="button" className="btn btn-primary" onClick={handleAddBusterStep}>
                    Add Step
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {busterSteps.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', backgroundColor: 'var(--muted)', borderRadius: '4px' }}>
                      <span style={{ fontSize: '0.85rem' }}>{idx + 1}. {step.title}</span>
                      <button type="button" className="btn btn-outline" style={{ height: '1.5rem', width: '1.5rem', padding: 0, border: 'none', background: 'none' }} onClick={() => handleRemoveBusterStep(idx)}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setBusterOpen(false)}>
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    disabled={busterSteps.length === 0}
                    onClick={() => handleStartBusterStep(0)}
                  >
                    Start First Step! 🚀
                  </button>
                </div>
              </div>
            ) : (
              // Step 2: Focus ONLY on active micro-step with 2-minute timer
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--muted-foreground)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ACTIVE MICRO-STEP ({activeBusterStepIdx + 1} of {busterSteps.length})
                </span>
                
                <h2 style={{ fontSize: '1.5rem', margin: '0.5rem 0 1.5rem', fontWeight: 'bold', color: 'var(--foreground)' }}>
                  "{busterSteps[activeBusterStepIdx].title}"
                </h2>

                <div style={{ 
                  fontSize: '3rem', 
                  fontFamily: 'var(--font-mono)', 
                  fontWeight: 'bold', 
                  color: busterTimeLeft <= 10 ? '#ef4444' : '#d97706',
                  marginBottom: '1.5rem' 
                }}>
                  {formatTimer(busterTimeLeft)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline"
                    onClick={() => setBusterTimerRunning(!busterTimerRunning)}
                  >
                    {busterTimerRunning ? 'Pause' : 'Resume'}
                  </button>

                  <button 
                    type="button" 
                    className="btn btn-primary"
                    style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                    onClick={() => handleCompleteBusterStep(activeBusterStepIdx)}
                  >
                    <CheckCircle size={16} /> I Did It!
                  </button>
                </div>

                <span style={{ display: 'block', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                  ⚠️ Just do this one tiny thing. Nothing else matters right now.
                </span>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
