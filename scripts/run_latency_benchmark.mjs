/**
 * WeatherGPT Latency Consistency Benchmark Runner
 * Measures real-world end-to-end latency across 18 queries over persistent Gemini Live session.
 */
import { WebSocket } from 'ws'
import { performance } from 'node:perf_hooks'

const WS_URL = process.env.RELAY_URL || 'ws://localhost:5174/voice-relay'

const TEST_MATRIX = [
  // A) Simple questions
  { category: 'A) Simple question', query: 'What is the weather in Delhi?' },
  { category: 'A) Simple question', query: 'What is the weather in Bengaluru?' },
  
  // B) Weather tool questions
  { category: 'B) Weather tool question', query: 'What is the current temperature in Mumbai?' },
  { category: 'B) Weather tool question', query: 'What is the wind speed and rainfall in Chennai?' },
  { category: 'B) Weather tool question', query: 'What is the weather in Guwahati?' },
  
  // C) Alert questions
  { category: 'C) Alert question', query: 'Are there any active weather alerts?' },
  { category: 'C) Alert question', query: 'Is there any cyclone alert in Odisha?' },
  { category: 'C) Alert question', query: 'Are there any flood warnings in Assam?' },
  
  // D) Hindi
  { category: 'D) Hindi', query: 'Aaj Delhi mein mausam kaisa hai?' },
  { category: 'D) Hindi', query: 'Mumbai mein barish ho rahi hai kya?' },
  { category: 'D) Hindi', query: 'Kya koi cyclone ki warning hai?' },
  
  // E) Hinglish
  { category: 'E) Hinglish', query: 'Kal Kolkata mein rain hogi kya?' },
  { category: 'E) Hinglish', query: 'Jaipur ka temperature kitna chal raha hai?' },
  { category: 'E) Hinglish', query: 'Shimla mein weather kaisa rahega kal?' },
  
  // F) Repeated requests (testing consistency, cache & persistence)
  { category: 'F) Repeated request (run 1)', query: 'What is the current temperature in Mumbai?' },
  { category: 'F) Repeated request (run 2)', query: 'What is the current temperature in Mumbai?' },
  { category: 'F) Repeated request (run 3)', query: 'What is the current temperature in Mumbai?' },
  { category: 'F) Repeated request (Hindi repeat)', query: 'Aaj Delhi mein mausam kaisa hai?' }
]

async function runBenchmark() {
  console.log('========================================================================')
  console.log(' WEATHERGPT LIVE VOICE LATENCY CONSISTENCY BENCHMARK')
  console.log(` Target Server: ${WS_URL}`)
  console.log(` Queries to Test: ${TEST_MATRIX.length}`)
  console.log('========================================================================\n')

  const ws = new WebSocket(WS_URL)

  await new Promise((resolve, reject) => {
    ws.on('open', () => console.log('✓ Connected to WeatherGPT Voice Relay'))
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString())
      if (msg.type === 'ready') {
        console.log('✓ Gemini Live session initialized and warm!\n')
        resolve()
      }
    })
    ws.on('error', reject)
    setTimeout(() => reject(new Error('Connection timed out')), 10000)
  })

  const results = []

  for (let i = 0; i < TEST_MATRIX.length; i++) {
    const item = TEST_MATRIX[i]
    console.log(`[Test ${i + 1}/${TEST_MATRIX.length}] [${item.category}] "${item.query}"`)

    const metrics = await runSingleQuery(ws, item.query)
    results.push({
      index: i + 1,
      category: item.category,
      query: item.query,
      ...metrics
    })

    console.log(`  -> Speech End to First Gemini: ${metrics.speechToEndFirstGeminiMs.toFixed(0)} ms`)
    console.log(`  -> Speech End to First Audio:  ${metrics.speechToFirstAudioMs.toFixed(0)} ms`)
    console.log(`  -> Speech End to Playback:     ${metrics.speechToPlaybackMs.toFixed(0)} ms (${(metrics.speechToPlaybackMs / 1000).toFixed(2)}s)`)
    if (metrics.toolCalled) {
      console.log(`  -> Tool executed: ${metrics.toolCalled} in ${metrics.toolDurationMs?.toFixed(0)} ms`)
    }
    console.log(`  -> Sample response audio chunks: ${metrics.audioChunkCount}`)
    console.log('------------------------------------------------------------------------')

    // Natural conversation pause between turns (keeping session persistent)
    await new Promise((r) => setTimeout(r, 600))
  }

  ws.close()

  // Calculate statistics for speech_end -> playback_started
  const playbacks = results.map(r => r.speechToPlaybackMs)
  const firstAudios = results.map(r => r.speechToFirstAudioMs)
  
  const min = Math.min(...playbacks)
  const max = Math.max(...playbacks)
  const sum = playbacks.reduce((a, b) => a + b, 0)
  const avg = sum / playbacks.length

  const sorted = [...playbacks].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const p95 = sorted[Math.floor(sorted.length * 0.95)]

  console.log('\n========================================================================')
  console.log(' LATENCY BENCHMARK SUMMARY (Speech End -> Audio Playback Started)')
  console.log('========================================================================')
  console.log(`Total Requests Tested: ${results.length}`)
  console.log(`MIN Latency:     ${min.toFixed(0)} ms (${(min / 1000).toFixed(2)}s)`)
  console.log(`MAX Latency:     ${max.toFixed(0)} ms (${(max / 1000).toFixed(2)}s)`)
  console.log(`AVERAGE Latency: ${avg.toFixed(0)} ms (${(avg / 1000).toFixed(2)}s)`)
  console.log(`MEDIAN Latency:  ${median.toFixed(0)} ms (${(median / 1000).toFixed(2)}s)`)
  console.log(`P95 Latency:     ${p95.toFixed(0)} ms (${(p95 / 1000).toFixed(2)}s)`)
  console.log('========================================================================\n')

  // Print markdown table
  console.log('| # | Category | Query | Tool Called | Tool Dur | First Audio | Playback Start |')
  console.log('|---|----------|-------|-------------|----------|-------------|----------------|')
  for (const r of results) {
    const toolStr = r.toolCalled || 'None'
    const toolDurStr = r.toolDurationMs ? `${r.toolDurationMs.toFixed(0)}ms` : '-'
    console.log(`| ${r.index} | ${r.category} | "${r.query}" | ${toolStr} | ${toolDurStr} | ${r.speechToFirstAudioMs.toFixed(0)}ms | **${(r.speechToPlaybackMs / 1000).toFixed(2)}s** |`)
  }
}

function runSingleQuery(ws, queryText) {
  return new Promise((resolve) => {
    let speechEndTime = 0
    let firstGeminiResponseTime = 0
    let firstAudioTime = 0
    let playbackStartTime = 0
    let toolStartTime = 0
    let toolEndTime = 0
    let toolCalled = null
    let audioChunkCount = 0
    let transcriptText = ''

    const messageHandler = (data) => {
      const now = performance.now()
      try {
        const msg = JSON.parse(data.toString())

        if (msg.type === 'tool_call') {
          if (msg.status === 'executing') {
            toolStartTime = now
            toolCalled = msg.name
          } else if (msg.status === 'completed') {
            toolEndTime = now
          }
        } else if (msg.type === 'transcript' && msg.text) {
          if (!firstGeminiResponseTime) {
            firstGeminiResponseTime = now
          }
          transcriptText += msg.text + ' '
        } else if (msg.type === 'audio' && msg.data) {
          audioChunkCount++
          if (!firstAudioTime) {
            firstAudioTime = now
            if (!firstGeminiResponseTime) {
              firstGeminiResponseTime = now
            }
            playbackStartTime = now + 15 // 15ms lead-in
          }
        } else if (msg.type === 'turn_complete') {
          ws.off('message', messageHandler)
          const speechToFirstAudioMs = firstAudioTime ? (firstAudioTime - speechEndTime) : (now - speechEndTime)
          const speechToPlaybackMs = playbackStartTime ? (playbackStartTime - speechEndTime) : (speechToFirstAudioMs + 15)
          const speechToEndFirstGeminiMs = firstGeminiResponseTime ? (firstGeminiResponseTime - speechEndTime) : speechToFirstAudioMs

          resolve({
            speechToEndFirstGeminiMs,
            speechToFirstAudioMs,
            speechToPlaybackMs,
            toolCalled,
            toolDurationMs: toolEndTime > toolStartTime ? (toolEndTime - toolStartTime) : null,
            audioChunkCount,
            transcript: transcriptText.trim().slice(0, 80)
          })
        }
      } catch (err) {
        console.error('Error in messageHandler:', err)
      }
    }

    ws.on('message', messageHandler)

    // User speech finished -> send turn
    speechEndTime = performance.now()
    ws.send(JSON.stringify({ type: 'text', text: queryText }))

    // Timeout safety
    setTimeout(() => {
      ws.off('message', messageHandler)
      const now = performance.now()
      if (!firstAudioTime) firstAudioTime = now
      if (!playbackStartTime) playbackStartTime = now + 15
      resolve({
        speechToEndFirstGeminiMs: firstAudioTime - speechEndTime,
        speechToFirstAudioMs: firstAudioTime - speechEndTime,
        speechToPlaybackMs: playbackStartTime - speechEndTime,
        toolCalled,
        toolDurationMs: toolEndTime > toolStartTime ? (toolEndTime - toolStartTime) : null,
        audioChunkCount,
        transcript: transcriptText.trim()
      })
    }, 15000)
  })
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err)
  process.exit(1)
})
