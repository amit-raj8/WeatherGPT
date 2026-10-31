import { WebSocket } from 'ws'

const wsUrl = process.env.RELAY_URL || 'ws://localhost:5174/voice-relay'
console.log(`Testing connection to ${wsUrl}...`)

const ws = new WebSocket(wsUrl)

ws.on('open', () => {
  console.log('Connected to Voice Relay successfully!')
})

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString())
  console.log('Received message from Relay:', msg.type, msg.message || '')
  if (msg.type === 'ready') {
    console.log('Gemini Live session is ready and persistent!')
    ws.close()
    process.exit(0)
  }
})

ws.on('error', (err) => {
  console.error('WebSocket error:', err.message)
  process.exit(1)
})

ws.on('close', (code, reason) => {
  console.log(`WebSocket closed: ${code} ${reason}`)
})

setTimeout(() => {
  console.error('Timeout waiting for ready signal.')
  ws.close()
  process.exit(1)
}, 8000)
