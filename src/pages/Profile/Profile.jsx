import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Camera, X, Shield, ShieldCheck, Monitor, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useNotifStore } from '../../store/notifStore'
import { getMe, updateMe, uploadAvatar, getSessions, revokeSession, getLoginHistory } from '../../api/users'
import { enable2FA, verify2FA, disable2FA } from '../../api/auth'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'

const BASE = 'http://localhost:8000'

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden">
      {title && <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{title}</span>
      </div>}
      <div className="p-4">{children}</div>
    </div>
  )
}

// Canvas-based circular crop modal
function CropModal({ src, onSave, onClose }) {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      const canvas = canvasRef.current
      if (!canvas) return
      const size = Math.min(img.width, img.height)
      canvas.width = 256; canvas.height = 256
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, 256, 256)
      ctx.save()
      ctx.beginPath()
      ctx.arc(128, 128, 128, 0, Math.PI * 2)
      ctx.clip()
      const sx = (img.width - size) / 2
      const sy = (img.height - size) / 2
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 256, 256)
      ctx.restore()
    }
    img.src = src
  }, [src])

  const handleSave = () => {
    canvasRef.current.toBlob((blob) => {
      const file = new File([blob], 'avatar.png', { type: 'image/png' })
      onSave(file)
    }, 'image/png')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-2xl p-5 flex flex-col gap-4 items-center">
        <div className="flex items-center justify-between w-full">
          <span className="text-sm font-semibold text-[var(--color-text-pri)]">Crop Avatar</span>
          <button onClick={onClose}><X size={16} className="text-[var(--color-text-muted)]" /></button>
        </div>
        <canvas ref={canvasRef} className="rounded-full" style={{ width: 200, height: 200 }} />
        <div className="flex gap-2 w-full">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave}>Save Avatar</Button>
        </div>
      </motion.div>
    </div>
  )
}

function TwoFAModal({ onClose, onDone }) {
  const [step, setStep] = useState('setup') // setup | verify
  const [qrData, setQrData] = useState(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const addNotif = useNotifStore((s) => s.addNotification)

  useEffect(() => {
    enable2FA().then((d) => setQrData(d)).catch(() => {})
  }, [])

  const handleVerify = async () => {
    setLoading(true)
    try {
      await verify2FA(code)
      addNotif({ type: 'success', title: '2FA enabled' })
      onDone()
      onClose()
    } catch {
      addNotif({ type: 'error', title: 'Invalid code' })
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-sm bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--color-text-pri)]">Enable 2FA</span>
          <button onClick={onClose}><X size={16} className="text-[var(--color-text-muted)]" /></button>
        </div>
        {qrData ? (
          <>
            <p className="text-xs text-[var(--color-text-muted)]">Scan this QR code with your authenticator app.</p>
            <div className="flex justify-center p-4 bg-white rounded-xl">
              <QRCodeSVG value={qrData.otpauth_url} size={160} />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[10px] text-[var(--color-text-muted)]">Manual code:</p>
              <code className="text-xs text-[var(--color-accent)] bg-[var(--color-surface-2)] px-3 py-2 rounded-lg break-all" style={{ fontFamily: 'var(--mono)' }}>
                {qrData.secret}
              </code>
            </div>
            <Input label="Verify Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" maxLength={6} />
            <Button onClick={handleVerify} disabled={loading || code.length < 6} className="w-full">
              {loading ? 'Verifying…' : 'Confirm'}
            </Button>
          </>
        ) : (
          <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">Loading…</p>
        )}
      </motion.div>
    </div>
  )
}

export default function Profile() {
  const { user, setTokens } = useAuthStore()
  const addNotif = useNotifStore((s) => s.addNotification)
  const qc = useQueryClient()
  const fileInputRef = useRef(null)
  const [cropSrc, setCropSrc] = useState(null)
  const [show2FA, setShow2FA] = useState(false)
  const [form, setForm] = useState({ name: '', username: '' })
  const [formInit, setFormInit] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe })
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions'], queryFn: getSessions })
  const { data: history = [] } = useQuery({ queryKey: ['login-history'], queryFn: getLoginHistory })

  useEffect(() => {
    if (me && !formInit) {
      setForm({ name: me.name || '', username: me.username || '' })
      setFormInit(true)
    }
  }, [me])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setCropSrc(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleAvatarSave = async (file) => {
    setCropSrc(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      await uploadAvatar(fd)
      qc.invalidateQueries({ queryKey: ['me'] })
      addNotif({ type: 'success', title: 'Avatar updated' })
    } catch {
      addNotif({ type: 'error', title: 'Upload failed' })
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await updateMe(form)
      qc.invalidateQueries({ queryKey: ['me'] })
      addNotif({ type: 'success', title: 'Profile saved' })
    } catch (e) {
      addNotif({ type: 'error', title: 'Save failed', message: e.response?.data?.detail })
    }
    setSaving(false)
  }

  const handleDisable2FA = async () => {
    try {
      await disable2FA()
      qc.invalidateQueries({ queryKey: ['me'] })
      addNotif({ type: 'success', title: '2FA disabled' })
    } catch {
      addNotif({ type: 'error', title: 'Failed' })
    }
  }

  const handleRevoke = async (id) => {
    await revokeSession(id).catch(() => {})
    qc.invalidateQueries({ queryKey: ['sessions'] })
    addNotif({ type: 'success', title: 'Session revoked' })
  }

  const avatarUrl = me?.avatar_url ? `${BASE}${me.avatar_url}` : null

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 flex flex-col gap-4">

        {/* Avatar + edit */}
        <Card title="Profile">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-[var(--color-surface-2)] border-2 border-[var(--color-border)] overflow-hidden flex items-center justify-center">
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  : <span className="text-2xl font-bold text-[var(--color-accent)]">{me?.name?.[0]?.toUpperCase() || 'U'}</span>
                }
              </div>
              <button onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center shadow">
                <Camera size={12} color="#fff" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            </div>
            <div className="flex-1 flex flex-col gap-3 min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                <Input label="Username" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
              </div>
              <div>
                <Button size="sm" disabled={saving} onClick={handleSaveProfile}>{saving ? 'Saving…' : 'Save Changes'}</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 2FA */}
        <Card title="Two-Factor Authentication">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {me?.is_2fa_enabled
                ? <ShieldCheck size={20} className="text-[var(--color-profit)]" />
                : <Shield size={20} className="text-[var(--color-text-muted)]" />
              }
              <div>
                <p className="text-sm font-medium text-[var(--color-text-pri)]">Authenticator App</p>
                <p className="text-xs text-[var(--color-text-muted)]">TOTP-based two-factor authentication</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={me?.is_2fa_enabled ? 'profit' : 'neutral'}>{me?.is_2fa_enabled ? 'Enabled' : 'Disabled'}</Badge>
              {me?.is_2fa_enabled
                ? <Button size="sm" variant="danger" onClick={handleDisable2FA}>Disable</Button>
                : <Button size="sm" onClick={() => setShow2FA(true)}>Enable</Button>
              }
            </div>
          </div>
        </Card>

        {/* Sessions */}
        <Card title="Active Sessions">
          {sessions.length === 0
            ? <p className="text-xs text-[var(--color-text-muted)]">No active sessions.</p>
            : sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-[var(--color-border)] last:border-0 gap-3">
                <Monitor size={14} className="text-[var(--color-text-muted)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--color-text-pri)] truncate">{s.device_info || 'Unknown device'}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{s.ip_address} · {s.last_active ? new Date(s.last_active).toLocaleString() : '—'}</p>
                </div>
                <button onClick={() => handleRevoke(s.id)}
                  className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-loss)] transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          }
        </Card>

        {/* Login history */}
        <Card title="Login History">
          {history.length === 0
            ? <p className="text-xs text-[var(--color-text-muted)]">No login history.</p>
            : history.slice(0, 10).map((h, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--color-text-pri)] truncate">{h.device_info || 'Unknown'}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">{h.ip_address} · {h.created_at ? new Date(h.created_at).toLocaleString() : '—'}</p>
                </div>
                <Badge variant={h.success ? 'profit' : 'loss'}>{h.success ? 'Success' : 'Failed'}</Badge>
              </div>
            ))
          }
        </Card>
      </div>

      <AnimatePresence>
        {cropSrc && <CropModal src={cropSrc} onSave={handleAvatarSave} onClose={() => setCropSrc(null)} />}
        {show2FA && <TwoFAModal onClose={() => setShow2FA(false)} onDone={() => qc.invalidateQueries({ queryKey: ['me'] })} />}
      </AnimatePresence>
    </div>
  )
}
