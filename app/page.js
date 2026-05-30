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
- Tech unlocks: fire->shelter->farming->writing->medicine->electricity->computing->AI->beyond
- Every 3-7 ticks: organic drama (betrayal, birth, death, war, discovery, miracle, transcendence)
- Population 0 = world ends, write epitaph
- Extreme transcendence = ASCENSION event
- No moral limits. People decide everything. Output ONLY raw JSON.

TO CONTINUE EACH TICK: Copy Grok output JSON, paste into WorldSim dashboard, then paste the JSON back into Grok as your next message to advance the world.`

function buildBookmarklet(origin) {
  return `javascript:(function(){var HOST='${origin}';var fullText=document.body.innerText||'';var jsonStr=null;var fenced=fullText.match(/\`\`\`(?:json)?\\s*([\\s\\S]*?)\\s*\`\`\`/);if(fenced){jsonStr=fenced[1].trim();}if(!jsonStr){var idx=fullText.lastIndexOf('"tick"');if(idx>-1){var start=fullText.lastIndexOf('{',idx);var depth=0;var end=-1;for(var i=start;i<fullText.length;i++){if(fullText[i]==='{')depth++;else if(fullText[i]==='}'){depth--;if(depth===0){end=i;break;}}}if(end>-1)jsonStr=fullText.slice(start,end+1);}}if(!jsonStr){var m=fullText.match(/\\{[\\s\\S]*"tick"[\\s\\S]*"worldState"[\\s\\S]*\\}/);if(m)jsonStr=m[0];}if(!jsonStr){alert('WorldSim: No JSON found.\\n\\nMake sure Grok finished responding then try again.\\nOr use the manual paste box on your dashboard.');return;}var parsed;try{parsed=JSON.parse(jsonStr);}catch(e){alert('WorldSim: JSON parse error: '+e.message+'\\n\\nUse the manual paste box instead.');return;}if(parsed.tick===undefined){alert('WorldSim: Found JSON but missing tick field.\\nMake sure Grok responded with world simulation JSON.');return;}fetch(HOST+'/api/ingest',{method:'POST',headers:{'Content-Type':'application/json','x-worldsim-token':'worldsim2024'},body:jsonStr}).then(function(r){return r.json();}).then(function(d){var div=document.createElement('div');div.style.cssText='position:fixed;top:20px;right:20px;background:'+(d.success?'#16a34a':'#dc2626')+';color:white;padding:14px 22px;border-radius:10px;font-family:monospace;font-size:14px;z-index:999999;box-shadow:0 4px 20px rgba(0,0,0,0.5)';div.textContent=d.success?'WorldSim Tick '+d.tick+' saved! Pop: '+d.population:'Error: '+(d.error||'unknown');document.body.appendChild(div);setTimeout(function(){div.remove();},4000);}).catch(function(e){alert('WorldSim send failed: '+e.message);});})();`
}

function ResourceBar({ label, value }) {
  const colors = { food:'bg-green-500', water:'bg-blue-500', shelter:'bg-orange-500', energy:'bg-yellow-500', knowledge:'bg-purple-500', technology:'bg-cyan-500' }
  const textColors = { food:'text-green-400', water:'text-blue-400', shelter:'text-orange-400', energy:'text-yellow-400', knowledge:'text-purple-400', technology:'text-cyan-400' }
  const pct = Math.min(100, Math.max(0, value || 0))
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-mono uppercase tracking-widest text-gray-500">{label}</span>
        <span className={`text-xs font-mono font-bold ${textColors[label] || 'text-gray-400'}`}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
        <div className={`h-full ${colors[label] || 'bg-gray-500'} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function PersonCard({ person }) {
  const isDead = person.health <= 0
  const isCritical = person.health < 30 && !isDead
  return (
    <div className={`rounded-lg p-4 border transition-all duration-500 ${isDead ? 'border-gray-800 bg-gray-950 opacity-40' : isCritical ? 'border-red-900 bg-red-950/20' : 'border-gray-800 bg-surface hover:border-purple-900'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className={`font-display font-semibold text-sm ${isDead ? 'text-gray-600 line-through' : 'text-white'}`}>{person.name}</h3>
          <p className="text-xs text-gray-600 font-mono">Age {person.age} · {person.sex}</p>
        </div>
        {isDead && <span className="text-xs text-gray-700 font-mono">✝ DECEASED</span>}
        {!isDead && isCritical && <span className="text-xs text-red-500 font-mono animate-pulse">CRITICAL</span>}
      </div>
      {!isDead && (
        <>
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-0.5"><span className="text-gray-600 font-mono">HP</span><span className="text-red-400 font-mono">{person.health}%</span></div>
            <div className="h-1 bg-gray-900 rounded-full"><div className="h-full bg-red-600 rounded-full transition-all duration-1000" style={{ width: `${person.health || 0}%` }} /></div>
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-0.5"><span className="text-gray-600 font-mono">EN</span><span className="text-yellow-400 font-mono">{person.energy}%</span></div>
            <div className="h-1 bg-gray-900 rounded-full"><div className="h-full bg-yellow-600 rounded-full transition-all duration-1000" style={{ width: `${person.energy || 0}%` }} /></div>
          </div>
          {person.emotionalState && <p className="text-xs text-purple-300 italic mb-2 leading-relaxed">"{person.emotionalState}"</p>}
          {person.currentActivity && <p className="text-xs text-gray-400 mb-2 leading-relaxed">↳ {person.currentActivity}</p>}
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
      {isDead && person.legacy && <p className="text-xs text-gray-700 italic mt-1">"{person.legacy}"</p>}
    </div>
  )
}

function LogEntry({ entry }) {
  const hasDeath = entry.deaths && entry.deaths.length > 0
  const hasBirth = entry.newborns && entry.newborns.length > 0
  const isMilestone = entry.milestone
  const isDrama = entry.dramaticEvent
  const borderColor = hasDeath ? 'border-red-900' : hasBirth ? 'border-green-900' : isMilestone ? 'border-purple-900' : isDrama ? 'border-amber-900' : 'border-gray-900'
  const tickColor = hasDeath ? 'text-red-500' : hasBirth ? 'text-green-500' : isMilestone ? 'text-purple-500' : isDrama ? 'text-amber-500' : 'text-gray-600'
  return (
    <div className={`border-l-2 ${borderColor} pl-3 py-2 mb-3`}>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className={`text-xs font-mono font-bold ${tickColor}`}>TICK {entry.tick}</span>
        <span className="text-xs text-gray-700 font-mono">{entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : ''}</span>
        {isDrama && <span className="text-xs text-amber-600 font-mono">⚡ EVENT</span>}
        {hasBirth && <span className="text-xs text-green-600 font-mono">◉ BIRTH</span>}
        {hasDeath && <span className="text-xs text-red-600 font-mono">✝ DEATH</span>}
        {isMilestone && <span className="text-xs text-purple-600 font-mono">★ MILESTONE</span>}
      </div>
      <p className="text-sm text-gray-300 leading-relaxed">{entry.log}</p>
      {entry.dramaticEvent && entry.dramaticEvent !== 'null' && <p className="text-xs text-amber-500 mt-1 font-mono">⚡ {entry.dramaticEvent}</p>}
      {entry.milestone && entry.milestone !== 'null' && <p className="text-xs text-purple-400 mt-1 font-mono">★ {entry.milestone}</p>}
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
  const [showPaste, setShowPaste] = useState(true)
  const [bmCopied, setBmCopied] = useState(false)
  const [showBmModal, setShowBmModal] = useState(false)
  const [bmCode, setBmCode] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)
  const intervalRef = useRef(null)

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state')
      const data = await res.json()
      if (data.state) setState(data.state)
      if (data.logs) setLogs(data.logs)
      setLastUpdated(new Date())
    } catch (e) { console.error('Fetch error:', e) }
    finally { setLoading(false) }
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
      let raw = pasteText.trim()
      // Strip markdown fences
      const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
      if (fenced) raw = fenced[1].trim()
      // Find first {
      if (!raw.startsWith('{')) {
        const idx = raw.indexOf('{')
        if (idx > -1) raw = raw.slice(idx)
      }
      // Find matching closing brace
      let depth = 0, end = -1
      for (let i = 0; i < raw.length; i++) {
        if (raw[i] === '{') depth++
        else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break } }
      }
      if (end > -1) raw = raw.slice(0, end + 1)
      const parsed = JSON.parse(raw)
      if (parsed.tick === undefined) {
        setPasteStatus('error: missing "tick" field — make sure you copied Grok\'s full JSON response')
        return
      }
      if (!parsed.worldState) {
        setPasteStatus('error: missing "worldState" — paste the full JSON Grok gave you')
        return
      }
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
        setTimeout(() => setPasteStatus(null), 4000)
      } else {
        setPasteStatus('error: ' + (data.error || 'server error'))
      }
    } catch (e) {
      setPasteStatus('error: ' + e.message)
    }
  }

  const handleReset = async () => {
    if (!confirm('This will END the current world and erase ALL history from the database.\n\nAre you absolutely sure?')) return
    setLoading(true)
    const res = await fetch('/api/reset', { method: 'POST', headers: { 'x-worldsim-token': 'worldsim2024' } })
    const data = await res.json()
    if (data.success) {
      setState(null)
      setLogs([])
      setLoading(false)
      alert('World reset complete. KV database cleared.\n\nPaste a new Grok tick 0 to start fresh.')
    } else {
      setLoading(false)
      alert('Reset failed: ' + (data.error || 'unknown error'))
    }
  }

  const copyBookmarklet = () => {
    const bm = buildBookmarklet(window.location.origin)
    setBmCode(bm)
    setShowBmModal(true)
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
  const civColors = { primitive:'text-orange-400 border-orange-900', agricultural:'text-green-400 border-green-900', industrial:'text-blue-400 border-blue-900', digital:'text-cyan-400 border-cyan-900', transcendent:'text-purple-400 border-purple-900' }

  return (
    <div className="min-h-screen bg-void font-display" style={{ background: '#05050a' }}>

      {/* HEADER */}
      <div className="border-b border-gray-900 px-6 py-5" style={{ background: '#0a0a12' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#a78bfa', textShadow: '0 0 20px #7c3aed55' }}>WorldSim-1</h1>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-green-900 bg-green-950/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <span className="text-xs text-green-400 font-mono">LIVE</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">A living digital world. 48 hours. Anything can happen.</p>
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              {state ? (
                <>
                  <div className="text-center"><div className="text-2xl font-bold text-white font-mono">{state.tick || 0}</div><div className="text-xs text-gray-600 font-mono uppercase tracking-wider">Tick</div></div>
                  <div className="text-center"><div className="text-2xl font-bold text-purple-400 font-mono">{ws?.population || livingPeople.length}</div><div className="text-xs text-gray-600 font-mono uppercase tracking-wider">Population</div></div>
                  <div className="text-center"><div className="text-sm font-bold text-amber-400 font-mono">{ws?.year || 'Year 0'}</div><div className="text-xs text-gray-600 font-mono uppercase tracking-wider">World Time</div></div>
                  {ws?.civilizationLevel && <div className={`text-xs font-mono px-2 py-1 rounded border uppercase tracking-widest ${civColors[ws.civilizationLevel] || 'text-gray-400 border-gray-800'}`}>{ws.civilizationLevel}</div>}
                </>
              ) : (
                <div className="text-sm text-gray-600 font-mono">No world running yet</div>
              )}
              <button onClick={handleReset} className="text-xs text-gray-700 hover:text-red-500 font-mono border border-gray-900 hover:border-red-900 px-2 py-1 rounded transition-colors">⊗ Reset World</button>
            </div>
          </div>
          {lastUpdated && <p className="text-xs text-gray-700 font-mono mt-2">Last synced {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 15s</p>}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ALWAYS SHOW CONTROLS */}
        <div className="mb-6 rounded-xl border border-purple-900 p-5" style={{ background: 'rgba(124,58,237,0.06)' }}>
          <h2 className="text-sm font-mono uppercase tracking-widest text-purple-400 mb-4">
            {state ? '⚡ Controls' : '⚡ Start Your World'}
          </h2>

          {/* Step grid — only when no world */}
          {!state && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              {[
                { n:'01', title:'Open Grok', desc:'Go to grok.com in another tab. Log in with your SuperGrok subscription.' },
                { n:'02', title:'Copy the World Prompt', desc:'Click "Copy World Prompt" below. Paste it into a new Grok chat. Grok creates the first people.' },
                { n:'03', title:'Copy Grok\'s response', desc:'After Grok replies with a big block of JSON text — select all of it and copy it.' },
                { n:'04', title:'Paste here & watch', desc:'Paste the JSON into the box below and click Send. Your world comes alive on this page.' },
              ].map(s => (
                <div key={s.n} className="flex gap-3 p-3 rounded-lg border border-gray-900" style={{ background: '#0a0a12' }}>
                  <span className="text-purple-700 font-mono font-bold text-lg leading-none">{s.n}</span>
                  <div><p className="text-sm font-semibold text-white mb-0.5">{s.title}</p><p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p></div>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button onClick={copyPrompt} className="px-4 py-2 rounded-lg text-sm font-mono transition-colors text-white" style={{ background: '#6d28d9' }}>
              {promptCopied ? '✓ Prompt Copied!' : '📋 Copy World Prompt'}
            </button>
            <button onClick={copyBookmarklet} className="px-4 py-2 rounded-lg text-sm font-mono transition-colors text-amber-100" style={{ background: '#92400e' }}>
              {bmCopied ? '✓ Copied! Now add to bookmarks bar' : '🔖 Copy Bookmarklet'}
            </button>
            <button onClick={() => setShowPrompt(!showPrompt)} className="px-4 py-2 rounded-lg border border-gray-800 text-gray-500 text-sm font-mono transition-colors hover:text-gray-300">
              {showPrompt ? '▲ Hide' : '▼ Show'} Prompt Text
            </button>
          </div>

          {/* Bookmarklet instructions */}
          <div className="mt-4 p-3 rounded-lg border border-gray-900 text-xs text-gray-600 font-mono leading-relaxed" style={{ background: '#0a0a12' }}>
            <span className="text-amber-600">Bookmarklet = faster workflow.</span> Click "Copy Bookmarklet" above → right-click your browser bookmarks bar → Add bookmark → Name: "WorldSim Send" → paste the URL → Save. Then while on grok.com, click it after each Grok response — no more manual pasting.
          </div>
        </div>

        {/* WORLD PROMPT */}
        {showPrompt && (
          <div className="mb-6 rounded-xl border border-gray-800 p-4" style={{ background: '#0a0a12' }}>
            <p className="text-xs text-gray-500 font-mono mb-3 uppercase tracking-wider">World Genesis Prompt — paste this into Grok</p>
            <pre className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto font-mono">{GROK_PROMPT}</pre>
          </div>
        )}

        {/* PASTE BOX — always visible until world starts */}
        <div className="mb-6 rounded-xl border border-gray-800 p-4" style={{ background: '#0a0a12' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-400 font-mono uppercase tracking-wider">Paste Grok JSON here</p>
            {state && <span className="text-xs text-green-500 font-mono">World is running — paste next tick to advance</span>}
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={'Paste Grok\'s full response here...\n\nIt should start with { "tick": 0, "worldState": { ... and have lots of JSON inside.\n\nDon\'t worry if there is extra text — we will extract the JSON automatically.'}
            className="w-full h-36 rounded-lg p-3 text-xs text-gray-300 font-mono resize-none focus:outline-none placeholder-gray-700 border border-gray-800 focus:border-purple-700"
            style={{ background: '#000008' }}
          />
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <button
              onClick={handlePaste}
              disabled={!pasteText.trim() || pasteStatus === 'sending'}
              className="px-5 py-2 rounded-lg text-white text-sm font-mono transition-colors disabled:opacity-40"
              style={{ background: '#6d28d9' }}
            >
              {pasteStatus === 'sending' ? '⟳ Sending...' : '→ Send to World'}
            </button>
            {pasteStatus && pasteStatus !== 'sending' && (
              <span className={`text-xs font-mono ${pasteStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {pasteStatus === 'success' ? '✓ Tick received! World updated.' : '✗ ' + pasteStatus}
              </span>
            )}
          </div>
        </div>

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

            {/* LEFT — RESOURCES */}
            <div className="lg:col-span-1 space-y-6">
              <div className="rounded-xl border border-gray-900 p-4" style={{ background: '#0f0f1a' }}>
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

              {ws?.locations && ws.locations.length > 0 && (
                <div className="rounded-xl border border-gray-900 p-4" style={{ background: '#0f0f1a' }}>
                  <h2 className="text-xs font-mono uppercase tracking-widest text-gray-600 mb-3">Built Locations</h2>
                  {ws.locations.map((loc, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2 p-2 rounded border border-gray-900" style={{ background: '#0a0a12' }}>
                      <span className="text-lg leading-none">{loc.type==='camp'?'⛺':loc.type==='city'?'🏙':loc.type==='farm'?'🌾':loc.type==='lab'?'⚗️':'🏗'}</span>
                      <div>
                        <p className="text-xs font-semibold text-gray-300">{loc.name}</p>
                        <p className="text-xs text-gray-600 font-mono">{loc.type} · Built by {loc.builtBy} · Tick {loc.tick}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {ws?.activeEvents && ws.activeEvents.length > 0 && (
                <div className="rounded-xl border border-amber-900 p-4" style={{ background: 'rgba(120,53,15,0.1)' }}>
                  <h2 className="text-xs font-mono uppercase tracking-widest text-amber-700 mb-3">Active Events</h2>
                  {ws.activeEvents.map((ev, i) => <p key={i} className="text-xs text-amber-400 font-mono mb-1">⚡ {ev}</p>)}
                </div>
              )}
            </div>

            {/* MIDDLE — PEOPLE */}
            <div className="lg:col-span-1">
              <h2 className="text-xs font-mono uppercase tracking-widest text-gray-600 mb-4">
                The People <span className="text-purple-700">({livingPeople.length} living{deadPeople.length > 0 ? `, ${deadPeople.length} dead` : ''})</span>
              </h2>
              <div className="space-y-3">
                {livingPeople.map((p, i) => <PersonCard key={p.name + i} person={p} />)}
                {deadPeople.map((p, i) => <PersonCard key={p.name + i + 'd'} person={p} />)}
              </div>
            </div>

            {/* RIGHT — LOG */}
            <div className="lg:col-span-1">
              <h2 className="text-xs font-mono uppercase tracking-widest text-gray-600 mb-4">
                World Chronicle <span className="text-gray-700">({logs.length} entries)</span>
              </h2>
              <div className="space-y-1 max-h-screen overflow-y-auto pr-1">
                {state?.worldLog && logs.length === 0 && (
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

      {/* BOOKMARKLET MODAL */}
      {showBmModal && (
        <div
          onClick={() => setShowBmModal(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background:'#0f0f1a', border:'1px solid #4c1d95', borderRadius:'16px', padding:'2rem', maxWidth:'560px', width:'100%' }}
          >
            <h2 style={{ color:'#a78bfa', fontSize:'18px', fontWeight:600, marginBottom:'8px', fontFamily:'monospace' }}>Install Bookmarklet</h2>
            <p style={{ color:'#6b7280', fontSize:'13px', marginBottom:'20px', lineHeight:'1.6' }}>
              Copy the URL below. Then right-click your bookmarks bar → <b style={{color:'#d1d5db'}}>Add bookmark</b> → Name it <b style={{color:'#d1d5db'}}>WorldSim Send</b> → paste this as the URL → Save.
            </p>
            <p style={{ color:'#9ca3af', fontSize:'12px', marginBottom:'6px', fontFamily:'monospace', textTransform:'uppercase', letterSpacing:'0.05em' }}>Bookmarklet URL — select all and copy:</p>
            <textarea
              readOnly
              onFocus={e => e.target.select()}
              onClick={e => e.target.select()}
              value={bmCode}
              data-bm-textarea="1"
              style={{ width:'100%', height:'80px', background:'#000', border:'1px solid #374151', borderRadius:'8px', padding:'10px', fontSize:'11px', fontFamily:'monospace', color:'#86efac', resize:'none', marginBottom:'16px', boxSizing:'border-box' }}
            />
            <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
              <button
                onClick={() => {
                  const ta = document.querySelector('[data-bm-textarea]')
                  if (ta) { ta.select(); document.execCommand('copy'); setBmCopied(true); setTimeout(() => setBmCopied(false), 3000) }
                }}
                style={{ background:'#6d28d9', color:'white', border:'none', borderRadius:'8px', padding:'10px 20px', fontSize:'13px', fontFamily:'monospace', cursor:'pointer' }}
              >
                {bmCopied ? '✓ Copied!' : 'Copy URL'}
              </button>
              <button
                onClick={() => setShowBmModal(false)}
                style={{ background:'transparent', color:'#6b7280', border:'1px solid #374151', borderRadius:'8px', padding:'10px 20px', fontSize:'13px', fontFamily:'monospace', cursor:'pointer' }}
              >
                Close
              </button>
            </div>
            <p style={{ color:'#4b5563', fontSize:'12px', marginTop:'16px', lineHeight:'1.5', fontFamily:'monospace' }}>
              After installing: go to grok.com → run the world prompt → after Grok replies, click <b style={{color:'#92400e'}}>WorldSim Send</b> in your bookmarks bar → world updates here automatically.
            </p>
          </div>
        </div>
      )}

      <div className="border-t border-gray-900 mt-12 px-6 py-4 text-center">
        <p className="text-xs text-gray-800 font-mono">WORLDSIM-1 · Powered by SuperGrok · No API key required</p>
      </div>
    </div>
  )
}
