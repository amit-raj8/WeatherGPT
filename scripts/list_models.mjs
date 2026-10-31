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
const flash = data.models.filter(m => m.name.includes('flash') || m.name.includes('pro'))
for (const m of flash.slice(0, 10)) {
  console.log(m.name, 'Methods:', m.supportedGenerationMethods)
}
