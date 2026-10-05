import { useState, useMemo } from 'react';
import { User, TestWithQuestions, TestResult } from '../types';
import { dbService } from '../storage/db';
import { PerformanceChart } from './PerformanceChart';
import {
  FileText,
  Clock,
  Play,
  RotateCcw,
  CheckCircle,
  XCircle,
  Users,
  Award,
  Calendar,
  AlertTriangle,
  History,
  TrendingUp,
  Info
} from 'lucide-react';

interface StudentDashboardProps {
  student: User;
  onStartTest: (test: TestWithQuestions) => void;
  onViewResult: (result: TestResult, test: TestWithQuestions) => void;
}

export function StudentDashboard({ student, onStartTest, onViewResult }: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'tests' | 'results' | 'analytics'>('tests');

  // Groups student belongs to
  const allGroups = useMemo(() => dbService.getGroups(), []);
  const studentGroups = useMemo(() => {
    return allGroups.filter(g => student.groupIds?.includes(g.id));
  }, [allGroups, student.groupIds]);

  // Available tests with attempt calculations
  const availableTests = useMemo(() => {
    return dbService.getAvailableTestsForStudent(student);
  }, [student]);

  // Student's completed results
  const studentResults = useMemo(() => {
    return dbService.getResultsForStudent(student.id);
  }, [student.id]);

  // Check for unfinished active tests
  const unfinishedTests = useMemo(() => {
    return availableTests.filter(item => {
      const active = dbService.getActiveProgress(item.test.id, student.id);
      return active && !active.isCompleted;
    });
  }, [availableTests, student.id]);

  // Calculate summary stats
  const totalCompleted = studentResults.length;
  const passedCount = studentResults.filter(r => r.passed).length;
  const averagePercentage = totalCompleted > 0
    ? Math.round(studentResults.reduce((acc, r) => acc + r.percentage, 0) / totalCompleted)
    : 0;

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins} daq ${remainder} soniya`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Student Profile Overview Card */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md">
            {student.firstName[0]}
            {student.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">
                {student.firstName} {student.lastName}
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                O'quvchi
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Telefon: <strong className="text-gray-700">{student.phone}</strong>
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">Guruhlar:</span>
              {studentGroups.length > 0 ? (
                studentGroups.map(g => (
                  <span
                    key={g.id}
                    className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-100"
                  >
                    {g.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400 italic">Hech qaysi guruhga biriktirilmagan</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="grid grid-cols-3 gap-3 text-center border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
          <div className="bg-gray-50 p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-gray-400">Topshirildi</span>
            <div className="text-lg font-black text-gray-900 mt-0.5">{totalCompleted} ta</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-gray-400">O'tgan</span>
            <div className="text-lg font-black text-emerald-600 mt-0.5">{passedCount} ta</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-gray-400">O'rtacha</span>
            <div className="text-lg font-black text-blue-600 mt-0.5">{averagePercentage}%</div>
          </div>
        </div>
      </div>

      {/* Unfinished Test Recovery Banner */}
      {unfinishedTests.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <RotateCcw className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Tugallanmagan test mavjud!
              </h4>
              <p className="text-xs text-amber-700">
                Siz <strong>{unfinishedTests[0].test.title}</strong> testini boshlagansiz. Javoblaringiz saqlangan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onStartTest(unfinishedTests[0].test)}
            className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 shrink-0"
          >
            <Play className="w-4 h-4 fill-white" />
            Davom ettirish
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('tests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'tests'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          Mavjud testlar ({availableTests.length})
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'results'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <History className="w-4 h-4" />
          Natijalar tarixi ({studentResults.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'analytics'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          O'zlashtirish grafigi
        </button>
      </div>

      {/* Tab 1: Available Tests */}
      {activeTab === 'tests' && (
        <div>
          {availableTests.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800 mb-1">
                Hozircha biriktirilgan testlar yo'q
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                O'qituvchi guruhingiz uchun yangi test yaratganda yoki biriktirganda ushbu sahifada ko'rinadi.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableTests.map(({ test, attemptsCount, attemptsRemaining, canTake, reason }) => {
                const isUnfinished = !!dbService.getActiveProgress(test.id, student.id);
                return (
                  <div
                    key={test.id}
                    className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                          {test.assignedGroupId === 'all' ? 'Barcha guruhlar' : 'Maxsus guruh'}
                        </span>
                        {test.timeLimitMinutes > 0 ? (
                          <span className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {test.timeLimitMinutes} daqiqa
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">Vaqt cheklovsiz</span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-gray-900 mb-1.5 leading-snug">
                        {test.title}
                      </h3>
                      {test.description && (
                        <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                          {test.description}
                        </p>
                      )}

                      <div className="space-y-1.5 py-3 border-y border-gray-100 text-xs text-gray-600 mb-4">
                        <div className="flex justify-between">
                          <span>Savollar soni:</span>
                          <strong className="text-gray-900">{test.questions.length} ta</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>O'tish foizi:</span>
                          <strong className="text-gray-900">{test.passingPercentage}%</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Urinishlar:</span>
                          <strong className="text-gray-900">
                            {attemptsRemaining === 'unlimited'
                              ? `Foydalanildi: ${attemptsCount} (Cheksiz)`
                              : `Qoldi: ${attemptsRemaining} / ${test.allowedAttempts}`}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div>
                      {canTake ? (
                        <button
                          type="button"
                          onClick={() => onStartTest(test)}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-xs transition flex items-center justify-center gap-1.5 ${
                            isUnfinished
                              ? 'bg-amber-600 hover:bg-amber-700'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          {isUnfinished ? 'Testni davom ettirish' : 'Testni boshlash'}
                        </button>
                      ) : (
                        <div className="w-full py-2 px-3 bg-gray-100 text-gray-500 text-center rounded-xl text-xs font-medium border border-gray-200">
                          {reason || 'Test mavjud emas'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Results History */}
      {activeTab === 'results' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">
              Topshirilgan testlar natijalari ({studentResults.length})
            </h3>
            <span className="text-xs text-gray-400">Faqat sizning natijalaringiz</span>
          </div>

          {studentResults.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs">
              Siz hali birorta ham test topshirmagansiz.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4">Test nomi</th>
                    <th className="py-3 px-4">Sana</th>
                    <th className="py-3 px-4 text-center">Ball</th>
                    <th className="py-3 px-4 text-center">Natija</th>
                    <th className="py-3 px-4 text-center">Holat</th>
                    <th className="py-3 px-4">Vaqt</th>
                    <th className="py-3 px-4 text-center">Oynadan chiqish</th>
                    <th className="py-3 px-4 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {studentResults.map(r => {
                    const testObj = dbService.getTest(r.testId);
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3.5 px-4 font-semibold text-gray-900">
                          {r.testTitle}
                          <div className="text-[11px] text-gray-400 font-normal">
                            Urinish #{r.attemptNumber}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500">
                          {new Date(r.submittedAt).toLocaleString('uz-UZ', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-gray-800">
                          {r.score} / {r.maxScore}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`font-bold ${r.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                            {r.percentage}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              r.passed
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {r.passed ? (
                              <>
                                <CheckCircle className="w-3 h-3" /> O'tdi
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" /> O'tmadi
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 font-medium">
                          {formatSeconds(r.timeSpentSeconds)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              r.tabExitCount > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {r.tabExitCount} marta
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => testObj && onViewResult(r, testObj)}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 text-blue-600 hover:bg-blue-50 font-bold text-xs transition"
                          >
                            Tahlil
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Performance Dynamics */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <PerformanceChart results={studentResults} />

          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-xs text-blue-800 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Tizim tahlili: </strong>
              Ushbu grafik sizning vaqt davomida topshirgan barcha testlaringiz natijalarini ko'rsatadi. 60% dan yuqori natijalar o'tgan hisoblanadi (yashil nuqta).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
