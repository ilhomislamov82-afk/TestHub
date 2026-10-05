import { useState, useEffect } from 'react';
import { User } from '../types';
import { dbService } from '../storage/db';
import {
  GraduationCap,
  User as UserIcon,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronDown
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  onSelectRole?: (role: 'student' | 'teacher') => void;
}

export function Navbar({ currentUser, onOpenAuth }: NavbarProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleQuickLogin = (role: 'student' | 'teacher', phone: string) => {
    dbService.loginUser(phone, role);
    setShowDemoMenu(false);
  };

  const handleLogout = () => {
    dbService.clearSession();
    setShowDemoMenu(false);
  };

  const handleResetDemoData = () => {
    if (window.confirm("Barcha ma'lumotlarni dastlabki holatga qaytarishni xohlaysizmi?")) {
      dbService.resetDatabaseToDefault();
      setShowDemoMenu(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm font-black text-xl">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-gray-900">
                  Test<span className="text-blue-600">Hub</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Online Test
                </span>
              </div>
              <p className="text-xs text-gray-500 hidden sm:block">
                Onlayn ta'lim va bilimni baholash platformasi
              </p>
            </div>
          </div>

          {/* Right section: Online Status, Profile / Auth, Quick Switch */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Online Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse'
              }`}
              title={isOnline ? 'Internet mavjud' : 'Oflayn rejim: ma\'lumotlar brauzerda saqlanadi'}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isOnline ? 'Onlayn' : 'Oflayn'}</span>
            </div>

            {/* Quick Demo Switcher Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                <span className="font-semibold text-blue-700">Namunaviy hisoblar</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showDemoMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowDemoMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-40 text-sm">
                    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      Tezkor profil tanlash
                    </div>
                    <button
                      onClick={() => handleQuickLogin('teacher', '+998 90 123 45 67')}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between text-gray-800"
                    >
                      <div>
                        <div className="font-medium">Rustam Qodirov</div>
                        <div className="text-xs text-gray-500">O'qituvchi (+998 90 123 45 67)</div>
                      </div>
                      <span className="text-[11px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-semibold">
                        O'qituvchi
                      </span>
                    </button>
                    <button
                      onClick={() => handleQuickLogin('student', '+998 93 111 22 33')}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between text-gray-800"
                    >
                      <div>
                        <div className="font-medium">Sardorbek Alimov</div>
                        <div className="text-xs text-gray-500">O'quvchi (10-A sinf)</div>
                      </div>
                      <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-semibold">
                        O'quvchi
                      </span>
                    </button>
                    <button
                      onClick={() => handleQuickLogin('student', '+998 94 222 33 44')}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between text-gray-800"
                    >
                      <div>
                        <div className="font-medium">Malika Karimova</div>
                        <div className="text-xs text-gray-500">O'quvchi (10-A sinf)</div>
                      </div>
                      <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-semibold">
                        O'quvchi
                      </span>
                    </button>

                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={handleResetDemoData}
                      className="w-full text-left px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Dastlabki namunaviy bazani tiklash
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* User profile or Login */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {currentUser.firstName[0]}
                    {currentUser.lastName[0]}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-semibold text-gray-800 leading-tight">
                      {currentUser.firstName} {currentUser.lastName}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {currentUser.role === 'teacher' ? "O'qituvchi" : "O'quvchi"}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Chiqish"
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <UserIcon className="w-3.5 h-3.5" />
                Kirish / Ro'yxatdan o'tish
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
