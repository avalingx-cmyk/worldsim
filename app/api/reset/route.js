import { kv } from '@vercel/kv'

export async function POST(request) {
  try {
    const token = request.headers.get('x-worldsim-token')
    const INGEST_TOKEN = process.env.INGEST_TOKEN || 'worldsim2024'
    if (token !== INGEST_TOKEN) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await kv.del('worldsim:state')
    await kv.del('worldsim:logs')
    return Response.json({ success: true, message: 'World reset. Ready for a new genesis.' })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
