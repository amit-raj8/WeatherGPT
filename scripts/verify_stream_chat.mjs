import fs from 'node:fs'
import path from 'node:path'

// Test generateWeatherResponseStream via direct import or script simulation
const envPath = path.resolve(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const [k, ...v] = line.split('=')
  if (k && v.length) env[k.trim()] = v.join('=').trim()
}
const key = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY

const model = 'gemini-flash-lite-latest'
const queries = [
  'What is the weather in Delhi?',
  'aaj dhanbad ka mausam kaisa hoga',
  'What are the active cyclone alerts?'
]

for (const q of queries) {
  const start = performance.now()
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: q }] }],
      generationConfig: { maxOutputTokens: 1000 }
    })
  })

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let accumulated = ''
  let firstTokenTime = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6))
          const t = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || ''
          if (t) {
            if (!firstTokenTime) {
              firstTokenTime = performance.now() - start
            }
            accumulated += t
          }
        } catch {}
      }
    }
  }

  const totalTime = performance.now() - start
  console.log(`✓ Query: "${q}"`)
  console.log(`  First token received in: ${firstTokenTime.toFixed(0)} ms (INSTANT!)`)
  console.log(`  Full reply streamed in: ${totalTime.toFixed(0)} ms | Total chars: ${accumulated.length}`)
  console.log(`  Reply preview: ${accumulated.slice(0, 120).replace(/\n/g, ' ')}...`)
  console.log('----------------------------------------------------')
}
