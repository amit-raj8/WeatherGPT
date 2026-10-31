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

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: 'What is the weather in Delhi?' }] }],
    generationConfig: { maxOutputTokens: 1000 }
  })
})

console.log(`HTTP response status: ${res.status} in ${(performance.now() - start).toFixed(0)}ms`)

const reader = res.body.getReader()
const decoder = new TextDecoder()
let firstChunkTime = 0
let totalChars = 0

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  if (!firstChunkTime) {
    firstChunkTime = performance.now()
    console.log(`First SSE chunk received in ${(firstChunkTime - start).toFixed(0)}ms!`)
  }
  const str = decoder.decode(value, { stream: true })
  totalChars += str.length
}

console.log(`Total time: ${(performance.now() - start).toFixed(0)}ms, total response size: ${totalChars} bytes`)
