import { TestResult, TestWithQuestions } from '../types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Award,
  ArrowLeft,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface TestResultModalProps {
  result: TestResult;
  test: TestWithQuestions;
  onClose: () => void;
}

export function TestResultModal({ result, test, onClose }: TestResultModalProps) {
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins} daqiqa ${secs} soniya`;
  };

  const showCorrectAnswers = test.showCorrectAnswers;
  const showExplanations = test.showExplanations;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden my-6">
        {/* Result Header Banner */}
        <div
          className={`p-6 text-center text-white ${
            result.passed
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700'
              : 'bg-gradient-to-r from-red-600 to-rose-700'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-3">
            {result.passed ? (
              <Award className="w-10 h-10 text-white" />
            ) : (
              <XCircle className="w-10 h-10 text-white" />
            )}
          </div>

          <span className="text-xs uppercase tracking-widest font-extrabold px-3 py-1 rounded-full bg-white/20 inline-block mb-1">
            {result.passed ? "Muvaffaqiyatli topshirildi" : "O'tish balli yetmadi"}
          </span>

          <h2 className="text-2xl font-black mb-1">{result.testTitle}</h2>
          <p className="text-xs opacity-90">
            {result.studentFirstName} {result.studentLastName} • Urinish #{result.attemptNumber}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs">
              <span className="text-[11px] font-semibold text-gray-500 uppercase">To'plangan Ball</span>
              <div className="text-lg font-black text-blue-600 mt-0.5">
                {result.score} <span className="text-xs text-gray-400 font-normal">/ {result.maxScore}</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs">
              <span className="text-[11px] font-semibold text-gray-500 uppercase">Ko'rsatkich</span>
              <div className={`text-lg font-black mt-0.5 ${result.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                {result.percentage}%
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs">
              <span className="text-[11px] font-semibold text-gray-500 uppercase flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> Vaqt
              </span>
              <div className="text-xs font-bold text-gray-800 mt-1 line-clamp-1">
                {formatTime(result.timeSpentSeconds)}
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs">
              <span className="text-[11px] font-semibold text-gray-500 uppercase flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" /> Oynadan chiqish
              </span>
              <div className={`text-lg font-black mt-0.5 ${result.tabExitCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {result.tabExitCount} marta
              </div>
            </div>
          </div>

          {result.tabExitCount > 0 && (
            <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Test davomida brauzer oynasidan <strong>{result.tabExitCount}</strong> marta chiqish holati qayd etildi. Bu intizomiy ko'rsatkich sifatida o'qituvchiga uzatildi.
              </span>
            </div>
          )}
        </div>

        {/* Detailed Question Review Section */}
        <div className="p-6 max-h-96 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              {showCorrectAnswers ? <Eye className="w-4 h-4 text-blue-600" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
              Savollar tahlili
            </h4>
            <span className="text-xs text-gray-500">
              {showCorrectAnswers ? "To'g'ri javoblar ko'rsatilgan" : "To'g'ri javoblar o'qituvchi tomonidan yopilgan"}
            </span>
          </div>

          {!showCorrectAnswers ? (
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center text-xs text-gray-600">
              Ushbu test sozlamalarida to'g'ri javoblarni va tushuntirishlarni ko'rsatish funksiyasi o'qituvchi tomonidan o'chirilgan.
            </div>
          ) : (
            test.questions.map((q, qIndex) => {
              const studentAnswer = result.answers[q.id];
              const isCorrect = studentAnswer && studentAnswer.toUpperCase() === q.correctAnswer.toUpperCase();

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-2xl border transition ${
                    isCorrect
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-red-50/30 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-500">
                      {qIndex + 1}-savol ({q.points} ball)
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> To'g'ri
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" /> Noto'g'ri
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-gray-900 mb-3 whitespace-pre-line">
                    {q.text}
                  </p>

                  <div className="space-y-1.5 text-xs">
                    {q.options.map(opt => {
                      const isStudentChoice = studentAnswer === opt.id;
                      const isCorrectChoice = q.correctAnswer === opt.id;

                      let optClasses = 'bg-white border-gray-200 text-gray-700';
                      if (isCorrectChoice) {
                        optClasses = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-semibold ring-1 ring-emerald-400';
                      } else if (isStudentChoice && !isCorrect) {
                        optClasses = 'bg-red-100 border-red-400 text-red-900 font-semibold line-through';
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`p-2 rounded-xl border flex items-center justify-between ${optClasses}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-black/5 flex items-center justify-center font-bold text-[10px]">
                              {opt.id}
                            </span>
                            <span>{opt.text}</span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px]">
                            {isCorrectChoice && (
                              <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> To'g'ri javob
                              </span>
                            )}
                            {isStudentChoice && (
                              <span className="text-blue-700 font-semibold ml-1">
                                (Sizning javobingiz)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {showExplanations && q.explanation && (
                    <div className="mt-3 p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-900 text-xs flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-semibold">Izoh: </strong>
                        {q.explanation}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Bosh sahifaga qaytish
          </button>
        </div>
      </div>
    </div>
  );
}
