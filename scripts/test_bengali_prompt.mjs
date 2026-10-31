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
Provide authoritative forecasts for Indian cities. Format data in clean Markdown tables and bullet points. ZERO THINKING PROCESS EXPOSURE: NEVER output internal thoughts. Jump directly to the final markdown weather report.`

const langInstruction = `\n\nCRITICAL MULTILINGUAL MANDATE: The user has asked in BENGALI (বাংলা). You MUST answer the query completely in BENGALI (বাংলা). Use standard regional meteorological and farming terms. Maintain clean Markdown tables and bullet points in Bengali. DO NOT EXPOSE ANY THINKING PROCESS.`

const prompt = 'কলকাতায় এখন আবহাওয়া কেমন'

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    system_instruction: { parts: [{ text: BASE_SYSTEM_PROMPT + langInstruction }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 600 }
  })
})

const d = await res.json()
const text = d.candidates?.[0]?.content?.parts?.[0]?.text
console.log('Result for Bengali query:\n')
console.log(text)
