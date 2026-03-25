const BASE = import.meta.env.VITE_API_URL || '/api'

async function req(method, path, body) {
  const shouldLogLatency =
    path.startsWith('/bookings') ||
    path.startsWith('/clinic/services') ||
    path.startsWith('/clinic/doctors') ||
    path.startsWith('/clinic/slots') ||
    path.startsWith('/livekit/token')

  const t0 = shouldLogLatency ? performance.now() : 0
  const reqId = shouldLogLatency ? Math.random().toString(16).slice(2) : ''

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  let res
  try {
    res = await fetch(`${BASE}${path}`, opts)
  } catch (e) {
    if (shouldLogLatency) {
      const dt = performance.now() - t0
      console.warn(`[LATENCY][${reqId}] ${method} ${path} failed after ${dt.toFixed(0)}ms`)
    }
    throw e
  }
  if (!res.ok) {
    if (shouldLogLatency) {
      const dt = performance.now() - t0
      console.warn(`[LATENCY][${reqId}] ${method} ${path} -> HTTP ${res.status} in ${dt.toFixed(0)}ms`)
    }
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  if (shouldLogLatency) {
    const dt = performance.now() - t0
    console.info(`[LATENCY][${reqId}] ${method} ${path} -> ${res.status} in ${dt.toFixed(0)}ms`)
  }
  return res.json()
}

// ── Bookings ────────────────────────────────────────────────
export const api = {
  bookings: {
    list:   (status) => req('GET', `/bookings/${status ? `?status=${status}` : ''}`),
    // Used by admin BookingsPage to send arbitrary filter params
    listFiltered: (params = {}) => {
      const q = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
      ).toString()
      return req('GET', `/bookings/${q ? `?${q}` : ''}`)
    },
    get:    (id)     => req('GET', `/bookings/${id}`),
    create: (data)   => req('POST', '/bookings/', data),
    update: (id, d)  => req('PATCH', `/bookings/${id}`, d),
    cancel: (id)     => req('POST', `/bookings/${id}/cancel`),
    delete: (id)     => req('DELETE', `/bookings/${id}`),
  },

  // ── Services ──────────────────────────────────────────────
  services: {
    list:   ()       => req('GET', '/clinic/services'),
    get:    (id)     => req('GET', `/clinic/services/${id}`),
    create: (data)   => req('POST', '/clinic/services', data),
    update: (id, d)  => req('PATCH', `/clinic/services/${id}`, d),
    delete: (id)     => req('DELETE', `/clinic/services/${id}`),
  },

  // ── Doctors ───────────────────────────────────────────────
  doctors: {
    list:           ()           => req('GET', '/clinic/doctors'),
    listByService:  (name)       => req('GET', `/clinic/doctors?service=${encodeURIComponent(name)}`),
    get:            (id)         => req('GET', `/clinic/doctors/${id}`),
    create:         (data)       => req('POST', '/clinic/doctors', data),
    update:         (id, d)      => req('PATCH', `/clinic/doctors/${id}`, d),
    delete:         (id)         => req('DELETE', `/clinic/doctors/${id}`),
    getServices:    (id)         => req('GET', `/clinic/doctors/${id}/services`),
    assignService:  (id, svcId)  => req('POST', `/clinic/doctors/${id}/services`, { service_id: svcId }),
    removeService:  (id, svcId)  => req('DELETE', `/clinic/doctors/${id}/services/${svcId}`),
  },
 

  // ── Slots ─────────────────────────────────────────────────
  slots: {
    list:   (params = {}) => {
      const q = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
      ).toString()
      return req('GET', `/clinic/slots${q ? `?${q}` : ''}`)
    },
    get:    (id)     => req('GET', `/clinic/slots/${id}`),
    create: (data)   => req('POST', '/clinic/slots', data),
    update: (id, d)  => req('PATCH', `/clinic/slots/${id}`, d),
    delete: (id)     => req('DELETE', `/clinic/slots/${id}`),
  },

  // ── PDFs ──────────────────────────────────────────────────
  pdfs: {
    list:   ()     => req('GET', '/pdfs/'),
    upload: (form) => fetch(`${BASE}/pdfs/upload`, { method: 'POST', body: form }).then(r => r.json()),
    delete: (id)   => req('DELETE', `/pdfs/${id}`),
  },

  // ── LiveKit token ─────────────────────────────────────────
  livekit: {
    token: (room, identity, mode = 'rag') =>
      req('GET', `/livekit/token?room=${room}&identity=${identity}&mode=${encodeURIComponent(mode)}`),
  },
}
