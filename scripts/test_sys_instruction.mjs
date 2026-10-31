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

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [
      { role: 'user', parts: [{ text: 'tell me what is weather right now in kolkata' }] }
    ]
  })
})

const d = await res.json()
console.log(JSON.stringify(d, null, 2))
