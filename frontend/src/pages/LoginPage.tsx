import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { login, isLoading, error: rawError } = useAuthStore();

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-slate-700">
            {t('auth.appTitle')}
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">{t('auth.loginSubtitle')}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full bg-slate-700 hover:bg-slate-800"
              disabled={isLoading}
            >
              {isLoading ? t('auth.loggingIn') : t('auth.login')}
            </Button>
            <Separator />

            <p className="text-center text-sm text-gray-500">
              {t('auth.noAccount')}{' '}
              <Link to="/register" className="text-slate-600 hover:underline font-medium">
                {t('auth.register')}
              </Link>
            </p>

            <div className="text-center">
              <select
                value={i18n.language?.substring(0, 2) || 'en'}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="text-sm text-gray-500 border rounded px-2 py-1"
              >
                <option value="en">English</option>
                <option value="ko">한국어</option>
                <option value="ja">日本語</option>
              </select>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
