import { useState, useEffect, useRef } from 'react'
import { Btn, Spinner } from '../components/ui'

const BACKEND = import.meta.env.VITE_API_URL || '/api'
const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'wss://your-livekit-server.livekit.cloud'

const STEPS = {
  idle:            { label: 'Ready',           color: 'var(--text-3)' },
  collect_service: { label: 'Choosing Service', color: 'var(--amber)' },
  collect_doctor:  { label: 'Choosing Doctor',  color: 'var(--amber)' },
  collect_slot:    { label: 'Choosing Slot',    color: 'var(--amber)' },
  collect_name:    { label: 'Patient Name',     color: 'var(--amber)' },
  confirm:         { label: 'Confirming',       color: 'var(--cyan)' },
  done:            { label: 'Booked ✓',         color: 'var(--green)' },
  cancelled:       { label: 'Cancelled',        color: 'var(--red)' },
}

export default function ChatPage() {
  const [room, setRoom] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const [bookingState, setBookingState] = useState(null)
  const [messages, setMessages] = useState([])
  const [agentSpeaking, setAgentSpeaking] = useState(false)
  const [roomName] = useState(() => `room-${Math.random().toString(36).slice(2, 8)}`)
  const [identity] = useState(() => `user-${Math.random().toString(36).slice(2, 8)}`)
  const chatRef = useRef(null)

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages, agentSpeaking])

  function addMessage(role, text) {
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (last && last.role === role && Date.now() - last.ts < 3000) {
        return [...prev.slice(0, -1), { ...last, text: last.text + ' ' + text }]
      }
      return [...prev, { role, text, ts: Date.now(), time: new Date() }]
    })
  }

  async function connect() {
    setConnecting(true)
    setError(null)
    try {
      const res = await fetch(`${BACKEND}/livekit/token?room=${roomName}&identity=${identity}`)
      if (!res.ok) throw new Error('Failed to get token — check backend /livekit/token')
      const { token } = await res.json()

      const { Room, RoomEvent } = await import('livekit-client')
      const r = new Room()

      // DataChannel — booking state updates
      r.on(RoomEvent.DataReceived, (payload) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload))
          if (msg.type === 'booking_update') setBookingState(msg)
        } catch {}
      })

      // Attach agent audio to DOM for playback
      r.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === 'audio') {
          const el = track.attach()
          el.autoplay = true
          document.body.appendChild(el)
        }
      })

      // Transcription events → chat bubbles
      r.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
        segments.forEach(seg => {
          if (!seg.text?.trim()) return
          const isAgent = !participant || participant.identity !== identity
          if (isAgent) {
            setAgentSpeaking(!seg.final)
            if (seg.final) addMessage('agent', seg.text.trim())
          } else {
            if (seg.final) addMessage('user', seg.text.trim())
          }
        })
      })

      // Detect agent speaking via active speakers
      r.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setAgentSpeaking(speakers.some(p => p.identity !== identity))
      })

      r.on(RoomEvent.Disconnected, () => {
        setConnected(false)
        setRoom(null)
        setAgentSpeaking(false)
      })

      await r.connect(LIVEKIT_URL, token)
      await r.localParticipant.setMicrophoneEnabled(true)
      setRoom(r)
      setConnected(true)
      setMessages([{ role: 'system', text: 'Session started — speak to the agent', ts: Date.now(), time: new Date() }])
    } catch (e) {
      setError(e.message)
    } finally {
      setConnecting(false)
    }
  }

  async function disconnect() {
    if (room) {
      await room.disconnect()
      setRoom(null)
      setConnected(false)
      setBookingState(null)
      setAgentSpeaking(false)
    }
  }

  const stepInfo = bookingState ? (STEPS[bookingState.step] || STEPS.idle) : STEPS.idle
  const data = bookingState?.data || {}

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-0)' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '16px 32px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-1)', flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px' }}>Voice Agent</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '12px', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            AI-powered appointment booking
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {connected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--green)', animation: 'pulse 1.5s infinite', boxShadow: '0 0 8px var(--green)' }} />
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>LIVE</span>
            </div>
          )}
          {!connected ? (
            <Btn onClick={connect} disabled={connecting} size="lg">
              {connecting ? <><Spinner size={14} /> Connecting...</> : '▶ Start Session'}
            </Btn>
          ) : (
            <Btn variant="danger" onClick={disconnect} size="lg">■ End Session</Btn>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', overflow: 'hidden' }}>

        {/* Left — visualizer + chat bubbles */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Voice ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '32px 32px 20px', flexShrink: 0 }}>
            <div style={{ position: 'relative', width: '140px', height: '140px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  position: 'absolute', inset: `${-i * 18}px`,
                  border: `1px solid rgba(0,212,255,${(agentSpeaking ? 0.35 : connected ? 0.12 : 0.04) - i * 0.04})`,
                  borderRadius: '50%',
                  animation: connected ? `pulse ${1.2 + i * 0.4}s ease-in-out infinite` : 'none',
                  animationDelay: `${i * 0.15}s`,
                  transition: 'all 0.3s',
                }} />
              ))}
              <div style={{
                position: 'absolute', inset: 0,
                background: agentSpeaking
                  ? 'radial-gradient(circle, rgba(0,212,255,0.3) 0%, rgba(0,212,255,0.08) 60%, transparent 100%)'
                  : connected
                    ? 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, rgba(0,212,255,0.04) 60%, transparent 100%)'
                    : 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
                borderRadius: '50%',
                border: `1px solid ${agentSpeaking ? 'rgba(0,212,255,0.6)' : connected ? 'rgba(0,212,255,0.3)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.4s',
              }}>
                <span style={{ fontSize: '36px' }}>{connected ? '🎤' : '🔇'}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, transition: 'color 0.3s',
                color: agentSpeaking ? 'var(--cyan)' : connected ? 'var(--text-1)' : 'var(--text-2)',
              }}>
                {agentSpeaking ? 'Agent Speaking...' : connected ? 'Listening...' : 'Ready to Connect'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: '3px' }}>
                {connected ? `Session: ${roomName}` : 'Click Start Session to begin'}
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: '100%', maxWidth: '480px', height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '0 32px 16px', flexShrink: 0 }}>
              <div style={{ background: 'rgba(255,68,102,0.06)', border: '1px solid rgba(255,68,102,0.3)', borderRadius: 'var(--radius)', padding: '12px 16px' }}>
                <p style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>⚠ {error}</p>
              </div>
            </div>
          )}

          {/* ── Chat bubbles ── */}
          <div ref={chatRef} style={{
            flex: 1, overflowY: 'auto', padding: '0 32px 24px',
            display: 'flex', flexDirection: 'column', gap: '12px',
          }}>

            {/* Empty state */}
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '8px', color: 'var(--text-3)' }}>
                <span style={{ fontSize: '32px' }}>💬</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>Conversation will appear here</span>
              </div>
            )}

            {messages.map((msg, i) => {
              if (msg.role === 'system') return (
                <div key={i} style={{ textAlign: 'center', padding: '4px 0' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)', background: 'var(--bg-2)', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                    {msg.text}
                  </span>
                </div>
              )

              const isUser = msg.role === 'user'
              return (
                <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-end' }}>
                  {!isUser && (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>
                      🤖
                    </div>
                  )}
                  <div style={{ maxWidth: '72%' }}>
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isUser ? 'rgba(0,212,255,0.1)' : 'var(--bg-2)',
                      border: `1px solid ${isUser ? 'rgba(0,212,255,0.22)' : 'var(--border)'}`,
                      fontSize: '13px',
                      color: isUser ? 'var(--cyan)' : 'var(--text-0)',
                      lineHeight: 1.6,
                    }}>
                      {msg.text}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: '3px', textAlign: isUser ? 'right' : 'left', paddingLeft: isUser ? 0 : '4px', paddingRight: isUser ? '4px' : 0 }}>
                      {msg.time.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {isUser && (
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>
                      👤
                    </div>
                  )}
                </div>
              )
            })}

            {/* Typing indicator while agent is speaking */}
            {agentSpeaking && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>
                  🤖
                </div>
                <div style={{ padding: '10px 16px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px', display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cyan)', opacity: 0.7, animation: 'pulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Booking status panel ── */}
        <div style={{ borderLeft: '1px solid var(--border)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', background: 'var(--bg-1)' }}>

          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Booking Status</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Real-time progress</p>
          </div>

          {/* Step badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--bg-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stepInfo.color, boxShadow: `0 0 8px ${stepInfo.color}` }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: stepInfo.color }}>{stepInfo.label}</span>
          </div>

          {/* Booking fields */}
          {[
            { label: 'Service', value: data.service },
            { label: 'Doctor',  value: data.doctor },
            { label: 'Date',    value: data.slot_date },
            { label: 'Time',    value: data.slot_time },
            { label: 'Slot',    value: data.slot },
            { label: 'Patient', value: data.name },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '12px',
                color: value ? 'var(--text-0)' : 'var(--text-3)',
                padding: '7px 10px', background: 'var(--bg-2)', borderRadius: 'var(--radius)',
                border: `1px solid ${value ? 'var(--border-bright)' : 'var(--border)'}`,
                minHeight: '32px',
              }}>
                {value || '—'}
              </span>
            </div>
          ))}

          {/* Confirmation */}
          {data.confirmation && (
            <div style={{ padding: '14px', background: 'rgba(0,232,122,0.08)', border: '1px solid rgba(0,232,122,0.3)', borderRadius: 'var(--radius)', marginTop: '8px' }}>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>✓ Confirmed</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 500, color: 'var(--green)', letterSpacing: '0.12em' }}>{data.confirmation}</div>
            </div>
          )}

          {/* Available options */}
          {bookingState?.available?.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Options</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {bookingState.available.map((opt, i) => (
                  <div key={i} style={{ padding: '7px 10px', background: 'var(--bg-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-1)' }}>
                    {opt}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}