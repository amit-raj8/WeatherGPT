import fs from 'node:fs'
import path from 'node:path'

// Load .env
const envPath = path.resolve(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const [k, ...v] = line.split('=')
  if (k && v.length) env[k.trim()] = v.join('=').trim()
}

const key = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY
console.log('Testing Gemini API with key prefix:', key.slice(0, 8))

const modelsToTest = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-3.6-flash'
]

for (const m of modelsToTest) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`
  const start = performance.now()
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Give current weather forecast for Mumbai in 1 sentence.' }] }]
      })
    })
    const dur = (performance.now() - start).toFixed(0)
    if (res.ok) {
      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      console.log(`✓ Model ${m}: HTTP ${res.status} in ${dur}ms -> Response: "${text.trim().slice(0, 60)}..."`)
    } else {
      console.log(`✗ Model ${m}: HTTP ${res.status} in ${dur}ms`)
    }
  } catch (err) {
    console.log(`✗ Model ${m}: error: ${err.message}`)
  }
}
