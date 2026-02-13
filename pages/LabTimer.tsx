import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Flag, Clock, Timer, Hourglass, Plus, Minus, Download } from 'lucide-react';
import { PageHeader, Card, Button, Input } from '../components/UI';
import { downloadCSV } from '../utils';

// ==========================================
// LOGIC HOOKS: Modular Time Computations
// ==========================================

/**
 * useStopwatch: Handles drift-free elapsed time tracking.
 * Uses Date.now() delta for accuracy instead of setInterval accumulation.
 */
const useStopwatch = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const update = () => {
    if (startTimeRef.current) {
        setElapsedTime(Date.now() - startTimeRef.current);
        rafRef.current = requestAnimationFrame(update);
    }
  };

  const start = () => {
    if (!isRunning) {
      // If resuming, adjust start time so we don't jump
      startTimeRef.current = Date.now() - elapsedTime;
      setIsRunning(true);
      rafRef.current = requestAnimationFrame(update);
    }
  };

  const pause = () => {
    if (isRunning) {
      setIsRunning(false);
      cancelAnimationFrame(rafRef.current);
      // elapsedTime is already set by the last update call
    }
  };

  const reset = () => {
    setIsRunning(false);
    cancelAnimationFrame(rafRef.current);
    setElapsedTime(0);
    setLaps([]);
  };

  const lap = () => {
    if (isRunning) {
      setLaps(prev => [...prev, elapsedTime]);
    }
  };

  useEffect(() => {
      return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return { elapsedTime, isRunning, laps, start, pause, reset, lap };
};

/**
 * useCountdown: Handles target-based countdown.
 * Uses target timestamp to prevent drift.
 */
const useCountdown = (initialDurationMs: number) => {
  const [timeLeft, setTimeLeft] = useState(initialDurationMs);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const endTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const update = () => {
    const remaining = Math.max(0, endTimeRef.current - Date.now());
    setTimeLeft(remaining);
    
    if (remaining <= 0) {
        setIsRunning(false);
        setIsComplete(true);
        cancelAnimationFrame(rafRef.current);
    } else {
        rafRef.current = requestAnimationFrame(update);
    }
  };

  const start = () => {
    if (timeLeft <= 0) return;
    if (!isRunning) {
       endTimeRef.current = Date.now() + timeLeft;
       setIsRunning(true);
       setIsComplete(false);
       rafRef.current = requestAnimationFrame(update);
    }
  };

  const pause = () => {
    if (isRunning) {
        setIsRunning(false);
        cancelAnimationFrame(rafRef.current);
    }
  };

  const reset = (newDuration?: number) => {
    setIsRunning(false);
    setIsComplete(false);
    cancelAnimationFrame(rafRef.current);
    setTimeLeft(newDuration ?? initialDurationMs);
  };

  // Allow setting duration dynamically
  const setDuration = (ms: number) => {
      reset(ms);
  };

  useEffect(() => {
      return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return { timeLeft, isRunning, isComplete, start, pause, reset, setDuration };
};

/**
 * useIntervalTimer: State machine for Work/Rest cycles.
 */
const useIntervalTimer = (workMs: number, restMs: number, totalCycles: number) => {
    const [phase, setPhase] = useState<'IDLE' | 'WORK' | 'REST' | 'FINISHED'>('IDLE');
    const [currentCycle, setCurrentCycle] = useState(1);
    const [timeLeft, setTimeLeft] = useState(workMs);
    
    const endTimeRef = useRef<number>(0);
    const rafRef = useRef<number>(0);
    // Explicitly typing the ref to allow phase transitions
    const stateRef = useRef<{ phase: 'IDLE' | 'WORK' | 'REST' | 'FINISHED'; cycle: number; workMs: number; restMs: number; totalCycles: number }>({ phase: 'IDLE', cycle: 1, workMs, restMs, totalCycles });

    // Sync refs when props/state change
    useEffect(() => {
        stateRef.current.workMs = workMs;
        stateRef.current.restMs = restMs;
        stateRef.current.totalCycles = totalCycles;
        stateRef.current.phase = phase;
        stateRef.current.cycle = currentCycle;
    }, [workMs, restMs, totalCycles, phase, currentCycle]);

    const update = () => {
        const remaining = Math.max(0, endTimeRef.current - Date.now());
        setTimeLeft(remaining);

        if (remaining <= 0) {
            // Transition Logic
            const { phase, cycle, totalCycles, workMs, restMs } = stateRef.current;
            
            if (phase === 'WORK') {
                if (cycle < totalCycles) {
                    // Transition to REST
                    setPhase('REST');
                    stateRef.current.phase = 'REST';
                    endTimeRef.current = Date.now() + restMs;
                    rafRef.current = requestAnimationFrame(update);
                } else {
                    // All cycles done
                    setPhase('FINISHED');
                    cancelAnimationFrame(rafRef.current);
                }
            } else if (phase === 'REST') {
                // Transition to WORK (Next Cycle)
                const nextCycle = cycle + 1;
                setCurrentCycle(nextCycle);
                setPhase('WORK');
                stateRef.current.cycle = nextCycle;
                stateRef.current.phase = 'WORK';
                endTimeRef.current = Date.now() + workMs;
                rafRef.current = requestAnimationFrame(update);
            }
        } else {
            rafRef.current = requestAnimationFrame(update);
        }
    };

    const start = () => {
        if (phase === 'IDLE' || phase === 'FINISHED') {
            setPhase('WORK');
            setCurrentCycle(1);
            stateRef.current.phase = 'WORK';
            stateRef.current.cycle = 1;
            endTimeRef.current = Date.now() + workMs;
            rafRef.current = requestAnimationFrame(update);
        } else {
            // Resume
            endTimeRef.current = Date.now() + timeLeft;
            rafRef.current = requestAnimationFrame(update);
        }
    };

    const pause = () => {
        if (phase === 'WORK' || phase === 'REST') {
            cancelAnimationFrame(rafRef.current);
            // TimeLeft is already set
        }
    };

    const reset = () => {
        cancelAnimationFrame(rafRef.current);
        setPhase('IDLE');
        setCurrentCycle(1);
        setTimeLeft(workMs);
    };

    useEffect(() => {
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    return { phase, currentCycle, timeLeft, start, pause, reset };
};

// ==========================================
// UI HELPERS
// ==========================================

const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const cs = Math.floor((ms % 1000) / 10); // Centiseconds

    const pad = (n: number) => n.toString().padStart(2, '0');
    return { text: `${pad(m)}:${pad(s)}`, sub: `.${pad(cs)}` };
};

// ==========================================
// PAGE COMPONENT
// ==========================================

type Mode = 'stopwatch' | 'countdown' | 'interval';

const LabTimer: React.FC = () => {
    const [mode, setMode] = useState<Mode>('stopwatch');

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Lab Timer" 
                description="Precision timing tools for experiments. Drift-free tracking with system timestamp sync."
            />

            <div className="flex justify-center mb-8">
                <div className="bg-slate-100 p-1 rounded-2xl inline-flex shadow-inner">
                    {[
                        { id: 'stopwatch', label: 'Stopwatch', icon: Clock },
                        { id: 'countdown', label: 'Countdown', icon: Timer },
                        { id: 'interval', label: 'Interval', icon: Hourglass }
                    ].map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setMode(m.id as Mode)}
                            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center space-x-2
                                ${mode === m.id 
                                    ? 'bg-white text-cyan-600 shadow-sm scale-100 ring-1 ring-black/5' 
                                    : 'text-slate-500 hover:text-slate-700 scale-95 hover:scale-100'
                                }`}
                        >
                            <m.icon size={16} />
                            <span>{m.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-4xl mx-auto">
                {mode === 'stopwatch' && <StopwatchView />}
                {mode === 'countdown' && <CountdownView />}
                {mode === 'interval' && <IntervalView />}
            </div>
        </div>
    );
};

// --- SUB-VIEWS ---

const StopwatchView: React.FC = () => {
    const { elapsedTime, isRunning, laps, start, pause, reset, lap } = useStopwatch();
    const time = formatTime(elapsedTime);

    const exportLaps = () => {
        const rows = laps.map((l, i) => [`Lap ${i+1}`, (l/1000).toFixed(3)]);
        downloadCSV('stopwatch_laps', ['Lap', 'Seconds'], rows);
    };

    return (
        <Card className="text-center py-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 to-blue-500" />
            
            {/* Display */}
            <div className="mb-10 font-mono text-slate-900 tracking-tighter">
                <span className="text-8xl font-bold">{time.text}</span>
                <span className="text-4xl text-slate-400 font-medium">{time.sub}</span>
            </div>

            {/* Controls */}
            <div className="flex justify-center space-x-4 mb-8">
                {!isRunning ? (
                    <Button onClick={start} size="lg" className="w-32 bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/30 text-white" icon={<Play size={20} fill="currentColor"/>}>
                        Start
                    </Button>
                ) : (
                    <Button onClick={pause} size="lg" className="w-32 bg-slate-900 text-white" icon={<Pause size={20} fill="currentColor"/>}>
                        Pause
                    </Button>
                )}
                
                <Button onClick={lap} disabled={!isRunning} variant="outline" size="lg" icon={<Flag size={20}/>}>
                    Lap
                </Button>
                
                <Button onClick={reset} variant="ghost" size="lg" className="text-red-500 hover:bg-red-50 hover:text-red-600">
                    <RotateCcw size={20} />
                </Button>
            </div>

            {/* Laps */}
            {laps.length > 0 && (
                <div className="max-w-md mx-auto animate-fadeIn text-left">
                    <div className="flex justify-between items-center mb-2 px-2">
                        <h4 className="font-bold text-slate-400 text-xs uppercase tracking-wider">Recorded Laps</h4>
                        <button onClick={exportLaps} className="text-cyan-600 hover:text-cyan-700 text-xs font-bold flex items-center">
                            <Download size={12} className="mr-1"/> CSV
                        </button>
                    </div>
                    <div className="bg-slate-50 rounded-xl border border-slate-100 max-h-48 overflow-y-auto">
                        <table className="w-full text-sm">
                            <tbody>
                                {laps.map((l, i) => {
                                    const lTime = formatTime(l);
                                    // Calculate split
                                    const prev = i > 0 ? laps[i-1] : 0;
                                    const split = formatTime(l - prev);
                                    return (
                                        <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-white transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-400 w-16">#{i+1}</td>
                                            <td className="px-4 py-3 font-mono text-slate-800">{lTime.text}{lTime.sub}</td>
                                            <td className="px-4 py-3 font-mono text-cyan-600 text-right">+{split.text}{split.sub}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Card>
    );
};

const CountdownView: React.FC = () => {
    // Default 5 minutes
    const [inputMin, setInputMin] = useState(5);
    const [inputSec, setInputSec] = useState(0);
    const { timeLeft, isRunning, isComplete, start, pause, reset, setDuration } = useCountdown(300000);
    const time = formatTime(timeLeft);

    const handleSet = () => {
        setDuration((inputMin * 60 + inputSec) * 1000);
    };

    return (
        <Card className="text-center py-10">
             {/* Display */}
             <div className={`mb-10 font-mono tracking-tighter transition-colors duration-300 ${isComplete ? 'text-emerald-500 animate-pulse' : 'text-slate-900'}`}>
                <span className="text-8xl font-bold">{time.text}</span>
            </div>

            {/* Status Message */}
            {isComplete && (
                <div className="mb-6 inline-flex items-center px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full font-bold text-sm animate-bounce">
                    Timer Complete!
                </div>
            )}

            {/* Controls */}
            <div className="flex justify-center space-x-4 mb-10">
                {!isRunning ? (
                    <Button onClick={start} disabled={timeLeft <= 0} size="lg" className="w-32 bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/30 text-white" icon={<Play size={20} fill="currentColor"/>}>
                        {timeLeft < 100 && !isComplete ? 'Resume' : 'Start'}
                    </Button>
                ) : (
                    <Button onClick={pause} size="lg" className="w-32 bg-slate-900 text-white" icon={<Pause size={20} fill="currentColor"/>}>
                        Pause
                    </Button>
                )}
                <Button onClick={() => reset()} variant="ghost" size="lg" className="text-slate-500">
                    <RotateCcw size={20} />
                </Button>
            </div>

            {/* Setup */}
            <div className="max-w-xs mx-auto pt-8 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Set Duration</label>
                <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                        <Input 
                            label="" 
                            type="number" 
                            value={inputMin} 
                            onChange={(e) => setInputMin(Math.max(0, parseInt(e.target.value) || 0))}
                            className="text-center"
                        />
                        <span className="absolute right-3 top-3 text-slate-400 text-xs font-bold">m</span>
                    </div>
                    <span className="text-slate-300">:</span>
                    <div className="relative flex-1">
                        <Input 
                            label="" 
                            type="number" 
                            value={inputSec} 
                            onChange={(e) => setInputSec(Math.max(0, parseInt(e.target.value) || 0))} 
                            className="text-center"
                        />
                        <span className="absolute right-3 top-3 text-slate-400 text-xs font-bold">s</span>
                    </div>
                    <Button onClick={handleSet} variant="secondary">Set</Button>
                </div>
            </div>
        </Card>
    );
};

const IntervalView: React.FC = () => {
    // Setup State
    const [workSec, setWorkSec] = useState(30);
    const [restSec, setRestSec] = useState(10);
    const [cycles, setCycles] = useState(5);

    const { phase, currentCycle, timeLeft, start, pause, reset } = useIntervalTimer(workSec * 1000, restSec * 1000, cycles);
    
    const time = formatTime(timeLeft);
    const isRunning = phase === 'WORK' || phase === 'REST';

    return (
        <Card className="py-8 px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                
                {/* Visualizer Side */}
                <div className="text-center space-y-8">
                     <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
                         {/* Circle Background */}
                         <div className={`absolute inset-0 rounded-full border-8 opacity-20 transition-colors duration-500
                            ${phase === 'WORK' ? 'border-cyan-500' : phase === 'REST' ? 'border-orange-500' : 'border-slate-200'}
                         `} />
                         
                         <div className="z-10">
                             <div className={`text-sm font-bold uppercase tracking-widest mb-2 transition-colors duration-300
                                ${phase === 'WORK' ? 'text-cyan-600' : phase === 'REST' ? 'text-orange-500' : 'text-slate-400'}
                             `}>
                                 {phase === 'IDLE' ? 'Ready' : phase}
                             </div>
                             <div className="text-6xl font-mono font-bold text-slate-900 mb-2">
                                 {time.text}
                             </div>
                             {phase !== 'FINISHED' && (
                                 <div className="text-slate-400 font-medium">
                                     Cycle {currentCycle} / {cycles}
                                 </div>
                             )}
                         </div>
                     </div>

                     <div className="flex justify-center space-x-4">
                        {!isRunning && phase !== 'FINISHED' ? (
                            <Button onClick={start} size="lg" className="w-32 bg-cyan-500 hover:bg-cyan-600 text-white" icon={<Play size={20} fill="currentColor"/>}>
                                {phase === 'IDLE' ? 'Start' : 'Resume'}
                            </Button>
                        ) : phase !== 'FINISHED' ? (
                            <Button onClick={pause} size="lg" className="w-32 bg-slate-900 text-white" icon={<Pause size={20} fill="currentColor"/>}>
                                Pause
                            </Button>
                        ) : null}
                        
                        <Button onClick={reset} variant="ghost" size="lg" className="text-slate-500">
                            <RotateCcw size={20} />
                        </Button>
                     </div>
                </div>

                {/* Configuration Side */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center">
                        <SettingsIcon className="mr-2 text-slate-400" size={18} />
                        Configuration
                    </h3>

                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Work Duration</label>
                            <div className="flex items-center space-x-3">
                                <button onClick={() => setWorkSec(Math.max(5, workSec - 5))} className="p-2 rounded-full bg-white border hover:bg-slate-50"><Minus size={16}/></button>
                                <div className="flex-1 text-center font-mono text-xl font-bold text-cyan-700 bg-cyan-50 py-2 rounded-xl">{workSec}s</div>
                                <button onClick={() => setWorkSec(workSec + 5)} className="p-2 rounded-full bg-white border hover:bg-slate-50"><Plus size={16}/></button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Rest Duration</label>
                            <div className="flex items-center space-x-3">
                                <button onClick={() => setRestSec(Math.max(0, restSec - 5))} className="p-2 rounded-full bg-white border hover:bg-slate-50"><Minus size={16}/></button>
                                <div className="flex-1 text-center font-mono text-xl font-bold text-orange-700 bg-orange-50 py-2 rounded-xl">{restSec}s</div>
                                <button onClick={() => setRestSec(restSec + 5)} className="p-2 rounded-full bg-white border hover:bg-slate-50"><Plus size={16}/></button>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Cycles</label>
                            <div className="flex items-center space-x-3">
                                <button onClick={() => setCycles(Math.max(1, cycles - 1))} className="p-2 rounded-full bg-white border hover:bg-slate-50"><Minus size={16}/></button>
                                <div className="flex-1 text-center font-mono text-xl font-bold text-slate-700 bg-white border py-2 rounded-xl">{cycles}</div>
                                <button onClick={() => setCycles(cycles + 1)} className="p-2 rounded-full bg-white border hover:bg-slate-50"><Plus size={16}/></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const SettingsIcon: React.FC<{className?:string, size?:number}> = ({className, size}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);

export default LabTimer;