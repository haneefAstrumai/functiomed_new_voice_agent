/**
 * Frontend — components/BookingPanel.jsx
 * =========================================
 * Shows the booking progress stepper + collected data + available options.
 * Driven entirely by DataChannel messages from the agent.
 *
 * Drop this into your existing VoiceAgent.jsx layout.
 *
 * Usage:
 *   import { useBookingState } from '../hooks/useBookingState'
 *   import BookingPanel from './BookingPanel'
 *
 *   export default function VoiceAgent() {
 *     const [room, setRoom] = useState(null)
 *     const { bookingState, isBooking, stepIndex } = useBookingState(room)
 *
 *     return (
 *       <div className="layout">
 *         <ChatMessages ... />
 *         {isBooking && (
 *           <BookingPanel state={bookingState} stepIndex={stepIndex} />
 *         )}
 *       </div>
 *     )
 *   }
 */

import { STEP_LABELS, STEP_ORDER } from '../hooks/useBookingState'

const STEPS = [
  { key: 'collect_service', label: 'Service',  icon: '💊' },
  { key: 'collect_doctor',  label: 'Doctor',   icon: '👨‍⚕️' },
  { key: 'collect_name',    label: 'Your Name', icon: '👤' },
  { key: 'confirm',         label: 'Confirm',  icon: '✅' },
  { key: 'done',            label: 'Booked',   icon: '🎉' },
]

export default function BookingPanel({ state, stepIndex }) {
  const isDone      = state.step === 'done'
  const isCancelled = state.step === 'cancelled'

  if (isCancelled) return null

  return (
    <div style={styles.panel}>

      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>📅</span>
        <span style={styles.headerTitle}>
          {isDone ? 'Appointment Booked!' : 'Booking in Progress'}
        </span>
      </div>

      {/* Stepper */}
      <div style={styles.stepper}>
        {STEPS.map((step, i) => {
          const status =
            i < stepIndex  ? 'done'
            : i === stepIndex ? 'active'
            : 'upcoming'

          return (
            <div key={step.key} style={styles.stepWrap}>
              <div style={{ ...styles.circle, ...circleStyle(status) }}>
                {status === 'done' ? '✓' : step.icon}
              </div>
              <span style={{ ...styles.stepLabel, ...labelStyle(status) }}>
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <div style={{ ...styles.connector, background: status === 'done' ? '#22c55e' : '#1e293b' }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Collected data */}
      <div style={styles.dataGrid}>
        {[
          { label: 'Service', value: state.service },
          { label: 'Doctor',  value: state.doctor },
          { label: 'Name',    value: state.name },
        ].map(({ label, value }) =>
          value ? (
            <div key={label} style={styles.dataRow}>
              <span style={styles.dataLabel}>{label}</span>
              <span style={styles.dataValue}>{value}</span>
            </div>
          ) : null
        )}
      </div>

      {/* Available options (chips — shown while collecting) */}
      {state.available?.length > 0 && !isDone && (
        <div style={styles.chipsWrap}>
          <div style={styles.chipsLabel}>Options:</div>
          <div style={styles.chips}>
            {state.available.map((opt) => (
              <span key={opt} style={styles.chip}>{opt}</span>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation number */}
      {isDone && state.confirmation && (
        <div style={styles.confirmation}>
          <div style={styles.confLabel}>Confirmation Number</div>
          <div style={styles.confNumber}>{state.confirmation}</div>
        </div>
      )}
    </div>
  )
}

// ── Style helpers ─────────────────────────────────────────────

function circleStyle(status) {
  if (status === 'done')    return { background: '#22c55e', color: '#fff', border: '2px solid #22c55e' }
  if (status === 'active')  return { background: '#0ea5e9', color: '#fff', border: '2px solid #0ea5e9', boxShadow: '0 0 12px #0ea5e966' }
  return { background: 'transparent', color: '#475569', border: '2px solid #1e293b' }
}

function labelStyle(status) {
  if (status === 'done')   return { color: '#22c55e' }
  if (status === 'active') return { color: '#0ea5e9', fontWeight: 700 }
  return { color: '#475569' }
}

const styles = {
  panel: {
    background:   '#0a1628',
    border:       '1px solid #1e293b',
    borderRadius: 12,
    padding:      '20px 24px',
    minWidth:     280,
  },
  header: {
    display:      'flex',
    alignItems:   'center',
    gap:          8,
    marginBottom: 20,
  },
  headerIcon:  { fontSize: 20 },
  headerTitle: { fontSize: 14, fontWeight: 700, color: '#e2e8f0', letterSpacing: 0.5 },
  stepper: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   20,
    position:       'relative',
  },
  stepWrap: {
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            6,
    flex:           1,
    position:       'relative',
  },
  circle: {
    width:          36,
    height:         36,
    borderRadius:   '50%',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       16,
    transition:     'all 0.3s ease',
    zIndex:         1,
  },
  stepLabel: {
    fontSize:   10,
    letterSpacing: 0.3,
    textAlign:  'center',
    transition: 'color 0.3s',
  },
  connector: {
    position:   'absolute',
    top:        18,
    left:       '60%',
    width:      '80%',
    height:     2,
    transition: 'background 0.3s',
    zIndex:     0,
  },
  dataGrid: {
    display:       'flex',
    flexDirection: 'column',
    gap:           8,
    marginBottom:  16,
  },
  dataRow: {
    display:         'flex',
    justifyContent:  'space-between',
    alignItems:      'center',
    padding:         '6px 10px',
    background:      '#ffffff08',
    borderRadius:    6,
    border:          '1px solid #1e293b',
  },
  dataLabel: { fontSize: 11, color: '#64748b', letterSpacing: 0.5 },
  dataValue: { fontSize: 12, color: '#e2e8f0', fontWeight: 600 },
  chipsWrap: { marginBottom: 16 },
  chipsLabel: { fontSize: 10, color: '#64748b', marginBottom: 6, letterSpacing: 0.5 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: {
    fontSize:     11,
    padding:      '4px 10px',
    borderRadius: 20,
    background:   '#0ea5e915',
    color:        '#0ea5e9',
    border:       '1px solid #0ea5e930',
  },
  confirmation: {
    background:   '#22c55e15',
    border:       '1px solid #22c55e40',
    borderRadius: 8,
    padding:      '12px 16px',
    textAlign:    'center',
    marginTop:    8,
  },
  confLabel:  { fontSize: 10, color: '#22c55e', letterSpacing: 1, marginBottom: 4 },
  confNumber: { fontSize: 22, fontWeight: 700, color: '#22c55e', letterSpacing: 2 },
}