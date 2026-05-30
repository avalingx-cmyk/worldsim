import { kv } from '@vercel/kv'

async function doReset() {
  const [s, l] = await Promise.all([
    kv.del('worldsim:state'),
    kv.del('worldsim:logs'),
  ])
  return { success: true, deleted: { state: s, logs: l }, message: 'World wiped. KV is empty. Ready for new genesis.' }
}

export async function POST(request) {
  try {
    const token = request.headers.get('x-worldsim-token')
    const INGEST_TOKEN = process.env.INGEST_TOKEN || 'worldsim2024'
    if (token !== INGEST_TOKEN) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const result = await doReset()
    return Response.json(result)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const INGEST_TOKEN = process.env.INGEST_TOKEN || 'worldsim2024'
    if (token !== INGEST_TOKEN) {
      return Response.json({ error: 'Pass ?token=worldsim2024 to confirm reset' }, { status: 401 })
    }
    const result = await doReset()
    return Response.json(result)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
