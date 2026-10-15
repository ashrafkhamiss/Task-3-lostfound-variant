import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'

// Report Item page. Routed at /items/new (report) and /items/:id (edit),
// both wrapped in <ProtectedRoute>.

const defaults = { title: '', description: '', category: 'other', status: 'lost', location: '' }

// Must match the server's Joi `valid(...)` lists exactly, or it returns 400.
const STATUSES = ['lost', 'found', 'claimed']
const CATEGORIES = ['electronics', 'clothing', 'documents', 'accessories', 'other']

// Turn 'accessories' into 'Accessories' for display; the option value stays lowercase.
const label = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export default function ItemForm() {
  const nav = useNavigate()
  const { id } = useParams()
  const [form, setForm] = useState(defaults)
  const [error, setError] = useState('')

  // Edit mode: when the URL has an id, load the item and fill the form.
  useEffect(() => {
    if (!id) {
      // Going from /items/:id to /items/new reuses this component,
      // so clear any values left over from the edited item.
      setForm(defaults)
      return
    }
    let cancelled = false
    api.get(`/items/${id}`)
      .then(({ data }) => {
        if (cancelled) return
        const { title, status, category, location, description } = data.item
        setForm({
          title,
          status,
          category,
          // Optional fields may be missing in the DB; '' keeps the inputs controlled.
          location: location ?? '',
          description: description ?? ''
        })
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message || 'Failed to load item')
      })
    // If the id changes (or we leave the page) before the request finishes,
    // ignore its result instead of filling the form with stale data.
    return () => { cancelled = true }
  }, [id])

  // One handler for every input: the input's `name` says which field to update.
  function onChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    // Send only these five fields. Never send reportedBy: the server takes the
    // reporter from the token and rejects the request if it's in the body.
    const { title, status, category, location, description } = form
    const body = { title, status, category, location, description }
    try {
      if (id) {
        await api.patch(`/items/${id}`, body)
      } else {
        await api.post('/items', body)
      }
      nav('/items')
    } catch (err) {
      // Server sends { message } for 400 (validation), 403 (not yours), 409 (duplicate).
      setError(err?.response?.data?.message || 'Failed to save item')
    }
  }

  return (
    <div className="max-w-lg mx-auto card">
      <h1 className="text-xl font-semibold mb-4">{id ? 'Edit' : 'Report'} Item</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="input"
          name="title"
          placeholder="Title (e.g. Black backpack)"
          value={form.title}
          onChange={onChange}
          required
        />
        <select className="input" name="status" value={form.status} onChange={onChange}>
          {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
        <select className="input" name="category" value={form.category} onChange={onChange}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
        </select>
        <input
          className="input"
          name="location"
          placeholder="Location (optional, e.g. Library 2nd floor)"
          value={form.location}
          onChange={onChange}
        />
        <textarea
          className="input"
          name="description"
          placeholder="Description (optional)"
          rows={3}
          value={form.description}
          onChange={onChange}
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button className="btn" type="submit">Save</button>
      </form>
    </div>
  )
}
