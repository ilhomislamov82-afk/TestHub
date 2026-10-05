import { useState } from 'react';
import { UserRole } from '../types';
import { dbService } from '../storage/db';
import { X, UserCheck, Shield, Phone, Lock, User as UserIcon } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
}

export function AuthModal({ isOpen, onClose, defaultRole = 'student' }: AuthModalProps) {
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [password, setPassword] = useState('');
  const [remember30Days, setRemember30Days] = useState(true);

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'login') {
      const res = dbService.loginUser(phone, role, password);
      if (!res.success) {
        setError(res.error || "Kirishda xatolik yuz berdi");
        return;
      }
      onClose();
    } else {
      const res = dbService.registerUser({
        role,
        firstName,
        lastName,
        phone,
        password,
      });
      if (!res.success) {
        setError(res.error || "Ro'yxatdan o'tishda xatolik yuz berdi");
        return;
      }
      onClose();
    }
  };

  const handleQuickDemo = (demoRole: UserRole, demoPhone: string) => {
    const res = dbService.loginUser(demoPhone, demoRole);
    if (res.success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              {role === 'teacher' ? <Shield className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {mode === 'login' ? 'Tizimga kirish' : "Ro'yxatdan o'tish"}
              </h3>
              <p className="text-xs text-blue-100">
                {role === 'teacher' ? "O'qituvchi boshqaruv paneli" : "O'quvchi sinov maydoni"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role Selector Tabs */}
        <div className="p-5 pb-0">
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setRole('student');
                setError(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                role === 'student'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              O'quvchi
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('teacher');
                setError(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                role === 'teacher'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              O'qituvchi
            </button>
          </div>
        </div>

        {/* Error message banner */}
        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ismingiz
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ali"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Familiyangiz
                </label>
                <input
                  type="text"
                  required
                  placeholder="Valiyev"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Telefon raqamingiz
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="tel"
                required
                placeholder="+998 90 123 45 67"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              SMS tasdiqlash talab qilinmaydi, telefon tizimga kirish kodi hisoblanadi.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Parol (PIN-kod)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="Parolni kiriting"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 30-day session preservation checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="remember30"
              checked={remember30Days}
              onChange={e => setRemember30Days(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label htmlFor="remember30" className="text-xs text-gray-600 cursor-pointer select-none">
              Ushbu qurilmada 30 kungacha eslab qolish
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition"
          >
            {mode === 'login' ? 'Tizimga kirish' : "Ro'yxatdan o'tish"}
          </button>

          {/* Switch Mode button */}
          <div className="text-center pt-1">
            {mode === 'login' ? (
              <p className="text-xs text-gray-600">
                Profilingiz yo'qmi?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Ro'yxatdan o'tish
                </button>
              </p>
            ) : (
              <p className="text-xs text-gray-600">
                Allaqachon hisobingiz bormi?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Kirish
                </button>
              </p>
            )}
          </div>
        </form>

        {/* One-click Demo Credentials Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">
            Tezkor sinov (bitta bosishda kirish):
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickDemo('student', '+998 93 111 22 33')}
              className="p-2 text-left bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition"
            >
              <div className="font-semibold text-gray-800">🎓 Sardorbek A.</div>
              <div className="text-[10px] text-gray-500">O'quvchi hisobi</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('teacher', '+998 90 123 45 67')}
              className="p-2 text-left bg-white border border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition"
            >
              <div className="font-semibold text-gray-800">👨‍🏫 Rustam Q.</div>
              <div className="text-[10px] text-gray-500">O'qituvchi hisobi</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
