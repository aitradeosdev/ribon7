import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { login, validate2FA } from '../../api/auth'
import { getAccounts } from '../../api/accounts'
import { useAuthStore } from '../../store/authStore'
import { useAccountStore } from '../../store/accountStore'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function Login() {
  const navigate = useNavigate()
  const { login: storeLogin } = useAuthStore()
  const { setActiveAccount } = useAccountStore()
  const [step, setStep] = useState('credentials') // credentials | 2fa
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm()
  const { register: reg2fa, handleSubmit: handle2fa } = useForm()

  const onSubmit = async (data) => {
    setLoading(true); setError('')
    try {
      const res = await login(data)
      if (res.requires_2fa) { setPending(res); setStep('2fa') }
      else {
        storeLogin(res.user, res)
        const accounts = await getAccounts().catch(() => [])
        if (accounts.length) setActiveAccount(accounts[0])
        navigate(accounts.length ? '/home' : '/onboarding')
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Login failed')
    } finally { setLoading(false) }
  }

  const on2FA = async ({ code }) => {
    setLoading(true); setError('')
    try {
      const res = await validate2FA({ temp_token: pending.temp_token, code })
      storeLogin(res.user, res)
      const accounts = await getAccounts().catch(() => [])
      if (accounts.length) setActiveAccount(accounts[0])
      navigate(accounts.length ? '/home' : '/onboarding')
    } catch { setError('Invalid code') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-accent)]">Ribon7</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Trading Dashboard</p>
        </div>

        <div className="bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-2xl p-6">
          {step === 'credentials' ? (
            <>
              <h2 className="text-sm font-semibold text-[var(--color-text-pri)] mb-5">Sign in</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message}
                  {...register('email', { required: 'Required' })} />
                <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message}
                  {...register('password', { required: 'Required' })} />
                {error && <p className="text-xs text-[var(--color-loss)]">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full mt-1">
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
              <p className="text-xs text-center text-[var(--color-text-muted)] mt-4">
                No account?{' '}
                <button onClick={() => navigate('/register')} className="text-[var(--color-accent)] hover:underline">Register</button>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-[var(--color-text-pri)] mb-1">Two-factor authentication</h2>
              <p className="text-xs text-[var(--color-text-muted)] mb-5">Enter the 6-digit code from your authenticator app.</p>
              <form onSubmit={handle2fa(on2FA)} className="flex flex-col gap-4">
                <Input label="Code" placeholder="000000" maxLength={6} {...reg2fa('code', { required: true })} />
                {error && <p className="text-xs text-[var(--color-loss)]">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full">{loading ? 'Verifying…' : 'Verify'}</Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
