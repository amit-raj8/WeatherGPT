import { WebSocket } from 'ws'

const wsUrl = process.env.RELAY_URL || 'ws://localhost:5174/voice-relay'
const ws = new WebSocket(wsUrl)

ws.on('open', () => {
  console.log('Connected to relay')
})

ws.on('message', (data) => {
  const m = JSON.parse(data.toString())
  console.log('Received from relay:', m.type, m.text || (m.data ? `[audio chunk ${m.data.length} bytes]` : ''))
  if (m.type === 'ready') {
    console.log('Sending: "tell me what is weather right now in kolkata"')
    ws.send(JSON.stringify({ type: 'text', text: 'tell me what is weather right now in kolkata' }))
  } else if (m.type === 'turn_complete') {
    console.log('Turn complete!')
    ws.close()
    process.exit(0)
  }
})

setTimeout(() => {
  console.log('Timeout after 12s')
  ws.close()
  process.exit(1)
}, 12000)
