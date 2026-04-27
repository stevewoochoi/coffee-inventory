import { useState, type FormEvent } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { login, isLoading, error: rawError } = useAuthStore();

  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('expired') === '1';

  const ERROR_MESSAGES: Record<string, string> = {
    ACCOUNT_PENDING: t('auth.accountPending'),
    ACCOUNT_REJECTED: t('auth.accountRejected'),
    ACCOUNT_SUSPENDED: t('auth.accountSuspended'),
  };
  const error = rawError ? (ERROR_MESSAGES[rawError] || rawError) : null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const role = payload.role as string;
        if (role === 'SUPER_ADMIN' || role === 'BRAND_ADMIN') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/store', { replace: true });
        }
      }
    } catch {
      // error is handled by store
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'radial-gradient(circle at top left, rgba(10,110,209,0.12), transparent 32%), linear-gradient(180deg, #f9fbfd 0%, #eef3f8 100%)',
      }}
    >
      <div className="w-full max-w-[380px]">
        {/* Login Card */}
        <div className="bg-white rounded-[14px] border border-[#d5dde5] shadow-[0_20px_45px_rgba(28,55,90,0.12)] p-7">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-[30px] font-extrabold text-[#223548] tracking-tight leading-tight">
              {t('auth.appTitle')}
            </h1>
            <p className="text-sm text-[#607080] mt-2">{t('auth.loginSubtitle')}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[13px] font-bold text-[#223548]">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full h-11 px-3 rounded-lg border border-[#b7c4d0] text-[15px] text-[#223548] bg-white transition-all duration-200 focus:outline-none focus:border-[#0a6ed1] focus:ring-[3px] focus:ring-[rgba(10,110,209,0.14)] placeholder:text-[#98a6b5]"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[13px] font-bold text-[#223548]">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full h-11 px-3 rounded-lg border border-[#b7c4d0] text-[15px] text-[#223548] bg-white transition-all duration-200 focus:outline-none focus:border-[#0a6ed1] focus:ring-[3px] focus:ring-[rgba(10,110,209,0.14)] placeholder:text-[#98a6b5]"
              />
            </div>

            {sessionExpired && !error && (
              <div className="bg-[#fff8e1] border border-[#f1d08a] rounded-lg px-3 py-2.5 text-[13px] font-bold text-[#8a5a00]">
                세션이 만료되었습니다. 다시 로그인해주세요.
              </div>
            )}
            {error && (
              <div className="bg-[#fff1f0] border border-[#f3c7c3] rounded-lg px-3 py-2.5 text-[13px] font-bold text-[#b42318]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#0a6ed1] text-white text-[15px] font-bold rounded-lg transition-all duration-200 hover:bg-[#085caf] hover:-translate-y-px active:translate-y-0 disabled:opacity-55 disabled:hover:translate-y-0"
            >
              {isLoading ? t('auth.loggingIn') : t('auth.login')}
            </button>

            <div className="h-px bg-[#e8eaf0] my-1" />

            <p className="text-center text-sm text-[#607080]">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-[#0a6ed1] hover:underline font-semibold">
                {t('auth.register')}
              </Link>
            </p>

            <div className="text-center">
              <select
                value={i18n.language?.substring(0, 2) || 'en'}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="text-sm text-[#607080] border border-[#d5dde5] rounded-md px-2 py-1.5 bg-white"
              >
                <option value="en">English</option>
                <option value="ko">한국어</option>
                <option value="ja">日本語</option>
              </select>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
