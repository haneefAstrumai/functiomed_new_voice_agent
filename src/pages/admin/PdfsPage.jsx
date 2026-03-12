import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'
import { Btn, Card, Confirm, SearchInput, Spinner, Empty, showToast, Badge } from '../../components/ui'
import { PageHeader } from '../../components/admin/PageHeader'

const BASE = import.meta.env.VITE_API_URL || '/api'

async function ingestPdfs() {
  const res = await fetch(`${BASE}/pdfs/ingest?rebuild_index=true`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export default function PdfsPage() {
  const [pdfs, setPdfs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [search, setSearch] = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  async function load() {
    setLoading(true)
    try {
      const res = await api.pdfs.list()
      setPdfs(res.pdfs || res.documents || res || [])
    } catch (e) {
      showToast('Could not load PDFs — check /pdfs/ endpoint', 'error')
      setPdfs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function upload(files) {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of files) {
        if (file.type !== 'application/pdf') {
          showToast(`${file.name} is not a PDF`, 'error'); continue
        }
        const form = new FormData()
        form.append('file', file)
        await api.pdfs.upload(form)
        showToast(`${file.name} uploaded`, 'success')
      }
      load()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete() {
    if (!confirmDel) return
    try {
      await api.pdfs.delete(confirmDel.id || confirmDel.filename)
      showToast('Document deleted', 'success')
      setConfirmDel(null)
      load()
    } catch (e) {
      showToast(e.message, 'error')
      setConfirmDel(null)
    }
  }

  async function handleIngest() {
    setIngesting(true)
    try {
      const res = await ingestPdfs()
      showToast(res.message || 'Ingestion started', 'success')
      if (res.index_rebuild) showToast('Index rebuilding in background…', 'info')
      load()
    } catch (e) {
      showToast(`Ingestion failed: ${e.message}`, 'error')
    } finally {
      setIngesting(false)
    }
  }

  const filtered = pdfs.filter(p =>
    !search || (p.filename || p.name || '').toLowerCase().includes(search.toLowerCase())
  )

  function formatBytes(bytes) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }} className="fade-in">
      <PageHeader
        title="Documents"
        sub="PDF knowledge base for RAG system"
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search documents..." />
            <Btn variant="secondary" onClick={handleIngest} disabled={ingesting}>
              {ingesting ? <><Spinner size={12} /> Ingesting…</> : '⚡ Ingest All'}
            </Btn>
            <Btn onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <><Spinner size={12} /> Uploading…</> : '↑ Upload PDF'}
            </Btn>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              multiple
              style={{ display: 'none' }}
              onChange={e => upload(Array.from(e.target.files))}
            />
          </div>
        }
      />

      {/* Ingest info banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', background: 'rgba(0,212,255,0.04)',
        border: '1px solid rgba(0,212,255,0.12)', borderRadius: 'var(--radius)',
      }}>
        <span style={{ fontSize: '16px' }}>ℹ</span>
        <span style={{ fontSize: '12px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
          After uploading PDFs, click <strong style={{ color: 'var(--cyan)' }}>⚡ Ingest All</strong> to parse and rebuild the RAG index.
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); upload(Array.from(e.dataTransfer.files)) }}
        style={{
          border: `2px dashed ${dragOver ? 'var(--cyan)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)', padding: '28px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
          background: dragOver ? 'rgba(0,212,255,0.04)' : 'transparent',
          transition: 'all 0.2s', cursor: 'pointer',
        }}
        onClick={() => fileRef.current?.click()}
      >
        <span style={{ fontSize: '28px' }}>📄</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-2)' }}>
          Drop PDF files here or click to upload
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
          Files are indexed into the RAG knowledge base
        </span>
      </div>

      {/* Documents grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spinner size={24} /></div>
      ) : filtered.length === 0 ? (
        <Empty icon="⊟" text="No documents uploaded yet" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {filtered.map((pdf, i) => {
            const name = pdf.filename || pdf.name || pdf.id || `Document ${i + 1}`
            const size = pdf.size || pdf.file_size
            const date = pdf.uploaded_at || pdf.created_at
            return (
              <Card key={pdf.id || i} hover style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '40px', height: '48px', background: 'rgba(255,68,102,0.1)',
                    border: '1px solid rgba(255,68,102,0.25)', borderRadius: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', flexShrink: 0,
                  }}>📄</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={name}>
                      {name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: '3px', display: 'flex', gap: '10px' }}>
                      {size && <span>{formatBytes(size)}</span>}
                      {date && <span>{date.slice(0, 10)}</span>}
                    </div>
                    {pdf.indexed !== undefined && (
                      <div style={{ marginTop: '6px' }}>
                        <Badge variant={pdf.indexed ? 'success' : 'warning'}>{pdf.indexed ? 'Indexed' : 'Pending'}</Badge>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <Btn size="sm" variant="danger" onClick={() => setConfirmDel(pdf)}>Delete</Btn>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Confirm
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        message={`Delete "${confirmDel?.filename || confirmDel?.name}"? It will be removed from the RAG knowledge base.`}
      />
    </div>
  )
}