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

const models = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash',
  'gemini-3-flash-preview'
]

for (const m of models) {
  const start = performance.now()
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Current weather in Delhi in 1 short sentence' }] }],
      generationConfig: { maxOutputTokens: 100 }
    })
  })
  const dur = (performance.now() - start).toFixed(0)
  if (res.ok) {
    const d = await res.json()
    const txt = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    console.log(`✓ ${m}: ${dur}ms -> "${txt}"`)
  } else {
    console.log(`✗ ${m}: ${res.status} in ${dur}ms`)
  }
}
