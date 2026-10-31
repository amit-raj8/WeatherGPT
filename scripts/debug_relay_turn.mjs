import { WebSocket } from 'ws'
import { performance } from 'node:perf_hooks'

const wsUrl = process.env.RELAY_URL || 'ws://localhost:5174/voice-relay'
const ws = new WebSocket(wsUrl)
let start = 0
let audioCount = 0

ws.on('message', (data) => {
  const m = JSON.parse(data.toString())
  const now = performance.now()
  if (m.type === 'ready') {
    console.log('Ready. Sending query...')
    start = performance.now()
    ws.send(JSON.stringify({ type: 'text', text: 'What is the temperature in Delhi?' }))
  } else if (m.type === 'audio') {
    audioCount++
    if (audioCount === 1) console.log(`[+${(now - start).toFixed(0)}ms] First audio chunk!`)
  } else if (m.type === 'tool_call') {
    console.log(`[+${(now - start).toFixed(0)}ms] Tool ${m.name} ${m.status}`)
  } else if (m.type === 'turn_complete') {
    console.log(`[+${(now - start).toFixed(0)}ms] TURN COMPLETE! Audio count: ${audioCount}`)
    ws.close()
    process.exit(0)
  } else if (m.type === 'transcript') {
    console.log(`[+${(now - start).toFixed(0)}ms] Transcript: ${m.text}`)
  } else {
    console.log(`[+${(now - start).toFixed(0)}ms] ${m.type}`)
  }
})

setTimeout(() => {
  console.log(`Timeout. Received ${audioCount} audio chunks`)
  ws.close()
  process.exit(1)
}, 10000)
