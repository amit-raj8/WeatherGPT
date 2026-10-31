function detectQueryLanguage(userPrompt, selectedLangCode = 'en') {
  const text = (userPrompt || '').trim()
  const lower = text.toLowerCase()

  // 1. Script-based checks (High precision)
  if (/[\u09F0\u09F1]/.test(text) || (selectedLangCode === 'as' && /[\u0980-\u09FF]/.test(text))) {
    return 'as'
  }
  if (/[\u0980-\u09FF]/.test(text)) {
    return 'bn'
  }
  if (/[\u0A00-\u0A7F]/.test(text)) {
    return 'pa'
  }
  if (/[\u0A80-\u0AFF]/.test(text)) {
    return 'gu'
  }
  if (/[\u0B00-\u0B7F]/.test(text)) {
    return 'or'
  }
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return 'ta'
  }
  if (/[\u0C00-\u0C7F]/.test(text)) {
    return 'te'
  }
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return 'kn'
  }
  if (/[\u0D00-\u0D7F]/.test(text)) {
    return 'ml'
  }
  if (/[\u0900-\u097F]/.test(text)) {
    // Check Bhojpuri markers in Devanagari
    if (/(कइसन|बा\b|बावे|रउआ|रउरा|तोहार|हमार|होई|बरसी|कइसे|का हाल)/.test(text)) {
      return 'bho'
    }
    // Check Marathi markers in Devanagari
    if (/(आहे|नाही|कसे|कसा|पाऊस|पडेल|हवामान|होईल|काय\b|सांगा|कधी)/.test(text) || selectedLangCode === 'mr') {
      return 'mr'
    }
    return 'hi'
  }

  // 2. Romanized / Latin script checks
  // Check Romanized Bhojpuri
  if (/\b(kaisan|ba|bawe|hamaar|tohar|raua|raura|ka haal|barsi|barsat hoi|kaise ba)\b/i.test(lower)) {
    return 'bho'
  }

  // Check Romanized Bengali
  if (/\b(kemon|abohawa|brishti|hobe|aajke|ekhon|jhor|banya|kothay|bhalo)\b/i.test(lower)) {
    return 'bn'
  }

  // Check Romanized Marathi
  if (/\b(kase aahe|kasa aahe|havaman|paus|padel|kadhi|sang|ahe|nahi|pune madhe)\b/i.test(lower) || (selectedLangCode === 'mr' && !/\b(what|tell me|how is|is it|temperature)\b/i.test(lower))) {
    return 'mr'
  }

  // Check explicit English patterns ("tell me what is", "how is", "weather in", "will it rain", "what is the temperature")
  const englishMatches = lower.match(/\b(tell|me|what|is|the|weather|right|now|today|tomorrow|how|will|it|rain|temperature|temp|forecast|forecasts|climate|current|conditions?|in|at|for|please)\b/gi) || []
  const hinglishMatches = lower.match(/\b(kaisa|kaisi|kaise|hoga|hogi|rahega|rahegi|mausam|barsat|barish|baarish|tapman|taapman|pani|hawa|thand|garmi|dhoop|batao|bataiye|kya|kyun|kab|aaj|kal|parson)\b/gi) || []

  // If query contains strong English grammar and no Hinglish markers, it is definitely English
  if (englishMatches.length > 0 && hinglishMatches.length === 0) {
    return 'en'
  }

  // If Hinglish markers outweigh English, it is Hindi
  if (hinglishMatches.length > 0 && hinglishMatches.length >= englishMatches.length) {
    return 'hi'
  }

  // Fallback to selectedLanguageCode or 'en'
  return selectedLangCode || 'en'
}

// Test cases:
const testCases = [
  { input: 'tell me what is weather right now in kolkata', lang: 'en', expected: 'en' },
  { input: 'what is the temperature in Delhi today', lang: 'en', expected: 'en' },
  { input: 'will it rain in Mumbai tomorrow', lang: 'en', expected: 'en' },
  { input: 'kolkata ka mausam kaisa hai', lang: 'en', expected: 'hi' },
  { input: 'aaj dhanbad me barish hogi kya', lang: 'en', expected: 'hi' },
  { input: 'kolkata me mausam kaisan ba', lang: 'en', expected: 'bho' },
  { input: 'आज कोलकाता में मौसम कइसन बा', lang: 'en', expected: 'bho' },
  { input: 'কলকাতায় এখন আবহাওয়া কেমন', lang: 'en', expected: 'bn' },
  { input: 'kolkata-r abohawa kemon aajke', lang: 'en', expected: 'bn' },
  { input: 'पुण्यात आज हवामान कसे आहे', lang: 'en', expected: 'mr' },
  { input: 'pune madhe havaman kase aahe', lang: 'en', expected: 'mr' }
]

console.log('Testing detectQueryLanguage:')
let allPassed = true
for (const tc of testCases) {
  const res = detectQueryLanguage(tc.input, tc.lang)
  const pass = res === tc.expected
  if (!pass) allPassed = false
  console.log(`${pass ? '✓' : '✗'} "${tc.input}" => detected: ${res} (expected: ${tc.expected})`)
}
console.log('All passed:', allPassed)
