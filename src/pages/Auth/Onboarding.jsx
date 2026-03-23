import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { getBrokers, getBrokerTerminals, createAccount, getAccountStatus } from '../../api/accounts'
import { useAccountStore } from '../../store/accountStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const DOTS = 5

function Dots({ step }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: DOTS }).map((_, i) => (
        <div key={i} className="w-2 h-2 rounded-full transition-all duration-300"
          style={{ background: i < step ? 'rgba(129,140,248,0.4)' : i === step - 1 ? 'var(--color-accent)' : 'var(--color-surface-3)' }} />
      ))}
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { setActiveAccount } = useAccountStore()
  const [step, setStep] = useState(1)
  const [brokers, setBrokers] = useState([])
  const [terminals, setTerminals] = useState([])
  const [selectedBroker, setSelectedBroker] = useState('')
  const [selectedTerminal, setSelectedTerminal] = useState('')
  const [creds, setCreds] = useState({ login: '', password: '', server: '' })
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (step === 2) {
      getBrokers()
        .then((data) => {
          // Ensure data is an array
          setBrokers(Array.isArray(data) ? data : [])
        })
        .catch(() => {
          setBrokers([])
        })
    }
  }, [step])

  useEffect(() => {
    if (step === 3 && selectedBroker) {
      getBrokerTerminals(selectedBroker)
        .then((terminalList) => {
          // Ensure terminalList is an array
          const terminals = Array.isArray(terminalList) ? terminalList : []
          setTerminals(terminals)
          // Clear selection if previously selected terminal is no longer available
          if (selectedTerminal) {
            const selected = terminals.find(t => t.path === selectedTerminal)
            if (!selected || selected.status !== 'available') {
              setSelectedTerminal('')
            }
          }
        })
        .catch(() => {
          setTerminals([])
        })
    }
  }, [step, selectedBroker, selectedTerminal])

  const handleConnect = async () => {
    setStatus('loading'); setErrorMsg('')
    try {
      const acc = await createAccount({
        broker: selectedBroker,
        terminal_id: selectedTerminal,
        login: parseInt(creds.login),
        password: creds.password,
        server: creds.server,
        account_name: `${selectedBroker} - ${creds.login}`,
      })
      // Poll status
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        try {
          const s = await getAccountStatus(acc.id)
          if (s.is_active) {
            clearInterval(poll)
            setStatus('success')
            setActiveAccount(acc)
            setTimeout(() => navigate('/home'), 1200)
          }
        } catch {}
        if (attempts >= 10) { clearInterval(poll); setStatus('error'); setErrorMsg('Connection timed out') }
      }, 2000)
    } catch (e) {
      setStatus('error')
      // Handle different error response formats
      let errorMessage = 'Connection failed'
      if (e.response?.data?.detail) {
        if (typeof e.response.data.detail === 'string') {
          errorMessage = e.response.data.detail
        } else if (Array.isArray(e.response.data.detail)) {
          // Validation errors array
          errorMessage = e.response.data.detail.map(err => err.msg || err.message || 'Validation error').join(', ')
        } else {
          errorMessage = 'Invalid request data'
        }
      }
      setErrorMsg(errorMessage)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="w-full max-w-md bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-2xl p-8">
        <Dots step={step} />

        {step === 1 && (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[var(--color-accent)] mb-2">Welcome to Ribon7</h1>
            <p className="text-sm text-[var(--color-text-muted)] mb-8">Connect your MT5 account to get started with real-time trading data.</p>
            <Button className="w-full" onClick={() => setStep(2)}>Get started</Button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-pri)] mb-1">Select your broker</h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-5">Choose the broker you trade with.</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {brokers.map((b) => (
                <button key={b.broker} onClick={() => setSelectedBroker(b.broker)}
                  className={`p-4 rounded-xl border text-sm font-medium transition-all ${selectedBroker === b.broker ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-sec)] hover:border-[var(--color-border-hi)]'}`}>
                  {b.broker}
                </button>
              ))}
            </div>
            <Button className="w-full" disabled={!selectedBroker} onClick={() => setStep(3)}>Continue</Button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-pri)] mb-1">Select terminal</h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-5">Choose the MT5 terminal instance to use.</p>
            <div className="flex flex-col gap-2 mb-6">
              {terminals.length === 0 && <p className="text-xs text-[var(--color-text-muted)]">No terminals found for {selectedBroker}.</p>}
              {terminals.map((t) => {
                const isAvailable = t.status === 'available'
                return (
                  <button 
                    key={t.path} 
                    onClick={() => isAvailable && setSelectedTerminal(t.path)}
                    disabled={!isAvailable}
                    className={`p-3 rounded-xl border text-sm text-left transition-all ${
                      !isAvailable 
                        ? 'border-[var(--color-border)] bg-[var(--color-surface-3)] opacity-50 cursor-not-allowed' 
                        : selectedTerminal === t.path 
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' 
                          : 'border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-border-hi)] cursor-pointer'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className={`font-medium ${isAvailable ? 'text-[var(--color-text-pri)]' : 'text-[var(--color-text-muted)]'}`}>
                          {t.path}
                        </p>
                        <p className={`text-xs mt-0.5 capitalize ${isAvailable ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-loss)]'}`}>
                          {t.status === 'available' ? 'Available' : t.status === 'in_use' ? 'In use by another account' : 'Unavailable'}
                        </p>
                      </div>
                      {!isAvailable && (
                        <div className="w-2 h-2 rounded-full bg-[var(--color-loss)] ml-2" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1" disabled={!selectedTerminal} onClick={() => setStep(4)}>Continue</Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text-pri)] mb-1">Account credentials</h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-5">Enter your MT5 login details.</p>
            <div className="flex flex-col gap-4 mb-6">
              <Input label="Account number" placeholder="12345678" value={creds.login}
                onChange={(e) => setCreds((c) => ({ ...c, login: e.target.value }))} />
              <Input label="Password" type="password" placeholder="MT5 password" value={creds.password}
                onChange={(e) => setCreds((c) => ({ ...c, password: e.target.value }))} />
              <Input label="Server" placeholder="Broker-Server" value={creds.server}
                onChange={(e) => setCreds((c) => ({ ...c, server: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep(3)}>Back</Button>
              <Button className="flex-1" disabled={!creds.login || !creds.password || !creds.server} onClick={() => setStep(5)}>Continue</Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="text-center">
            <h2 className="text-base font-semibold text-[var(--color-text-pri)] mb-1">Connecting…</h2>
            <p className="text-xs text-[var(--color-text-muted)] mb-8">Testing your MT5 connection.</p>
            {status === 'idle' && (
              <Button className="w-full" onClick={handleConnect}>Connect account</Button>
            )}
            {status === 'loading' && (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="text-[var(--color-accent)] animate-spin" />
                <p className="text-xs text-[var(--color-text-muted)]">Connecting to MT5…</p>
              </div>
            )}
            {status === 'success' && (
              <div className="flex flex-col items-center gap-3">
                <CheckCircle size={32} className="text-[var(--color-profit)]" />
                <p className="text-sm font-medium text-[var(--color-profit)]">Connected!</p>
              </div>
            )}
            {status === 'error' && (
              <div className="flex flex-col items-center gap-3">
                <AlertCircle size={32} className="text-[var(--color-loss)]" />
                <p className="text-xs text-[var(--color-loss)]">{errorMsg}</p>
                <Button variant="secondary" onClick={() => setStatus('idle')}>Retry</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
