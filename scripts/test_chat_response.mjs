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

const model = 'gemini-3-flash-preview'
const start = performance.now()

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [
      { role: 'user', parts: [{ text: 'What is the current weather and 3-day forecast for Delhi?' }] }
    ],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 2500
    }
  })
})

const duration = (performance.now() - start).toFixed(0)
console.log(`Status: ${res.status} in ${duration}ms`)
if (res.ok) {
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  console.log('Generated characters:', text.length)
  console.log('Sample response:\n', text.slice(0, 300))
} else {
  console.log('Error:', await res.text())
}
