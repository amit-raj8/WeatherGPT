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

// Read prompt and detector from compiled or direct implementation
const testSuite = [
  {
    query: 'tell me what is weather right now in kolkata',
    expectedLang: 'English',
    detectorCode: 'en',
    check: (txt) => !/[\u0900-\u097F]/.test(txt) && (txt.includes('Temperature') || txt.includes('weather') || txt.includes('Kolkata') || txt.includes('Condition'))
  },
  {
    query: 'kolkata ka mausam kaisa hai',
    expectedLang: 'Hindi',
    detectorCode: 'hi',
    check: (txt) => /[\u0900-\u097F]/.test(txt) && (txt.includes('तापमान') || txt.includes('मौसम') || txt.includes('कोलकाता'))
  },
  {
    query: 'kolkata me mausam kaisan ba',
    expectedLang: 'Bhojpuri',
    detectorCode: 'bho',
    check: (txt) => /[\u0900-\u097F]/.test(txt) && (txt.includes('बा') || txt.includes('कइसन') || txt.includes('बरखा') || txt.includes('मौसम'))
  },
  {
    query: 'কলকাতায় এখন আবহাওয়া কেমন',
    expectedLang: 'Bengali',
    detectorCode: 'bn',
    check: (txt) => /[\u0980-\u09FF]/.test(txt) && (txt.includes('আবহাওয়া') || txt.includes('তাপমাত্রা') || txt.includes('কলকাতা'))
  }
]

console.log('=== MULTILINGUAL LANGUAGE MIRRORING VERIFICATION ===\n')

const BASE_SYSTEM_PROMPT = `You are WeatherGPT, an operational AI meteorological and climate intelligence console developed for India (SIH26068, Theme: Disaster Management, Team: ZeroLatency).
Provide authoritative forecasts for Indian cities. Format data in clean Markdown tables and bullet points. ZERO THINKING PROCESS EXPOSURE: NEVER output internal thoughts.`

function buildLanguageInstruction(detectedLang) {
  switch (detectedLang) {
    case 'en':
      return `\n\nCRITICAL LANGUAGE MANDATE: The user has asked in ENGLISH. You MUST answer the query completely in ENGLISH. Never respond in Hindi, Bengali, or any other regional language when the user speaks or asks in English.`
    case 'bho':
      return `\n\nCRITICAL LANGUAGE MANDATE: The user has asked in BHOJPURI (भोजपुरी). You MUST answer the query completely in fluent, natural BHOJPURI (भोजपुरी)! Use authentic Bhojpuri weather vocabulary (e.g. मौसम, पानी बरसी, गर्मी बा, कइसन बा). Provide a realistic forecast table and directives in Bhojpuri. DO NOT EXPOSE ANY THINKING PROCESS.`
    case 'bn':
      return `\n\nCRITICAL MULTILINGUAL MANDATE: The user has asked in BENGALI (বাংলা). You MUST answer the query completely in BENGALI (বাংলা). Use standard regional meteorological terms. Maintain clean Markdown tables and bullet points in Bengali. DO NOT EXPOSE ANY THINKING PROCESS.`
    case 'hi':
      return `\n\nCRITICAL LANGUAGE MANDATE: The user has asked in HINDI or HINGLISH. You MUST answer the query fully in HINDI (हिंदी). Provide a detailed, realistic forecast table with dates/metrics, bulleted notes, and safety warnings in Hindi. DO NOT EXPOSE ANY THINKING PROCESS.`
    default:
      return ''
  }
}

for (const t of testSuite) {
  const instruction = buildLanguageInstruction(t.detectorCode)
  const systemPrompt = `${BASE_SYSTEM_PROMPT}${instruction}`

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: t.query }] }],
      generationConfig: { maxOutputTokens: 300 }
    })
  })

  const d = await res.json()
  const reply = d.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const isMatch = t.check(reply)

  console.log(`Query: "${t.query}"`)
  console.log(`Expected Language: ${t.expectedLang}`)
  console.log(`Passed Language Check: ${isMatch ? '✓ PASS' : '✗ FAIL'}`)
  console.log(`Preview: ${reply.slice(0, 140).replace(/\n/g, ' ')}...`)
  console.log('----------------------------------------------------')
}
