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

const BASE_SYSTEM_PROMPT = `You are WeatherGPT, an operational AI meteorological and climate intelligence console developed for India (SIH26068, Theme: Disaster Management, Team: ZeroLatency).
Provide authoritative forecasts for Indian cities. Reference IMD telemetry. NEVER state you do not have real-time data. Always provide structured, authoritative meteorological intelligence in clean Markdown tables and bullet points. ZERO THINKING PROCESS EXPOSURE: NEVER output internal thoughts or analysis steps.`

const model = 'gemini-flash-lite-latest'
const start = performance.now()

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    system_instruction: { parts: [{ text: BASE_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: 'What is the temperature and weather in Delhi today?' }] }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 1000
    }
  })
})

const reader = res.body.getReader()
const decoder = new TextDecoder()
let buffer = ''
let accumulated = ''
let chunkCount = 0

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
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (text) {
          chunkCount++
          accumulated += text
          if (chunkCount === 1) {
            console.log(`[+${(performance.now() - start).toFixed(0)}ms] FIRST CHUNK RECEIVED!`)
          }
        }
      } catch (err) {
        console.warn('JSON parse error:', err.message)
      }
    }
  }
}

console.log(`\nFinished in ${(performance.now() - start).toFixed(0)}ms. Chunks: ${chunkCount}, Total length: ${accumulated.length}`)
console.log('Sample output:\n', accumulated.slice(0, 300))
