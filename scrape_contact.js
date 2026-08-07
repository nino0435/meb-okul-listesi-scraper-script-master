// Her okulun kendi meb.k12.tr sitesinden Adres/Telefon/Faks çekip schools.json'a
// (her okul kaydına adres/telefon/faks alanları olarak) işler.
//
// Pilot (tek il, Adana, 1270 okul) %98.5 başarı oranı gösterdi — bkz. git log.
// Bu, aynı mantığı TÜM 81 ile ölçekler; checkpoint'li (her ilden sonra ara
// kayıt), kesinti olursa --resume ile kaldığı yerden devam eder.
//
// Kullanım:
//   node scrape_contact.js            # baştan başlar
//   node scrape_contact.js --resume   # contact_checkpoint.json'dan devam eder
const fs = require('fs')

const CONCURRENCY = 20
const TIMEOUT_MS = 6000
const CHECKPOINT_FILE = './contact_checkpoint.json'
const OUTPUT_FILE = './schools.json'
const RESUME = process.argv.includes('--resume')

const schools = require('./schools.json')
const provinces = Object.keys(schools).filter((k) => k !== 'ozet')

const LABELS = ['Adres', 'Telefon', 'Faks', 'Belgegeçer']

function htmlToLines(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(br|p|div|tr|td|th|li|hr)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#\d+;/g, ' ')
  return text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

// "Adres :" gibi etiketten sonra kalan değeri temizler; yer tutucu/anlamsız
// değerleri (doldurulmamış form maskeleri, tek "0" gibi sahte telefonlar) eler.
function cleanValue(raw, key) {
  let v = raw
    .replace(/^:\s*/, '')
    .replace(/\bDevam[ıi]?\s*(n[ıi])?\s*(oku)?\.?$/i, '')
    .replace(/-{2,}\s*$/, '')
    .trim()
  if (!v || v === ':') return null
  if ((key === 'telefon' || key === 'faks') && /^0+$/.test(v.replace(/[\s()-]/g, ''))) return null
  if ((key === 'telefon' || key === 'faks') && /_{2,}/.test(v)) return null
  if (key === 'adres' && v.length > 250) v = v.slice(0, 250).trim()
  return v || null
}

function extractFromLines(lines) {
  const result = { adres: null, telefon: null, faks: null }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const labelMatch = LABELS.find((lab) => new RegExp(`^${lab}\\s*:?\\s*$|^${lab}\\s*:\\s*\\S`, 'i').test(line))
    if (!labelMatch) continue
    const key = labelMatch === 'Faks' || labelMatch === 'Belgegeçer' ? 'faks' : labelMatch.toLowerCase()
    if (result[key]) continue
    const sameLine = cleanValue(line.replace(new RegExp(`^${labelMatch}\\s*:?\\s*`, 'i'), ''), key)
    if (sameLine) {
      result[key] = sameLine
      continue
    }
    const collected = []
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const next = lines[j]
      if (LABELS.some((lab) => new RegExp(`^${lab}\\s*:?`, 'i').test(next))) break
      if (/^(e-?posta|email|web|site)/i.test(next)) break
      if (next === ':') continue
      collected.push(next)
      if (key !== 'adres') break
    }
    const cleaned = cleanValue(collected.join(' ').trim(), key)
    if (cleaned) result[key] = cleaned
  }
  return result
}

const ICONS = [
  { re: /fa-map-marker/i, key: 'adres' },
  { re: /fa-phone/i, key: 'telefon' },
  { re: /fa-fax/i, key: 'faks' },
]

function extractFromIcons(html) {
  const result = { adres: null, telefon: null, faks: null }
  for (const { re, key } of ICONS) {
    if (result[key]) continue
    const iconIdx = html.search(re)
    if (iconIdx === -1) continue
    const after = html.slice(iconIdx, iconIdx + 600)
    const m = after.match(/col-lg-11[^>]*>([\s\S]*?)<\/div>/i)
    if (m) {
      const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const cleaned = cleanValue(text, key)
      if (cleaned) result[key] = cleaned
    }
  }
  return result
}

function extractCombined(html) {
  const fromLabels = extractFromLines(htmlToLines(html))
  const fromIcons = extractFromIcons(html)
  return {
    adres: fromLabels.adres || fromIcons.adres,
    telefon: fromLabels.telefon || fromIcons.telefon,
    faks: fromLabels.faks || fromIcons.faks,
  }
}

async function fetchWithTimeout(url) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' })
    clearTimeout(t)
    if (!res.ok) return null
    return await res.text()
  } catch {
    clearTimeout(t)
    return null
  }
}

function hasAnyValue(c) {
  return !!(c.adres || c.telefon || c.faks)
}

function emptyResult() {
  return { adres: null, telefon: null, faks: null }
}

async function scrapeOne(school) {
  if (!school.url) return emptyResult()

  let html = await fetchWithTimeout(school.url)
  if (html) {
    const c = extractCombined(html)
    if (hasAnyValue(c)) return c
  }

  const iletisimUrl = school.url.replace(/\/?$/, '/') + 'tema/iletisim.php'
  html = await fetchWithTimeout(iletisimUrl)
  if (html) {
    const c = extractCombined(html)
    if (hasAnyValue(c)) return c
  }

  return emptyResult()
}

async function runPool(items, worker, concurrency, onProgress) {
  const results = new Array(items.length)
  let next = 0
  let done = 0
  async function runner() {
    while (next < items.length) {
      const i = next++
      results[i] = await worker(items[i], i)
      done++
      onProgress?.(done, items.length)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, runner))
  return results
}

function loadCheckpoint() {
  if (RESUME && fs.existsSync(CHECKPOINT_FILE)) {
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf-8'))
  }
  return { tamamlananIller: [] }
}

function saveCheckpoint(cp) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2), 'utf-8')
}

async function main() {
  const checkpoint = loadCheckpoint()
  const kalan = provinces.filter((p) => !checkpoint.tamamlananIller.includes(p))

  console.log(
    `${provinces.length} il, ${kalan.length} tanesi işlenecek` +
      (checkpoint.tamamlananIller.length ? ` (${checkpoint.tamamlananIller.length} il önceki koşudan tamamlanmış)` : '')
  )

  let toplamAdres = 0,
    toplamTelefon = 0,
    toplamFaks = 0,
    toplamOkul = 0

  for (const il of kalan) {
    const list = schools[il]
    const started = Date.now()
    process.stdout.write(`=> ${il} (${list.length} okul)...`)

    const results = await runPool(list, scrapeOne, CONCURRENCY)
    results.forEach((c, i) => {
      list[i].adres = c.adres
      list[i].telefon = c.telefon
      list[i].faks = c.faks
    })

    const adresSayisi = results.filter((r) => r.adres).length
    const telefonSayisi = results.filter((r) => r.telefon).length
    const faksSayisi = results.filter((r) => r.faks).length
    toplamAdres += adresSayisi
    toplamTelefon += telefonSayisi
    toplamFaks += faksSayisi
    toplamOkul += list.length

    const sure = ((Date.now() - started) / 1000).toFixed(0)
    console.log(
      ` tamam (${sure}sn) — adres %${((adresSayisi / list.length) * 100).toFixed(0)}, ` +
        `telefon %${((telefonSayisi / list.length) * 100).toFixed(0)}, faks %${((faksSayisi / list.length) * 100).toFixed(0)}`
    )

    checkpoint.tamamlananIller.push(il)
    saveCheckpoint(checkpoint)
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(schools, null, 2), 'utf-8')
  }

  console.log('\n[🎉] TAMAMLANDI!')
  console.log(`Toplam okul: ${toplamOkul}`)
  console.log(`  Adres:   ${toplamAdres} (%${((toplamAdres / toplamOkul) * 100).toFixed(1)})`)
  console.log(`  Telefon: ${toplamTelefon} (%${((toplamTelefon / toplamOkul) * 100).toFixed(1)})`)
  console.log(`  Faks:    ${toplamFaks} (%${((toplamFaks / toplamOkul) * 100).toFixed(1)})`)

  fs.unlinkSync(CHECKPOINT_FILE)
}

main()
