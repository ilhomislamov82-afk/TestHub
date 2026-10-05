import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { TestWithQuestions, User, Question, ActiveTestProgress, TestResult } from '../types';
import { dbService } from '../storage/db';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  Wifi,
  WifiOff,
  HelpCircle
} from 'lucide-react';

interface TestTakingViewProps {
  test: TestWithQuestions;
  student: User;
  onFinish: (result: TestResult) => void;
  onCancel: () => void;
}

export function TestTakingView({ test, student, onFinish, onCancel }: TestTakingViewProps) {
  // Check if there is an unfinished progress in localStorage
  const existingProgress = useMemo(() => {
    return dbService.getActiveProgress(test.id, student.id);
  }, [test.id, student.id]);

  // Questions order & Options order
  const [questions, setQuestions] = useState<Question[]>(() => {
    const rawQuestions = [...test.questions];
    if (existingProgress?.shuffledQuestionOrder) {
      // Re-order matching existing progress
      const map = new Map(rawQuestions.map(q => [q.id, q]));
      const ordered: Question[] = [];
      existingProgress.shuffledQuestionOrder.forEach(id => {
        const found = map.get(id);
        if (found) ordered.push(found);
      });
      // add any missing
      rawQuestions.forEach(q => {
        if (!ordered.find(o => o.id === q.id)) ordered.push(q);
      });
      return ordered;
    }

    if (test.shuffleQuestions) {
      return [...rawQuestions].sort(() => Math.random() - 0.5);
    }
    return rawQuestions;
  });

  // Current question index
  const [currentIndex, setCurrentIndex] = useState(0);

  // Student's chosen answers: questionId -> optionId
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    return existingProgress?.answers || {};
  });

  // Tab exits count
  const [tabExitCount, setTabExitCount] = useState<number>(() => {
    return existingProgress?.tabExitCount || 0;
  });

  const [tabWarning, setTabWarning] = useState<string | null>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Timing
  const totalDurationSeconds = (test.timeLimitMinutes || 0) * 60;
  const startTimeRef = useRef<number>(existingProgress?.startTime || Date.now());

  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(() => {
    if (totalDurationSeconds <= 0) return 0; // unlimited
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    return Math.max(0, totalDurationSeconds - elapsed);
  });

  // Keep track of submission to prevent multiple submissions
  const submittedRef = useRef(false);

  // Auto-save progress helper
  const persistCurrentState = useCallback((currAnswers: Record<string, string>, exits: number) => {
    const progress: ActiveTestProgress = {
      testId: test.id,
      studentId: student.id,
      startTime: startTimeRef.current,
      durationSeconds: totalDurationSeconds,
      answers: currAnswers,
      tabExitCount: exits,
      lastSavedAt: Date.now(),
      isCompleted: false,
      shuffledQuestionOrder: questions.map(q => q.id),
    };
    dbService.saveActiveProgress(progress);
  }, [test.id, student.id, totalDurationSeconds, questions]);

  // Submit test attempt
  const executeSubmission = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);

    const elapsedSeconds = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
    const timeSpent = totalDurationSeconds > 0
      ? Math.min(totalDurationSeconds, elapsedSeconds)
      : elapsedSeconds;

    try {
      const result = dbService.submitTestAttempt({
        testId: test.id,
        student,
        answers,
        timeSpentSeconds: timeSpent,
        tabExitCount,
      });
      onFinish(result);
    } catch (err) {
      console.error('Submission failed:', err);
      setIsSubmitting(false);
      submittedRef.current = false;
    }
  }, [test.id, student, answers, totalDurationSeconds, tabExitCount, onFinish]);

  // 1. Timer effect
  useEffect(() => {
    if (totalDurationSeconds <= 0) return;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, totalDurationSeconds - elapsed);
      setTimeLeftSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        // Time expired: auto submit immediately
        executeSubmission();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [totalDurationSeconds, executeSubmission]);

  // 2. Tab/Window Exit detection effect
  useEffect(() => {
    let lastExitTime = 0;

    const recordExit = () => {
      if (submittedRef.current) return;
      const now = Date.now();
      // Debounce if blur and visibilitychange fire together within 1.5 seconds
      if (now - lastExitTime < 1500) return;
      lastExitTime = now;

      setTabExitCount(prev => {
        const next = prev + 1;
        setTabWarning(`Diqqat! Test oynasidan chiqish qayd etildi (${next}-marta). Bu ma'lumot o'qituvchiga ko'rsatiladi.`);
        persistCurrentState(answers, next);
        return next;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordExit();
      }
    };

    const handleBlur = () => {
      recordExit();
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [answers, persistCurrentState]);

  // Save initial progress once mounted
  useEffect(() => {
    persistCurrentState(answers, tabExitCount);
  }, []);

  // Answer selection handler
  const handleSelectOption = (questionId: string, optionId: string) => {
    const updated = {
      ...answers,
      [questionId]: optionId,
    };
    setAnswers(updated);
    persistCurrentState(updated, tabExitCount);
  };

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = totalDurationSeconds > 0 && timeLeftSeconds <= 120;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sticky Header with Timer and Progress */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.confirm("Testdan vaqtincha chiqmoqchimisiz? Natijangiz saqlanadi va qayta kirishingiz mumkin.")) {
                  onCancel();
                }
              }}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50"
            >
              Chiqish
            </button>
            <div>
              <h2 className="text-sm font-bold text-gray-900 line-clamp-1 max-w-[200px] sm:max-w-md">
                {test.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>
                  Javob berildi: <strong className="text-blue-600">{answeredCount}</strong> / {totalQuestions}
                </span>
                {!isOnline && (
                  <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md font-medium text-[11px]">
                    <WifiOff className="w-3 h-3" /> Oflayn saqlanmoqda
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Timer Badge */}
            {totalDurationSeconds > 0 ? (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold shadow-xs transition ${
                  isLowTime
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{formatTime(timeLeftSeconds)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs font-medium">
                <Clock className="w-3.5 h-3.5" />
                Cheklovsiz
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowConfirmSubmit(true)}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Yakunlash</span>
            </button>
          </div>
        </div>

        {/* Tab exit warning toast */}
        {tabWarning && (
          <div className="bg-amber-500 text-white text-xs py-1.5 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{tabWarning}</span>
            </div>
            <button
              onClick={() => setTabWarning(null)}
              className="font-bold underline text-[11px] ml-2"
            >
              Yopish
            </button>
          </div>
        )}
      </header>

      {/* Main Testing Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {/* Question Palette / Indicator */}
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs mb-4">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
            <span>Savollar xaritasi</span>
            <span>{currentIndex + 1} / {totalQuestions}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {questions.map((q, idx) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                    isCurrent
                      ? 'ring-2 ring-blue-600 bg-blue-600 text-white'
                      : isAnswered
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Card */}
        {currentQuestion && (
          <div className="flex-1 bg-white p-5 sm:p-8 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                <span>{currentIndex + 1}-Savol</span>
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold">
                  {currentQuestion.points} ball
                </span>
              </div>

              {/* Question Text */}
              <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug mb-6 whitespace-pre-line">
                {currentQuestion.text}
              </h3>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((opt) => {
                  const isSelected = answers[currentQuestion.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl border text-sm font-medium transition flex items-center gap-3.5 ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-600 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 border border-gray-300'
                        }`}
                      >
                        {opt.id}
                      </div>
                      <span className="flex-1 leading-relaxed">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions: Prev / Next */}
            <div className="flex items-center justify-between pt-8 mt-6 border-t border-gray-100">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Oldingi
              </button>

              {currentIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
                >
                  Keyingi
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(true)}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 text-white shadow-md transition"
                >
                  <Send className="w-4 h-4" />
                  Testni yakunlash
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-1">
              Testni yakunlaysizmi?
            </h4>
            <p className="text-xs text-gray-500 mb-4">
              Javob berilgan savollar: <strong className="text-gray-900">{answeredCount}</strong> / {totalQuestions} ta.
              {answeredCount < totalQuestions && (
                <span className="block text-amber-600 font-semibold mt-1">
                  Diqqat: {totalQuestions - answeredCount} ta savol javobsiz qolmoqda!
                </span>
              )}
            </p>

            {tabExitCount > 0 && (
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Test davomida {tabExitCount} marta sahifadan chiqilgan.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="py-2.5 px-3 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                Davom ettirish
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={executeSubmission}
                className="py-2.5 px-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {isSubmitting ? 'Topshirilmoqda...' : 'Ha, yakunlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
