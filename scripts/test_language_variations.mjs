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

// Read aiService.ts to see what it does right now
const aiServiceCode = fs.readFileSync(path.resolve(process.cwd(), 'src/services/aiService.ts'), 'utf-8')

// Test queries
const queries = [
  { text: 'tell me what is weather right now in kolkata', lang: 'en', expected: 'English' },
  { text: 'kolkata ka mausam kaisa hai', lang: 'en', expected: 'Hindi' },
  { text: 'kolkata me mausam kaisan ba', lang: 'en', expected: 'Bhojpuri' },
  { text: 'কলকাতায় এখন আবহাওয়া কেমন', lang: 'bn', expected: 'Bengali' }
]

console.log('Testing how regex in aiService currently detects these queries:')
const INDIC_SCRIPT_REGEX = /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/
const oldRegex = /\b(aaj|kal|parson|kaisa|hoga|rahega|mausam|barsat|barish|pani|kheti|dhanbad|patna|ranchi|kolkata)\b/i

for (const q of queries) {
  const isHinglishOrHindi = q.lang === 'hi' || oldRegex.test(q.text) || INDIC_SCRIPT_REGEX.test(q.text)
  console.log(`Query: "${q.text}" -> isHinglishOrHindi: ${isHinglishOrHindi} (Expected language: ${q.expected})`)
}
