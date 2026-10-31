import { WebSocket } from 'ws'

const wsUrl = process.env.RELAY_URL || 'ws://localhost:5174/voice-relay'

async function testPrompt(query) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    let transcript = ''

    ws.on('message', (data) => {
      const m = JSON.parse(data.toString())
      if (m.type === 'ready') {
        ws.send(JSON.stringify({ type: 'text', text: query }))
      } else if (m.type === 'transcript') {
        transcript += m.text
      } else if (m.type === 'turn_complete') {
        ws.close()
        resolve(transcript)
      }
    })

    ws.on('error', (err) => {
      ws.close()
      reject(err)
    })

    setTimeout(() => {
      ws.close()
      resolve(transcript || '(timeout)')
    }, 9000)
  })
}

console.log('Testing: "tell me what is weather right now in kolkata"')
const res1 = await testPrompt('tell me what is weather right now in kolkata')
console.log('Result for English query:\n', res1)
