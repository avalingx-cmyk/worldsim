import { kv } from '@vercel/kv'

export async function GET() {
  try {
    const state = await kv.get('worldsim:state')
    const rawLogs = await kv.lrange('worldsim:logs', 0, 49)
    const logs = rawLogs.map(l => {
      try { return typeof l === 'string' ? JSON.parse(l) : l }
      catch { return { log: l, tick: 0, timestamp: new Date().toISOString() } }
    })
    return Response.json({ state: state || null, logs: logs || [] })
  } catch (err) {
    console.error('State error:', err)
    return Response.json({ state: null, logs: [], error: err.message })
  }
}
