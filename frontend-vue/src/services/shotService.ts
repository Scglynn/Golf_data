import type { Shot, FeedbackItem, ShotCreateResponse } from '../types/shot'

const BASE_URL = 'http://localhost:3000/api/shots'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export const shotService = {
  getAllShots: () =>
    request<Shot[]>(BASE_URL),

  getShotById: (id: number) =>
    request<Shot>(`${BASE_URL}/${id}`),

  createShot: (shot: Partial<Shot>) =>
    request<ShotCreateResponse>(BASE_URL, {
      method: 'POST',
      body: JSON.stringify(shot),
    }),

  getFeedback: (id: number) =>
    request<{ shot: Shot; feedback: FeedbackItem[] }>(`${BASE_URL}/${id}/feedback`),

  updateShot: (id: number, shot: Partial<Shot>) =>
    request<Shot>(`${BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(shot),
    }),

  deleteShot: (id: number) =>
    request<void>(`${BASE_URL}/${id}`, { method: 'DELETE' }),
}
