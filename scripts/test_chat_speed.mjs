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

const BASE_SYSTEM_PROMPT = `You are WeatherGPT, an operational AI meteorological and climate intelligence console developed for India (SIH26068, Theme: Disaster Management, Team: ZeroLatency). Provide authoritative forecasts for Indian cities. Format data in clean Markdown tables and bullet points. ZERO THINKING PROCESS EXPOSURE: NEVER output internal thoughts or thinking steps. Jump directly to the final markdown weather report.`

const queries = [
  'What is the weather in Delhi?',
  'aaj dhanbad ka mausam kaisa hoga',
  'will it rain today in Mumbai'
]

const model = 'gemini-flash-lite-latest'

for (const q of queries) {
  const start = performance.now()
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: BASE_SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: q }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1000
      }
    })
  })
  const dur = (performance.now() - start).toFixed(0)
  if (res.ok) {
    const d = await res.json()
    const part = d.candidates?.[0]?.content?.parts?.[0]
    const text = part?.text || ''
    const thought = part?.thought || ''
    console.log(`Query "${q}" took ${dur}ms, length: ${text.length} chars`)
    console.log('Sample output:', text.slice(0, 150))
    console.log('---')
  } else {
    console.log(`Failed ${res.status} in ${dur}ms`)
  }
}
