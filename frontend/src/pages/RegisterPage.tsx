import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: '', color: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Za-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[@$!%*#?&]/.test(password)) score++;
  if (password.length >= 12) score++;

  if (score <= 2) return { level: 1, label: 'weak', color: 'bg-red-500' };
  if (score <= 3) return { level: 2, label: 'medium', color: 'bg-yellow-500' };
  return { level: 3, label: 'strong', color: 'bg-green-500' };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = passwordConfirm ? password === passwordConfirm : null;

  const checkEmail = useCallback(async (emailValue: string) => {
    if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setEmailAvailable(null);
      return;
    }
    setEmailChecking(true);
    try {
      const res = await authApi.checkEmail(emailValue);
      setEmailAvailable(res.data.data.available);
    } catch {
      setEmailAvailable(null);
    } finally {
      setEmailChecking(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkEmail(email);
    }, 500);
    return () => clearTimeout(timer);
  }, [email, checkEmail]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await authApi.register({ email, password, passwordConfirm, name });
      setSuccess(true);
    } catch (err: any) {
      const message = err.response?.data?.message || t('auth.registerFailed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-700">
              {t('auth.appTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="rounded-full w-16 h-16 bg-green-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-800">{t('auth.registerComplete')}</p>
            <p className="text-sm text-gray-500">{t('auth.registerCompleteMsg')}</p>
            <Button
              className="w-full bg-slate-700 hover:bg-slate-800"
              onClick={() => navigate('/login')}
            >
              {t('auth.goToLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-slate-700">
            {t('auth.appTitle')}
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">{t('auth.registerSubtitle')}</p>
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
              {emailChecking && (
                <p className="text-xs text-gray-400">{t('auth.checkingEmail')}</p>
              )}
              {emailAvailable === false && (
                <p className="text-xs text-red-500">{t('auth.emailTaken')}</p>
              )}
              {emailAvailable === true && (
                <p className="text-xs text-green-500">{t('auth.emailAvailable')}</p>
              )}
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
                autoComplete="new-password"
              />
              {password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded ${
                          level <= passwordStrength.level ? passwordStrength.color : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${
                    passwordStrength.level === 1 ? 'text-red-500' :
                    passwordStrength.level === 2 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {t(`auth.passwordStrength.${passwordStrength.label}`)}
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-400">{t('auth.passwordHint')}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">{t('auth.passwordConfirm')}</Label>
              <Input
                id="passwordConfirm"
                type="password"
                placeholder={t('auth.passwordConfirmPlaceholder')}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
              {passwordsMatch === false && (
                <p className="text-xs text-red-500">{t('auth.passwordMismatch')}</p>
              )}
              {passwordsMatch === true && (
                <p className="text-xs text-green-500">{t('auth.passwordMatch')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t('auth.name')}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t('auth.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-slate-700 hover:bg-slate-800"
              disabled={isLoading || emailAvailable === false || passwordsMatch === false}
            >
              {isLoading ? t('auth.registering') : t('auth.register')}
            </Button>

            <Separator />

            <p className="text-center text-sm text-gray-500">
              {t('auth.haveAccount')}{' '}
              <Link to="/login" className="text-slate-600 hover:underline font-medium">
                {t('auth.login')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
