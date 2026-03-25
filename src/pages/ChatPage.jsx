import { useState, useEffect, useRef } from 'react'
import { Btn, Spinner } from '../components/ui'
import { api } from '../lib/api'

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
  const [micEnabled, setMicEnabled] = useState(true)
  const [draft, setDraft] = useState('')
  const [sendingText, setSendingText] = useState(false)
  const [mode, setMode] = useState('rag')        // 'rag' | 'booking'
  const [language, setLanguage] = useState(null) // null | 'en' | 'de'
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [roomNameBase] = useState(() => `room-${Math.random().toString(36).slice(2, 8)}`)
  const [sessionRoomName, setSessionRoomName] = useState(null)
  const [identity] = useState(() => `user-${Math.random().toString(36).slice(2, 8)}`)
  const chatRef = useRef(null)
  const streamMessageIds = useRef({ agent: null, user: null })

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages, agentSpeaking])

  function upsertStreamingMessage(role, text, isFinal) {
    const clean = (text || '').trim()
    if (!clean) return
    const streamId = streamMessageIds.current[role] || `${role}-stream-${Date.now()}`
    streamMessageIds.current[role] = streamId
    setMessages(prev => {
      const now = Date.now()
      const idx = prev.findIndex(m => m.id === streamId)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], text: clean, ts: now, time: new Date(), streaming: !isFinal }
        return copy
      }
      return [...prev, { id: streamId, role, text: clean, ts: now, time: new Date(), streaming: !isFinal }]
    })
    if (isFinal) {
      const finalId = `${role}-final-${Date.now()}`
      setMessages(prev => prev.map(m => m.id === streamId ? { ...m, id: finalId, streaming: false } : m))
      streamMessageIds.current[role] = null
    }
  }

  // Step 1 — "Start Session" clicked: show language picker
  function handleStartClick() {
    setError(null)
    setShowLangPicker(true)
  }

  // Step 2 — language selected: connect
  async function handleLanguageSelect(lang) {
    setLanguage(lang)
    setShowLangPicker(false)
    await connect(lang)
  }

  function handleLangPickerCancel() {
    setShowLangPicker(false)
  }

  async function connect(lang) {
    setConnecting(true)
    setError(null)
    try {
      const roomName = `${roomNameBase}-${mode}-${lang}`
      setSessionRoomName(roomName)
      const { token } = await api.livekit.token(roomName, identity, mode)

      const { Room, RoomEvent } = await import('livekit-client')
      const r = new Room()

      r.on(RoomEvent.DataReceived, (payload) => {
        try {
          let raw = payload
          if (raw instanceof ArrayBuffer) raw = new Uint8Array(raw)
          if (raw instanceof Uint8Array) raw = new TextDecoder().decode(raw)
          if (typeof raw !== 'string') raw = String(raw)
          const msg = JSON.parse(raw)
          if (msg.type === 'booking_update') setBookingState(msg)
        } catch (e) {
          console.error('DataReceived parse error:', e)
        }
      })

      r.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === 'audio') {
          const el = track.attach()
          el.autoplay = true
          document.body.appendChild(el)
        }
      })

      r.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
        segments.forEach(seg => {
          if (!seg.text?.trim()) return
          const isAgent = !participant || participant.identity !== identity
          if (isAgent) {
            setAgentSpeaking(!seg.final)
            upsertStreamingMessage('agent', seg.text, !!seg.final)
          } else {
            upsertStreamingMessage('user', seg.text, !!seg.final)
          }
        })
      })

      r.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setAgentSpeaking(speakers.some(p => p.identity !== identity))
      })

      r.on(RoomEvent.Disconnected, () => {
        setConnected(false)
        setRoom(null)
        setAgentSpeaking(false)
        setSessionRoomName(null)
      })

      await r.connect(LIVEKIT_URL, token)
      await r.localParticipant.setMicrophoneEnabled(true)
      setMicEnabled(true)
      setRoom(r)
      setConnected(true)

      if (mode === 'booking') {
        setBookingState({
          type: 'booking_update',
          step: 'idle',
          data: { service: null, doctor: null, slot: null, name: null },
          available: [],
        })
      }

      const langLabel = lang === 'de' ? 'German' : 'English'
      setMessages([{
        role: 'system',
        text: mode === 'booking'
          ? `Booking session started (${langLabel}) — say the service you want`
          : `RAG session started (${langLabel}) — ask a clinic question`,
        ts: Date.now(),
        time: new Date(),
      }])
    } catch (e) {
      setError(e.message)
      setLanguage(null)
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
      setSessionRoomName(null)
      setLanguage(null)
      setMicEnabled(true)
      setDraft('')
    }
  }

  async function toggleMic() {
    if (!room) return
    try {
      const next = !micEnabled
      await room.localParticipant.setMicrophoneEnabled(next)
      setMicEnabled(next)
    } catch (e) {
      setError(e.message)
    }
  }

  async function sendTextMessage() {
    const text = (draft || '').trim()
    if (!text || !room || !connected) return
    setSendingText(true)
    setError(null)
    try {
      setMessages(prev => ([...prev, {
        id: `user-text-${Date.now()}`,
        role: 'user',
        text,
        ts: Date.now(),
        time: new Date(),
        streaming: false,
      }]))

      // LiveKit Agents listens on the `lk.chat` text stream topic.
      if (typeof room.localParticipant?.sendText === 'function') {
        await room.localParticipant.sendText(text, { topic: 'lk.chat' })
      } else if (typeof room.localParticipant?.publishData === 'function') {
        const payload = new TextEncoder().encode(text)
        await room.localParticipant.publishData(payload, { reliable: true, topic: 'lk.chat' })
      } else {
        throw new Error('Text messaging is not supported by the current LiveKit client')
      }

      setDraft('')
    } catch (e) {
      setError(e.message)
    } finally {
      setSendingText(false)
    }
  }

  const stepInfo = bookingState ? (STEPS[bookingState.step] || STEPS.idle) : STEPS.idle
  const data = bookingState?.data || {}
  const hasActiveAgentStream = messages.some(m => m.role === 'agent' && m.streaming)

  const activeFieldByStep = {
    idle: null, collect_service: 'service', collect_doctor: 'doctor',
    collect_slot: 'slot', collect_name: 'patient', confirm: 'patient',
    done: null, cancelled: null,
  }
  
  const activeField = activeFieldByStep[bookingState?.step || 'idle']

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-0)' }}>

      {/* ── Language picker overlay ── */}
      {showLangPicker && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={handleLangPickerCancel}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '32px',
              width: '300px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            }}
          >
            <div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '15px', color: 'var(--text-0)', marginBottom: '4px',
              }}>
                Select Language
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
                {mode === 'booking' ? 'Booking' : 'RAG'} session · the agent will respond in your chosen language
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { lang: 'en', flag: '🇬🇧', label: 'English', sub: 'Agent responds in English' },
                { lang: 'de', flag: '🇩🇪', label: 'Deutsch', sub: 'Agent antwortet auf Deutsch' },
              ].map(({ lang, flag, label, sub }) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageSelect(lang)}
                  style={{
                    cursor: 'pointer',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--cyan)'
                    e.currentTarget.style.background = 'rgba(0,212,255,0.06)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.background = 'var(--bg-2)'
                  }}
                >
                  <span style={{ fontSize: '26px', lineHeight: 1, flexShrink: 0 }}>{flag}</span>
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontWeight: 600,
                      fontSize: '14px', color: 'var(--text-0)',
                    }}>{label}</div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: '11px',
                      color: 'var(--text-3)', marginTop: '2px',
                    }}>{sub}</div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleLangPickerCancel}
              style={{
                cursor: 'pointer', background: 'transparent', border: 'none',
                color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
                fontSize: '11px', textAlign: 'center', padding: '2px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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

          {/* Mode toggle — only visible before connecting */}
          {!connected && !connecting && (
            <div style={{
              display: 'flex', background: 'var(--bg-2)',
              border: '1px solid var(--border)', borderRadius: '999px',
              padding: '3px', gap: '3px',
            }}>
              {[
                { value: 'rag',     label: 'RAG' },
                { value: 'booking', label: 'Booking' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  style={{
                    cursor: 'pointer', border: 'none', borderRadius: '999px',
                    padding: '7px 14px', fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    color: mode === value ? 'var(--bg-0)' : 'var(--text-2)',
                    background: mode === value ? 'var(--cyan)' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                >{label}</button>
              ))}
            </div>
          )}

          {/* Live + session info badge when connected */}
          {connected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: 'var(--green)', animation: 'pulse 1.5s infinite',
                boxShadow: '0 0 8px var(--green)',
              }} />
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>LIVE</span>
              <span style={{
                fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)',
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                borderRadius: '6px', padding: '2px 8px', marginLeft: '2px',
              }}>
                {(language || '').toUpperCase()} · {mode === 'booking' ? 'Booking' : 'RAG'}
              </span>
            </div>
          )}

          {!connected ? (
            <Btn onClick={handleStartClick} disabled={connecting} size="lg">
              {connecting ? <><Spinner size={14} /> Connecting...</> : '▶ Start Session'}
            </Btn>
          ) : (
            <Btn variant="danger" onClick={disconnect} size="lg">■ End Session</Btn>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: mode === 'booking' ? '1fr 340px' : '1fr',
        overflow: 'hidden',
      }}>

        {/* Left — voice ring + chat */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Voice ring */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '16px', padding: '32px 32px 20px', flexShrink: 0,
          }}>
            <div style={{ position: 'relative', width: '140px', height: '140px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  position: 'absolute', inset: `${-i * 18}px`,
                  border: `1px solid rgba(0,212,255,${(agentSpeaking ? 0.35 : connected ? 0.12 : 0.04) - i * 0.04})`,
                  borderRadius: '50%',
                  animationName: connected ? 'pulse' : 'none',
                  animationDuration: `${1.2 + i * 0.4}s`,
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
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
                fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700,
                transition: 'color 0.3s',
                color: agentSpeaking ? 'var(--cyan)' : connected ? 'var(--text-1)' : 'var(--text-2)',
              }}>
                {agentSpeaking ? 'Agent Speaking...' : connected ? 'Listening...' : 'Ready to Connect'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: '3px' }}>
                {connected
                  ? `Session: ${sessionRoomName || roomNameBase}`
                  : 'Select a mode then click Start Session'}
              </div>
            </div>

            <div style={{ width: '100%', maxWidth: '480px', height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: '0 32px 16px', flexShrink: 0 }}>
              <div style={{
                background: 'rgba(255,68,102,0.06)',
                border: '1px solid rgba(255,68,102,0.3)',
                borderRadius: 'var(--radius)', padding: '12px 16px',
              }}>
                <p style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>⚠ {error}</p>
              </div>
            </div>
          )}

          {/* Chat bubbles */}
          <div ref={chatRef} style={{
            flex: 1, overflowY: 'auto', padding: '0 32px 24px',
            display: 'flex', flexDirection: 'column', gap: '12px',
          }}>
            {messages.length === 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', flex: 1, gap: '8px', color: 'var(--text-3)',
              }}>
                <span style={{ fontSize: '32px' }}>💬</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                  Conversation will appear here
                </span>
              </div>
            )}

            {messages.map((msg, i) => {
              if (msg.role === 'system') return (
                <div key={i} style={{ textAlign: 'center', padding: '4px 0' }}>
                  <span style={{
                    fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)',
                    background: 'var(--bg-2)', padding: '4px 12px',
                    borderRadius: '20px', border: '1px solid var(--border)',
                  }}>{msg.text}</span>
                </div>
              )
              const isUser = msg.role === 'user'
              return (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  gap: '8px', alignItems: 'flex-end',
                }}>
                  {!isUser && (
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', flexShrink: 0,
                    }}>🤖</div>
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
                    }}>{msg.text}</div>
                    <div style={{
                      fontSize: '10px', color: 'var(--text-3)',
                      fontFamily: 'var(--font-mono)', marginTop: '3px',
                      textAlign: isUser ? 'right' : 'left',
                      paddingLeft: isUser ? 0 : '4px',
                      paddingRight: isUser ? '4px' : 0,
                    }}>
                      {msg.time.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {isUser && (
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', flexShrink: 0,
                    }}>👤</div>
                  )}
                </div>
              )
            })}

            {agentSpeaking && !hasActiveAgentStream && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
                }}>🤖</div>
                <div style={{
                  padding: '10px 16px', background: 'var(--bg-2)',
                  border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px',
                  display: 'flex', gap: '5px', alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: 'var(--cyan)', opacity: 0.7,
                      animation: 'pulse 1.2s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Unified input (mic + text) */}
          <div style={{
            flexShrink: 0,
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-1)',
            padding: '14px 32px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '10px',
            }}>
              <button
                onClick={toggleMic}
                disabled={!connected || connecting}
                title={micEnabled ? 'Mute mic' : 'Unmute mic'}
                style={{
                  cursor: (!connected || connecting) ? 'not-allowed' : 'pointer',
                  width: '44px',
                  height: '40px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: micEnabled ? 'rgba(0,212,255,0.10)' : 'rgba(255,68,102,0.08)',
                  color: micEnabled ? 'var(--cyan)' : 'var(--red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0,
                  opacity: (!connected || connecting) ? 0.6 : 1,
                }}
              >
                {micEnabled ? '🎙️' : '🔇'}
              </button>

              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendTextMessage()
                  }
                }}
                disabled={!connected || connecting}
                placeholder={connected ? 'Type a message…' : 'Start a session to chat…'}
                style={{
                  flex: 1,
                  height: '40px',
                  borderRadius: '12px',
                  border: '1px solid transparent',
                  background: 'var(--bg-3)',
                  color: 'var(--text-0)',
                  padding: '0 12px',
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  opacity: (!connected || connecting) ? 0.7 : 1,
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--cyan-dim)' }}
                onBlur={e => { e.target.style.borderColor = 'transparent' }}
              />

              <Btn
                onClick={sendTextMessage}
                disabled={!connected || connecting || sendingText || !draft.trim()}
                size="lg"
              >
                {sendingText ? <><Spinner size={14} /> Sending...</> : 'Send'}
              </Btn>
            </div>
            <div style={{
              marginTop: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '10px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-3)',
            }}>
              <span>{connected ? 'Tip: press Enter to send' : 'Voice + text available after connecting'}</span>
              <span>{connected ? (micEnabled ? 'Mic on' : 'Mic muted') : 'Not connected'}</span>
            </div>
          </div>
        </div>

        {/* Right — Booking status panel */}
        {mode === 'booking' && (
          <div style={{
            borderLeft: '1px solid var(--border)', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '16px',
            overflowY: 'auto', background: 'var(--bg-1)',
          }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                Booking Status
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                Real-time progress
              </p>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px', background: 'var(--bg-2)',
              borderRadius: 'var(--radius)', border: '1px solid var(--border)',
            }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: stepInfo.color, boxShadow: `0 0 8px ${stepInfo.color}`,
              }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: stepInfo.color }}>
                {stepInfo.label}
              </span>
            </div>

            {[
              { key: 'service', label: 'Service', value: data.service },
              { key: 'doctor',  label: 'Doctor',  value: data.doctor },
              { key: 'slot',    label: 'Slot',    value: data.slot },
              { key: 'patient', label: 'Patient', value: data.name },
            ].map(({ key, label, value }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{
                  fontSize: '10px', fontFamily: 'var(--font-mono)',
                  color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>{label}</span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '12px',
                  color: value ? 'var(--text-0)' : 'var(--text-3)',
                  padding: '7px 10px', background: 'var(--bg-2)',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${activeField === key ? 'var(--cyan)' : value ? 'var(--border-bright)' : 'var(--border)'}`,
                  minHeight: '32px',
                }}>
                  {value || '—'}
                </span>
              </div>
            ))}

            {data.confirmation && (
              <div style={{
                padding: '14px', background: 'rgba(0,232,122,0.08)',
                border: '1px solid rgba(0,232,122,0.3)',
                borderRadius: 'var(--radius)', marginTop: '8px',
              }}>
                <div style={{
                  fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--green)',
                  textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px',
                }}>✓ Confirmed</div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '16px',
                  fontWeight: 500, color: 'var(--green)', letterSpacing: '0.12em',
                }}>{data.confirmation}</div>
              </div>
            )}

            {bookingState?.available?.length > 0 && (
              <div>
                <div style={{
                  fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)',
                  textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px',
                }}>Options</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {bookingState.available.map((opt, i) => (
                    <div key={i} style={{
                      padding: '7px 10px', background: 'var(--bg-2)',
                      borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                      fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-1)',
                    }}>{opt}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}