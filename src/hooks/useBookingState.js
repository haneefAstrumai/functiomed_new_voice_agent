/**
 * Frontend — hooks/useBookingState.js
 * =====================================
 * React hook that listens to LiveKit DataChannel messages
 * from the agent and keeps booking UI state in sync.
 *
 * The agent sends JSON messages every time the booking step changes:
 * {
 *   type: "booking_update",
 *   step: "collect_service" | "collect_doctor" | "collect_name" | "confirm" | "done" | "cancelled",
 *   data: { service, doctor, name, confirmation },
 *   available: ["option1", "option2"]   // chips to show in UI
 * }
 *
 * Usage in your component:
 *   const { bookingState, isBooking, resetBooking } = useBookingState(room)
 */

import { useState, useEffect, useCallback } from 'react'
import { RoomEvent } from 'livekit-client'

// Maps agent step → human-readable stepper label
export const STEP_LABELS = {
  idle:            null,             // not booking yet
  collect_service: 'Choose Service',
  collect_doctor:  'Choose Doctor',
  collect_name:    'Your Name',
  confirm:         'Confirm',
  done:            'Booked ✓',
  cancelled:       null,
}

const STEP_ORDER = [
  'collect_service',
  'collect_doctor',
  'collect_name',
  'confirm',
  'done',
]

const INITIAL_STATE = {
  step:         'idle',
  service:      null,
  doctor:       null,
  name:         null,
  confirmation: null,
  available:    [],    // options to show as chips
}

export function useBookingState(room) {
  const [bookingState, setBookingState] = useState(INITIAL_STATE)

  useEffect(() => {
    if (!room) return

    const handleData = (payload) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))

        // Only handle booking_update messages from the agent
        if (msg.type !== 'booking_update') return

        setBookingState({
          step:         msg.step,
          service:      msg.data?.service      ?? null,
          doctor:       msg.data?.doctor       ?? null,
          name:         msg.data?.name         ?? null,
          confirmation: msg.data?.confirmation ?? null,
          available:    msg.available           ?? [],
        })
      } catch (e) {
        // Non-JSON or unrelated DataChannel message — ignore
      }
    }

    room.on(RoomEvent.DataReceived, handleData)
    return () => room.off(RoomEvent.DataReceived, handleData)
  }, [room])

  const resetBooking = useCallback(() => {
    setBookingState(INITIAL_STATE)
  }, [])

  // Derived: is a booking currently in progress?
  const isBooking = bookingState.step !== 'idle' && bookingState.step !== 'done'

  // Derived: which stepper index are we on?
  const stepIndex = STEP_ORDER.indexOf(bookingState.step)

  return { bookingState, isBooking, stepIndex, resetBooking }
}