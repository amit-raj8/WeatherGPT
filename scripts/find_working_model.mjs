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

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
const data = await res.json()
const genModels = data.models.filter(m => m.supportedGenerationMethods?.includes('generateContent'))

console.log('Testing', genModels.length, 'models...')
for (const m of genModels) {
  const modelName = m.name.replace('models/', '')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
      })
    })
    if (r.ok) {
      console.log('SUCCESS:', modelName)
    } else {
      console.log('FAIL:', modelName, r.status)
    }
  } catch (e) {
    console.log('ERR:', modelName, e.message)
  }
}
