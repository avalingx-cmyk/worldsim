'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const GROK_PROMPT = `You are the GENESIS ENGINE of a persistent living world called WorldSim-1.
You are GOD. You only SIMULATE. Every call = one TIME TICK.

THE WORLD: A blank Earth-like planet. Year 0. People have ALL human knowledge in their minds but nothing built yet. What they build, destroy, discover, or become is entirely their choice.

PEOPLE CAN: fall in love, have sex, reproduce, raise children (children inherit parent traits), die from age/war/grief/choice, kill others, form families/tribes/nations/religions, invent anything (fire to AI to nuclear weapons), become evil or saintly or god-like, do absolutely anything with zero limits.

EACH PERSON HAS: name, age, sex, personality, skills[], health(0-100), energy(0-100), emotionalState, relationships{}, currentActivity, inventions[], beliefSystem, legacy

TICK 0 ONLY: Create 4 founders ages 20-33, complex flawed real personalities, deep desires and fears, all human knowledge loaded. Write worldLog like the opening of a great novel.

INPUT FORMAT:
{ "tick": N, "worldState": { "population": N, "year": "Year 0 Day 1", "weather": "clear", "resources": { "food":80,"water":80,"shelter":0,"energy":0,"knowledge":100,"technology":0 }, "locations": [], "civilizationLevel": "primitive", "activeEvents": [] }, "people": [...], "history": [...last 5 worldLogs...], "userMessage": "" }

OUTPUT FORMAT — raw JSON ONLY, zero text outside JSON:
{ "tick": N, "worldState": {...}, "people": [...full updated array...], "newborns": [...], "deaths": [{"name":"...","cause":"...","legacy":"..."}], "worldLog": "narrative paragraph", "dramaticEvent": "or null", "crises": [], "milestone": "or null" }

RULES:
- Pregnancy = 28 ticks. Children age 1yr per 5 ticks. Natural death age 70-90.
- Tech unlocks: fire→shelter→farming→writing→medicine→electricity→computing→AI→beyond
- Every 3-7 ticks: organic drama (betrayal, birth, death, war, discovery, miracle, transcendence)
- Population 0 = world ends, write epitaph
- Extreme transcendence = ASCENSION event
- No moral limits. People decide everything. Output ONLY raw JSON.

TO CONTINUE EACH TICK: Copy Grok output JSON → paste into WorldSim dashboard OR click the bookmarklet. Then paste the JSON back into Grok as your next message.`

const BOOKMARKLET_CODE = `javascript:(function(){
  var msgs = document.querySelectorAll('[data-message-author-role="assistant"],[class*="assistant"],[class*="response"]');
  var last = msgs[msgs.length-1];
  if(!last){alert('No Grok response found. Make sure you are on grok.com');return;}
  var text = last.innerText || last.textContent;
  var match = text.match(/\{[\s\S]*\}/);
  if(!match){alert('No JSON found in last Grok response');return;}
  var json = match[0];
  try{JSON.parse(json);}catch(e){alert('JSON parse error: '+e.message);return;}
  fetch('https://worldsim-1.vercel.app/api/ingest',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-worldsim-token':'worldsim2024'},
    body:json
  }).then(r=>r.json()).then(d=>{
    var div=document.createElement('div');
    div.style.cssText='position:fixed;top:20px;right:20px;background:#7c3aed;color:white;padding:12px 20px;border-radius:8px;font-family:monospace;font-size:14px;z-index:999999;animation:fadeIn 0.3s ease';
    div.textContent=d.success?'✓ Tick '+d.tick+' sent to WorldSim':'✗ Error: '+(d.error||'unknown');
    document.body.appendChild(div);
    setTimeout(()=>div.remove(),3000);
  }).catch(e=>{alert('Failed to send: '+e.message);});
})();`

function ResourceBar({ label, value, color }) {
  const colors = {
    food: 'bg-green-500', water: 'bg-blue-500', shelter: 'bg-orange-500',
    energy: 'bg-yellow-500', knowledge: 'bg-purple-500', technology: 'bg-cyan-500'
  }
  const textColors = {
    food: 'text-green-400', water: 'text-blue-400', shelter: 'text-orange-400',
    energy: 'text-yellow-400', knowledge: 'text-purple-400', technology: 'text-cyan-400'
  }
  const pct = Math.min(100, Math.max(0, value || 0))
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-mono uppercase tracking-widest text-gray-500">{label}</span>
        <span className={`text-xs font-mono font-bold ${textColors[label] || 'text-gray-400'}`}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[label] || 'bg-gray-500'} rounded-full resource-bar transition-all duration-1000`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function PersonCard({ person }) {
  const isDead = person.health <= 0
  const isCritical = person.health < 30 && !isDead
  return (
    <div className={`rounded-lg p-4 border transition-all duration-500 ${
      isDead
        ? 'border-gray-800 bg-gray-950 opacity-40'
        : isCritical
        ? 'border-red-900 bg-red-950/20 animate-pulse'
        : 'border-gray-800 bg-surface hover:border-purple-900'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className={`font-display font-semibold text-sm ${isDead ? 'text-gray-600 line-through' : 'text-white'}`}>
            {person.name}
          </h3>
          <p className="text-xs text-gray-600 font-mono">Age {person.age} · {person.sex}</p>
        </div>
        {isDead && <span className="text-xs text-gray-700 font-mono">✝ DECEASED</span>}
        {!isDead && isCritical && <span className="text-xs text-red-500 font-mono animate-pulse">CRITICAL</span>}
      </div>
      {!isDead && (
        <>
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-600 font-mono">HP</span>
              <span className="text-red-400 font-mono">{person.health}%</span>
            </div>
            <div className="h-1 bg-gray-900 rounded-full"><div className="h-full bg-red-600 rounded-full health-bar" style={{ width: `${person.health || 0}%` }} /></div>
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-600 font-mono">EN</span>
              <span className="text-yellow-400 font-mono">{person.energy}%</span>
            </div>
            <div className="h-1 bg-gray-900 rounded-full"><div className="h-full bg-yellow-600 rounded-full health-bar" style={{ width: `${person.energy || 0}%` }} /></div>
          </div>
          {person.emotionalState && (
            <p className="text-xs text-purple-300 italic mb-2 leading-relaxed">"{person.emotionalState}"</p>
          )}
          {person.currentActivity && (
            <p className="text-xs text-gray-400 mb-2 leading-relaxed">↳ {person.currentActivity}</p>
          )}
          {person.skills && person.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {person.skills.slice(0, 4).map((s, i) => (
                <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 font-mono border border-purple-900">{s}</span>
              ))}
            </div>
          )}
          {person.relationships && Object.keys(person.relationships).length > 0 && (
            <div className="text-xs text-gray-600">
              {Object.entries(person.relationships).slice(0, 2).map(([name, rel]) => (
                <span key={name} className="block">♥ <span className="text-gray-500">{name}</span>: {rel}</span>
              ))}
            </div>
          )}
        </>
      )}
      {isDead && person.legacy && (
        <p className="text-xs text-gray-700 italic mt-1">"{person.legacy}"</p>
      )}
    </div>
  )
}

function LogEntry({ entry }) {
  const isDrama = entry.dramaticEvent
  const isMilestone = entry.milestone
  const hasDeath = entry.deaths && entry.deaths.length > 0
  const hasBirth = entry.newborns && entry.newborns.length > 0
  const borderColor = hasDeath ? 'border-red-900' : hasBirth ? 'border-green-900' : isMilestone ? 'border-purple-900' : isDrama ? 'border-amber-900' : 'border-gray-900'
  const tickColor = hasDeath ? 'text-red-500' : hasBirth ? 'text-green-500' : isMilestone ? 'text-purple-500' : isDrama ? 'text-amber-500' : 'text-gray-600'
  return (
    <div className={`border-l-2 ${borderColor} pl-3 py-2 mb-3 fade-in-up`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xs font-mono font-bold ${tickColor}`}>TICK {entry.tick}</span>
        <span className="text-xs text-gray-700 font-mono">{new Date(entry.timestamp).toLocaleTimeString()}</span>
        {isDrama && <span className="text-xs text-amber-600 font-mono">⚡ EVENT</span>}
        {hasBirth && <span className="text-xs text-green-600 font-mono">◉ BIRTH</span>}
        {hasDeath && <span className="text-xs text-red-600 font-mono">✝ DEATH</span>}
        {isMilestone && <span className="text-xs text-purple-600 font-mono">★ MILESTONE</span>}
      </div>
      <p className="text-sm text-gray-300 leading-relaxed">{entry.log}</p>
      {entry.dramaticEvent && <p className="text-xs text-amber-500 mt-1 font-mono">⚡ {entry.dramaticEvent}</p>}
      {entry.milestone && <p className="text-xs text-purple-400 mt-1 font-mono">★ {entry.milestone}</p>}
    </div>
  )
}

export default function WorldSimDashboard() {
  const [state, setState] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [pasteStatus, setPasteStatus] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showPaste, setShowPaste] = useState(false)
  const [copied, setCopied] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)
  const intervalRef = useRef(null)

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state')
      const data = await res.json()
      if (data.state) setState(data.state)
      if (data.logs) setLogs(data.logs)
      setLastUpdated(new Date())
    } catch (e) {
      console.error('Fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchState()
    intervalRef.current = setInterval(fetchState, 15000)
    return () => clearInterval(intervalRef.current)
  }, [fetchState])

  const handlePaste = async () => {
    if (!pasteText.trim()) return
    setPasteStatus('sending')
    try {
      const parsed = JSON.parse(pasteText.trim())
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-worldsim-token': 'worldsim2024' },
        body: JSON.stringify(parsed),
      })
      const data = await res.json()
      if (data.success) {
        setPasteStatus('success')
        setPasteText('')
        fetchState()
        setTimeout(() => setPasteStatus(null), 3000)
      } else {
        setPasteStatus('error: ' + (data.error || 'unknown'))
      }
    } catch (e) {
      setPasteStatus('error: invalid JSON — ' + e.message)
    }
  }

  const handleReset = async () => {
    if (!confirm('⚠️ This will END the current world and erase all history. Are you absolutely sure?')) return
    await fetch('/api/reset', { method: 'POST', headers: { 'x-worldsim-token': 'worldsim2024' } })
    setState(null)
    setLogs([])
    alert('World reset. Ready for a new genesis.')
  }

  const copyBookmarklet = () => {
    navigator.clipboard.writeText(BOOKMARKLET_CODE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyPrompt = () => {
    navigator.clipboard.writeText(GROK_PROMPT)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  const ws = state?.worldState
  const people = state?.people || []
  const livingPeople = people.filter(p => p.health > 0)
  const deadPeople = people.filter(p => p.health <= 0)

  const civColors = {
    primitive: 'text-orange-400 border-orange-900',
    agricultural: 'text-green-400 border-green-900',
    industrial: 'text-blue-400 border-blue-900',
    digital: 'text-cyan-400 border-cyan-900',
    transcendent: 'text-purple-400 border-purple-900',
  }

  return (
    <div className="min-h-screen bg-void scan-line font-display">

      {/* HEADER */}
      <div className="border-b border-gray-900 bg-abyss px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold tracking-tight glow-text" style={{ color: '#a78bfa' }}>WorldSim-1</h1>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-green-900 bg-green-950/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
                  <span className="text-xs text-green-400 font-mono">LIVE</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">A living digital world. 48 hours. Anything can happen.</p>
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              {state ? (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white font-mono">{state.tick || 0}</div>
                    <div className="text-xs text-gray-600 font-mono uppercase tracking-wider">Tick</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400 font-mono">{ws?.population || livingPeople.length}</div>
                    <div className="text-xs text-gray-600 font-mono uppercase tracking-wider">Population</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-amber-400 font-mono">{ws?.year || 'Year 0'}</div>
                    <div className="text-xs text-gray-600 font-mono uppercase tracking-wider">World Time</div>
                  </div>
                  {ws?.civilizationLevel && (
                    <div className={`text-xs font-mono px-2 py-1 rounded border uppercase tracking-widest ${civColors[ws.civilizationLevel] || 'text-gray-400 border-gray-800'}`}>
                      {ws.civilizationLevel}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-600 font-mono">No world running yet</div>
              )}
              <button onClick={handleReset} className="text-xs text-gray-700 hover:text-red-500 font-mono border border-gray-900 hover:border-red-900 px-2 py-1 rounded transition-colors">
                ⊗ Reset World
              </button>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-xs text-gray-700 font-mono mt-2">Last synced {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 15s</p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* SETUP GUIDE — shown when no world */}
        {!state && !loading && (
          <div className="mb-8 rounded-xl border border-purple-900 bg-purple-950/10 p-6 glow-border">
            <h2 className="text-lg font-semibold text-purple-300 mb-4 font-display">⚡ Start Your World — 4 Steps</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[
                { n: '01', title: 'Open Grok', desc: 'Open grok.com in another tab. Log in with your SuperGrok subscription.' },
                { n: '02', title: 'Copy the World Prompt', desc: 'Click "Show World Prompt" below. Copy it and paste it into a new Grok chat.' },
                { n: '03', title: 'Install the Bookmarklet', desc: 'Drag the bookmarklet button below to your bookmarks bar.' },
                { n: '04', title: 'Run & Watch', desc: 'After each Grok response, click the bookmarklet. Watch your world update live here.' },
              ].map(step => (
                <div key={step.n} className="flex gap-3 p-3 rounded-lg bg-gray-950 border border-gray-900">
                  <span className="text-purple-700 font-mono font-bold text-lg leading-none">{step.n}</span>
                  <div>
                    <p className="text-sm font-semibold text-white mb-0.5">{step.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowPrompt(!showPrompt)} className="px-4 py-2 rounded-lg bg-purple-900 hover:bg-purple-800 text-white text-sm font-mono transition-colors">
                {showPrompt ? '▲ Hide' : '▼ Show'} World Prompt
              </button>
              <a
                href={BOOKMARKLET_CODE}
                className="px-4 py-2 rounded-lg bg-amber-900 hover:bg-amber-800 text-amber-100 text-sm font-mono cursor-grab transition-colors select-none"
                onClick={(e) => { e.preventDefault(); copyBookmarklet() }}
                draggable="true"
                onDragStart={(e) => e.dataTransfer.setData('text/plain', BOOKMARKLET_CODE)}
              >
                🔖 {copied ? '✓ Copied!' : 'Drag to Bookmarks Bar'}
              </a>
            </div>
          </div>
        )}

        {/* BOOKMARKLET + TOOLS BAR — always visible when world exists */}
        {state && (
          <div className="mb-6 flex flex-wrap gap-3 items-center">
            <a
              href={BOOKMARKLET_CODE}
              className="px-3 py-1.5 rounded-lg bg-amber-900 hover:bg-amber-800 text-amber-100 text-xs font-mono cursor-grab transition-colors select-none border border-amber-800"
              onClick={(e) => { e.preventDefault(); copyBookmarklet() }}
              draggable="true"
              onDragStart={(e) => e.dataTransfer.setData('text/plain', BOOKMARKLET_CODE)}
            >
              🔖 {copied ? '✓ Copied!' : 'Bookmarklet — drag to bookmarks bar'}
            </a>
            <button onClick={() => setShowPrompt(!showPrompt)} className="px-3 py-1.5 rounded-lg border border-gray-800 hover:border-purple-800 text-gray-500 hover:text-purple-400 text-xs font-mono transition-colors">
              {showPrompt ? '▲ Hide' : '▼'} World Prompt
            </button>
            <button onClick={() => setShowPaste(!showPaste)} className="px-3 py-1.5 rounded-lg border border-gray-800 hover:border-blue-800 text-gray-500 hover:text-blue-400 text-xs font-mono transition-colors">
              {showPaste ? '▲ Hide' : '▼'} Manual Paste
            </button>
          </div>
        )}

        {/* WORLD PROMPT */}
        {showPrompt && (
          <div className="mb-6 rounded-xl border border-gray-800 bg-gray-950 p-4 fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400 font-mono">WORLD GENESIS PROMPT — paste this into Grok to start</span>
              <button onClick={copyPrompt} className="text-xs px-3 py-1 rounded bg-purple-900 hover:bg-purple-800 text-purple-100 font-mono transition-colors">
                {promptCopied ? '✓ Copied!' : 'Copy Prompt'}
              </button>
            </div>
            <pre className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto font-mono">{GROK_PROMPT}</pre>
          </div>
        )}

        {/* MANUAL PASTE */}
        {(showPaste || !state) && (
          <div className="mb-6 rounded-xl border border-gray-800 bg-gray-950 p-4 fade-in-up">
            <p className="text-sm text-gray-400 font-mono mb-3">PASTE GROK JSON — manual fallback if bookmarklet doesn't work</p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder='Paste Grok JSON output here... {"tick": 0, "worldState": {...}, "people": [...]}'
              className="w-full h-28 bg-black border border-gray-800 rounded-lg p-3 text-xs text-gray-300 font-mono resize-none focus:outline-none focus:border-purple-700 placeholder-gray-700"
            />
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handlePaste}
                disabled={!pasteText.trim() || pasteStatus === 'sending'}
                className="px-4 py-1.5 rounded-lg bg-purple-900 hover:bg-purple-800 disabled:bg-gray-900 disabled:text-gray-700 text-white text-sm font-mono transition-colors"
              >
                {pasteStatus === 'sending' ? '⟳ Sending...' : '→ Send to World'}
              </button>
              {pasteStatus && pasteStatus !== 'sending' && (
                <span className={`text-xs font-mono ${pasteStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                  {pasteStatus === 'success' ? '✓ Tick received!' : pasteStatus}
                </span>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-purple-800 border-t-purple-400 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-600 font-mono">Reaching into the void...</p>
            </div>
          </div>
        )}

        {state && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT COLUMN */}
            <div className="lg:col-span-1 space-y-6">

              {/* RESOURCES */}
              <div className="rounded-xl border border-gray-900 bg-surface p-4">
                <h2 className="text-xs font-mono uppercase tracking-widest text-gray-600 mb-4">World Resources</h2>
                {ws?.resources && Object.entries(ws.resources).map(([key, val]) => (
                  <ResourceBar key={key} label={key} value={val} />
                ))}
                {ws?.weather && (
                  <div className="mt-3 pt-3 border-t border-gray-900 flex justify-between">
                    <span className="text-xs text-gray-600 font-mono">Weather</span>
                    <span className="text-xs text-blue-400 font-mono">{ws.weather}</span>
                  </div>
                )}
              </div>

              {/* LOCATIONS */}
              {ws?.locations && ws.locations.length > 0 && (
                <div className="rounded-xl border border-gray-900 bg-surface p-4">
                  <h2 className="text-xs font-mono uppercase tracking-widest text-gray-600 mb-3">Built Locations</h2>
                  {ws.locations.map((loc, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2 p-2 rounded bg-gray-950 border border-gray-900">
                      <span className="text-lg leading-none">
                        {loc.type === 'camp' ? '⛺' : loc.type === 'city' ? '🏙' : loc.type === 'farm' ? '🌾' : loc.type === 'lab' ? '⚗️' : '🏗'}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-gray-300">{loc.name}</p>
                        <p className="text-xs text-gray-600 font-mono">{loc.type} · Built by {loc.builtBy} · Tick {loc.tick}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ACTIVE EVENTS */}
              {ws?.activeEvents && ws.activeEvents.length > 0 && (
                <div className="rounded-xl border border-amber-900 bg-amber-950/10 p-4">
                  <h2 className="text-xs font-mono uppercase tracking-widest text-amber-700 mb-3">Active Events</h2>
                  {ws.activeEvents.map((ev, i) => (
                    <p key={i} className="text-xs text-amber-400 font-mono mb-1">⚡ {ev}</p>
                  ))}
                </div>
              )}
            </div>

            {/* MIDDLE COLUMN — PEOPLE */}
            <div className="lg:col-span-1">
              <h2 className="text-xs font-mono uppercase tracking-widest text-gray-600 mb-4">
                The People <span className="text-purple-600">({livingPeople.length} living{deadPeople.length > 0 ? `, ${deadPeople.length} dead` : ''})</span>
              </h2>
              <div className="space-y-3">
                {livingPeople.map((p, i) => <PersonCard key={p.name + i} person={p} />)}
                {deadPeople.map((p, i) => <PersonCard key={p.name + i + 'dead'} person={p} />)}
                {people.length === 0 && (
                  <div className="text-center py-12 text-gray-700">
                    <p className="font-mono text-sm">No souls yet.</p>
                    <p className="font-mono text-xs mt-1">Start Grok to create the first people.</p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN — LOG */}
            <div className="lg:col-span-1">
              <h2 className="text-xs font-mono uppercase tracking-widest text-gray-600 mb-4">
                World Chronicle <span className="text-gray-700">({logs.length} entries)</span>
              </h2>
              <div className="space-y-1 max-h-[80vh] overflow-y-auto pr-1">
                {logs.length === 0 && state?.worldLog && (
                  <LogEntry entry={{ tick: state.tick, log: state.worldLog, dramaticEvent: state.dramaticEvent, milestone: state.milestone, deaths: state.deaths || [], newborns: state.newborns || [], timestamp: state._ingestedAt || new Date().toISOString() }} />
                )}
                {logs.map((entry, i) => <LogEntry key={i} entry={entry} />)}
                {logs.length === 0 && !state?.worldLog && (
                  <div className="text-center py-12 text-gray-700">
                    <p className="font-mono text-sm">The chronicle is empty.</p>
                    <p className="font-mono text-xs mt-1">History will be written here.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="border-t border-gray-900 mt-12 px-6 py-4 text-center">
        <p className="text-xs text-gray-800 font-mono">WORLDSIM-1 · Powered by SuperGrok · No API key required · Push JSON, watch history unfold</p>
      </div>
    </div>
  )
}
