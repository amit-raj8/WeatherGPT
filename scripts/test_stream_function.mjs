import fs from 'node:fs'
import path from 'node:path'

const envPath = path.resolve(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const [k, ...v] = line.split('=')
  if (k && v.length) env[k.trim()] = v.join('=').trim()
}
const key = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY

const model = 'gemini-flash-lite-latest'
const start = performance.now()

async function testStream(prompt) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 1000 }
    })
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let accumulated = ''
  let firstChunkMs = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.slice(6).trim()
        if (!jsonStr) continue
        try {
          const parsed = JSON.parse(jsonStr)
          const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
          if (chunkText) {
            if (!firstChunkMs) {
              firstChunkMs = performance.now() - start
              console.log(`✓ First token in ${firstChunkMs.toFixed(0)}ms!`)
            }
            accumulated += chunkText
          }
        } catch {}
      }
    }
  }
  console.log(`✓ Stream complete in ${(performance.now() - start).toFixed(0)}ms. Total text length: ${accumulated.length}`)
  return accumulated
}

await testStream('Give today weather forecast for Mumbai')
