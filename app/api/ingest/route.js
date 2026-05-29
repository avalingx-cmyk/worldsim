import { kv } from '@vercel/kv'

const INGEST_TOKEN = process.env.INGEST_TOKEN || 'worldsim2024'

export async function POST(request) {
  try {
    const token = request.headers.get('x-worldsim-token')
    if (token !== INGEST_TOKEN) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    if (body.tick === undefined || !body.worldState || !body.people) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 })
    }
    const stateWithMeta = { ...body, _ingestedAt: new Date().toISOString() }
    await kv.set('worldsim:state', stateWithMeta)
    if (body.worldLog) {
      const logEntry = {
        tick: body.tick,
        log: body.worldLog,
        dramaticEvent: body.dramaticEvent || null,
        milestone: body.milestone || null,
        deaths: body.deaths || [],
        newborns: body.newborns || [],
        timestamp: new Date().toISOString(),
      }
      await kv.lpush('worldsim:logs', JSON.stringify(logEntry))
      await kv.ltrim('worldsim:logs', 0, 99)
    }
    return Response.json({ success: true, tick: body.tick, population: body.worldState.population || body.people.length })
  } catch (err) {
    console.error('Ingest error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  return Response.json({ status: 'WorldSim-1 ingest endpoint — POST only' })
}
