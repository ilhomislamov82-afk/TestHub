import { useState, useEffect } from 'react';
import { User, TestWithQuestions, TestResult } from './types';
import { dbService } from './storage/db';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { StudentDashboard } from './components/StudentDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { TestTakingView } from './components/TestTakingView';
import { TestResultModal } from './components/TestResultModal';
import {
  GraduationCap,
  Shield,
  CheckCircle2,
  Users,
  Award,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => dbService.getCurrentUser());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDefaultRole, setAuthDefaultRole] = useState<'student' | 'teacher'>('student');

  // Active testing state
  const [activeTest, setActiveTest] = useState<TestWithQuestions | null>(null);

  // Completed result view modal
  const [activeResultModal, setActiveResultModal] = useState<{
    result: TestResult;
    test: TestWithQuestions;
  } | null>(null);

  // Subscribe to storage updates
  useEffect(() => {
    const unsubscribe = dbService.subscribe(() => {
      setCurrentUser(dbService.getCurrentUser());
    });
    return () => unsubscribe();
  }, []);

  // Handle starting a test
  const handleStartTest = (test: TestWithQuestions) => {
    setActiveTest(test);
  };

  // Handle test completion
  const handleFinishTest = (result: TestResult) => {
    if (activeTest) {
      const finishedTest = activeTest;
      setActiveTest(null);
      setActiveResultModal({ result, test: finishedTest });
    } else {
      setActiveTest(null);
    }
  };

  // Handle quick demo login from landing
  const handleLandingDemoLogin = (role: 'student' | 'teacher', phone: string) => {
    dbService.loginUser(phone, role);
  };

  // If student is currently taking a test, show full screen test interface
  if (activeTest && currentUser && currentUser.role === 'student') {
    return (
      <TestTakingView
        test={activeTest}
        student={currentUser}
        onFinish={handleFinishTest}
        onCancel={() => setActiveTest(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-gray-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onOpenAuth={() => {
          setAuthDefaultRole('student');
          setShowAuthModal(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {currentUser ? (
          currentUser.role === 'teacher' ? (
            <TeacherDashboard teacher={currentUser} />
          ) : (
            <StudentDashboard
              student={currentUser}
              onStartTest={handleStartTest}
              onViewResult={(result, test) => setActiveResultModal({ result, test })}
            />
          )
        ) : (
          /* ========================================================= */
          /* LANDING PAGE FOR UNAUTHENTICATED USERS */
          /* ========================================================= */
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                Zamonaviy va ishonchli ta'lim platformasi
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                Online Test Tizimi bilan bilimlarni oson baholang
              </h1>

              <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
                O'qituvchilar uchun qulay test tuzuvchi, guruhlar boshqaruvi, matn va DOCX fayllardan avtomatik savol yuklash hamda o'quvchilar intizomi nazorati.
              </p>

              {/* Quick Login Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setAuthDefaultRole('student');
                    setShowAuthModal(true);
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold shadow-md transition flex items-center justify-center gap-2"
                >
                  <GraduationCap className="w-4 h-4" />
                  O'quvchi sifatida kirish
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthDefaultRole('teacher');
                    setShowAuthModal(true);
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-gray-50 text-gray-800 rounded-2xl text-sm font-bold border border-gray-300 shadow-xs transition flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4 text-purple-600" />
                  O'qituvchi boshqaruvi
                </button>
              </div>
            </div>

            {/* Ready-to-use Demo Accounts (Direct 1-Click Access) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs">
              <div className="text-center max-w-md mx-auto mb-6">
                <h3 className="text-base font-bold text-gray-900">
                  Tezkor ko'rib chiqish (Namunaviy hisoblar)
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Hech narsa yozmasdan, bitta tugma orqali platforma imkoniyatlarini sinab ko'ring:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Demo Teacher */}
                <div
                  onClick={() => handleLandingDemoLogin('teacher', '+998 90 123 45 67')}
                  className="p-5 rounded-2xl border-2 border-purple-100 hover:border-purple-400 bg-purple-50/30 hover:bg-purple-50/60 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold mb-3 shadow-xs">
                      <Shield className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-purple-700 tracking-wider bg-purple-100 px-2 py-0.5 rounded-md">
                      O'qituvchi
                    </span>
                    <h4 className="text-base font-bold text-gray-900 mt-2">
                      Rustam Qodirov
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Testlar yaratish, guruhlar, DOCX import va savollar tahlili.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-purple-100 flex items-center justify-between text-xs font-bold text-purple-700">
                    <span>O'qituvchi paneliga kirish</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Demo Student 1 */}
                <div
                  onClick={() => handleLandingDemoLogin('student', '+998 93 111 22 33')}
                  className="p-5 rounded-2xl border-2 border-emerald-100 hover:border-emerald-400 bg-emerald-50/30 hover:bg-emerald-50/60 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold mb-3 shadow-xs">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider bg-emerald-100 px-2 py-0.5 rounded-md">
                      O'quvchi
                    </span>
                    <h4 className="text-base font-bold text-gray-900 mt-2">
                      Sardorbek Alimov
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      10-A sinf o'quvchisi. Tayyor testlarni topshirish va natijalarni ko'rish.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                    <span>Testlarni topshirish</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Demo Student 2 */}
                <div
                  onClick={() => handleLandingDemoLogin('student', '+998 94 222 33 44')}
                  className="p-5 rounded-2xl border-2 border-blue-100 hover:border-blue-400 bg-blue-50/30 hover:bg-blue-50/60 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold mb-3 shadow-xs">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider bg-blue-100 px-2 py-0.5 rounded-md">
                      O'quvchi
                    </span>
                    <h4 className="text-base font-bold text-gray-900 mt-2">
                      Malika Karimova
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      10-A sinf o'quvchisi. Faol testlar va o'zlashtirish dinamikasi.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-blue-100 flex items-center justify-between text-xs font-bold text-blue-700">
                    <span>Profilga kirish</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-gray-900">Vaqt nazorati va auto-topshirish</h4>
                <p className="text-gray-500 leading-relaxed">
                  Vaqt tugaganda test avtomatik ravishda yakunlanadi va to'plangan ball hisoblanadi.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-gray-900">Oynadan chiqish hisoblagichi</h4>
                <p className="text-gray-500 leading-relaxed">
                  Test paytida brauzer varag'idan boshqa oynaga o'tishlar soni aniqlanadi va qayd etiladi.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-gray-900">Guruhlar va o'quvchilar</h4>
                <p className="text-gray-500 leading-relaxed">
                  Testlarni muayyan guruhga biriktirish va a'zolar uchun maxsus sinovlar tashkil etish.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-gray-900">Excel / CSV hisoboti</h4>
                <p className="text-gray-500 leading-relaxed">
                  Barcha natijalarni saralab, bitta tugma bilan Excel dasturida ochiladigan formatda yuklab olish.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        defaultRole={authDefaultRole}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Test Result Modal */}
      {activeResultModal && (
        <TestResultModal
          result={activeResultModal.result}
          test={activeResultModal.test}
          onClose={() => setActiveResultModal(null)}
        />
      )}
    </div>
  );
}
