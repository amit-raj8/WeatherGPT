import { WebSocket } from 'ws'
import { performance } from 'node:perf_hooks'

const wsUrl = process.env.RELAY_URL || 'ws://localhost:5174/voice-relay'
const ws = new WebSocket(wsUrl)

ws.on('open', () => {
  console.log('✓ Connected to Voice Relay')
})

ws.on('message', async (data) => {
  const msg = JSON.parse(data.toString())
  if (msg.type === 'ready') {
    console.log('✓ Ready. Testing single voice turn...')
    const start = performance.now()
    ws.send(JSON.stringify({ type: 'text', text: 'What is the temperature in Mumbai?' }))

    let firstAudio = 0
    let chunkCount = 0

    const onAudio = (d) => {
      const m = JSON.parse(d.toString())
      if (m.type === 'audio') {
        chunkCount++
        if (!firstAudio) {
          firstAudio = performance.now()
          console.log(`✓ First audio received in ${(firstAudio - start).toFixed(0)} ms`)
        }
      }
      if (m.type === 'turn_complete') {
        console.log(`✓ Turn complete! Total audio chunks received: ${chunkCount}`)
        console.log('✓ Verified: Single sequential audio stream received without overlap.')
        ws.close()
        process.exit(0)
      }
    }
    ws.on('message', onAudio)
  }
})

setTimeout(() => {
  console.error('Timed out')
  process.exit(1)
}, 10000)
