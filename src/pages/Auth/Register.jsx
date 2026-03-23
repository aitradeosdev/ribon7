import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { register as apiRegister } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function Register() {
  const navigate = useNavigate()
  const { login: storeLogin } = useAuthStore()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedUsername, setGeneratedUsername] = useState('')
  const [editingUsername, setEditingUsername] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm()
  const password = watch('password')

  const onSubmit = async (data) => {
    setLoading(true); setError('')
    try {
      const res = await apiRegister({
        name: data.name,
        email: data.email,
        password: data.password,
        username: generatedUsername || undefined,
      })
      if (res.username && !generatedUsername) setGeneratedUsername(res.username)
      storeLogin(res.user, res)
      navigate('/onboarding')
    } catch (e) {
      setError(e.response?.data?.detail || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-accent)]">Ribon7</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Create your account</p>
        </div>

        <div className="bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-2xl p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Full name" placeholder="Your name" error={errors.name?.message}
              {...register('name', { required: 'Required' })} />
            <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message}
              {...register('email', { required: 'Required' })} />
            <Input label="Password" type="password" placeholder="Min 8 characters" error={errors.password?.message}
              {...register('password', { 
                required: 'Required', 
                minLength: { value: 8, message: 'Min 8 characters' },
                maxLength: { value: 72, message: 'Max 72 characters' }
              })} />
            <Input label="Confirm password" type="password" placeholder="Repeat password" error={errors.confirm?.message}
              {...register('confirm', { validate: (v) => v === password || 'Passwords do not match' })} />

            {generatedUsername && (
              <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-3">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Your username</p>
                {editingUsername ? (
                  <Input value={generatedUsername} onChange={(e) => setGeneratedUsername(e.target.value)} />
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-[var(--color-accent)]">{generatedUsername}</span>
                    <button type="button" onClick={() => setEditingUsername(true)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-sec)]">Edit</button>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-xs text-[var(--color-loss)]">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full mt-1">
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="text-xs text-center text-[var(--color-text-muted)] mt-4">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-[var(--color-accent)] hover:underline">Sign in</button>
          </p>
        </div>
      </div>
    </div>
  )
}
