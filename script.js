const cities = require('./cities.json')
const fs = require('fs')

const AJAX_URL = 'https://www.meb.gov.tr/baglantilar/okullar/okullar_ajax.php'
const CHECKPOINT_FILE = './schools.partial.json'
const OUTPUT_FILE = './schools.json'

// Önceki sürümde (v2.0, Puppeteer + link-metni ayrıştırma) beklenen referans
// büyüklükler. Kesin doğrulama değil — MEB verisi zamanla organik olarak
// değişir (okul açılış/kapanışı) — ama %kayda-değer sapmalarda uyarı verir.
const BEKLENEN_IL = 81
const BEKLENEN_ILCE_YAKLASIK = 973
const BEKLENEN_OKUL_YAKLASIK = 54923
const SAPMA_TOLERANSI = 0.15 // %15'ten fazla sapma → uyarı

const data = {}
const uniqueDistricts = new Set()

// Okul ismine bakarak okul türünü tespit eden akıllı fonksiyon
const detectSchoolType = (schoolName) => {
  const name = schoolName.toLowerCase('tr-TR')

  if (name.includes('ilkokulu')) return 'İlkokul'
  if (name.includes('ortaokulu')) return 'Ortaokul'
  if (name.includes('fen lisesi')) return 'Fen Lisesi'
  if (name.includes('anadolu lisesi')) return 'Anadolu Lisesi'
  if (name.includes('mesleki ve teknik') || name.includes('mtal')) return 'Mesleki ve Teknik Anadolu Lisesi'
  if (name.includes('imam hatip lisesi')) return 'Anadolu İmam Hatip Lisesi'
  if (name.includes('anaokulu')) return 'Anaokulu'
  if (name.includes('halk eğitimi')) return 'Halk Eğitimi Merkezi'
  if (name.includes('mesleki eğitim merkezi')) return 'Mesleki Eğitim Merkezi'
  if (name.includes('bilim ve sanat') || name.includes('bilsem')) return 'Bilim ve Sanat Merkezi (BİLSEM)'
  if (name.includes('öğretmenevi')) return 'Öğretmenevi'
  if (name.includes('spor lisesi')) return 'Spor Lisesi'
  if (name.includes('güzel sanatlar lisesi')) return 'Güzel Sanatlar Lisesi'
  if (name.includes('lisesi')) return 'Lise'

  return 'Diğer / Özel Eğitim'
}

// MEB sitesindeki tüm harf hatalarını ve mükerrer yazımları RESMİ İLÇE STANDARTINA çeken fonksiyon
const normalizeDistrict = (dist, cityName) => {
  if (!dist) return 'MERKEZ';

  let cleaned = dist.toUpperCase('tr-TR').trim();

  const typos = {
    'DOĞUBEYAZIT': 'DOĞUBAYAZIT', 'TASOVA': 'TAŞOVA', 'İBRADI': 'İBRADİ', 'INCİRLİOVA': 'İNCİRLİOVA',
    'CAVDIR': 'ÇAVDIR', 'ÇELTİKCİ': 'ÇELTİKÇİ', 'YENİSEHİR': 'YENİŞEHİR', 'MUSTAFAKEMALPASA': 'MUSTAFAKEMALPAŞA',
    'AGIN': 'AĞIN', 'ILIÇ': 'İLİÇ', 'ŞARKİKARAAĞAÇ': 'ŞARKIKARAAĞAÇ', 'CATALZEYTİN': 'ÇATALZEYTİN',
    'HADIM': 'HADİM', 'PÖTÜRGE': 'PÜTÜRGE', 'ÇAĞLIYANCERİT': 'ÇAĞLAYANCERİT', 'SİRVAN': 'ŞİRVAN',
    'AKCAABAT': 'AKÇAABAT', 'BAHCESARAY': 'BAHÇESARAY', 'IDİL': 'İDİL', 'AKCAKALE': 'AKÇAKALE',
    'BAGCILAR': 'BAĞCILAR', 'BAHCELİEVLER': 'BAHÇELİEVLER', 'KADİKÖY': 'KADIKÖY', 'KÜÇÜKCEKMECE': 'KÜÇÜKÇEKMECE',
    'GAZİOSMANPASA': 'GAZİOSMANPAŞA', 'MARMARA EREĞLİSİ': 'MARMARAEREĞLİSİ', 'MERKEZE BAĞLI TAŞRA': 'MERKEZ'
  };

  if (typos[cleaned]) {
    cleaned = typos[cleaned];
  }

  const buyuksehirler = [
    'İSTANBUL', 'ANKARA', 'İZMİR', 'BURSA', 'ANTALYA', 'KONYA', 'ADANA', 'GAZİANTEP',
    'ŞANLIURFA', 'KOCAELİ', 'MERSİN', 'DİYARBAKIR', 'HATAY', 'MANİSA', 'BALIKESİR',
    'SAMSUN', 'VAN', 'AYDIN', 'DENİZLİ', 'TEKİRDAĞ', 'MUĞLA', 'KAYSERİ', 'ESKİŞEHİR',
    'ERZURUM', 'KAHRAMANMARAŞ', 'MARDİN', 'SAKARYA', 'MALATYA', 'TRABZON', 'ORDU'
  ];

  if (cleaned === cityName.toUpperCase('tr-TR') && !buyuksehirler.includes(cleaned)) {
    cleaned = 'MERKEZ';
  }

  return cleaned;
}

// MEB, 2026 ortasında okullar/index.php sayfasını tamamen sunucu-taraflı
// (server-side) bir DataTables tablosuna geçirdi. Sayfa artık <a> etiketleriyle
// dolu bir liste değil; tablo verisini `okullar_ajax.php`'ye yapılan bir POST
// isteğiyle çekiyor. Kritik nokta: sayfa doğrudan `?ILKODU=X` ile açıldığında
// (yani bizim eski Puppeteer akışımızdaki gibi), tablonun `data-ilce` özniteliği
// sunucu tarafından "1" olarak sabitleniyor — yani SADECE o ilin 1 numaralı
// (genelde merkez/ilk) ilçesi geliyor. "Tüm ilçeler" sadece kullanıcı arayüzdeki
// il dropdown'ını DEĞİŞTİRİNCE `ilce=0` olarak sıfırlanıyor; URL ile doğrudan
// gidildiğinde bu JS event hiç tetiklenmiyor. Eski script bunu fark etmiyordu —
// sessizce ilk ilçeyle "tamamlandı" diyip devam ediyordu (81 il boyunca %60-80
// veri kaybı, bkz. proje geçmişi/README notu).
//
// Çözüm: Puppeteer/DOM tamamen devre dışı — aynı `okullar_ajax.php` uç noktasına
// `ilce=0` (tümü) parametresiyle DOĞRUDAN POST atıyoruz. Bonus: `OKUL_ADI` alanı
// zaten "İL - İLÇE - OKUL ADI" formatında geliyor, link metni tahmin etmeye
// gerek kalmıyor; ve DataTables `length` parametresi istenen sayıyı aşarsa bile
// TÜM kayıtları tek istekte döndürüyor (doğrulandı: length=2000 → 1270/1270).
const buildAjaxBody = (il, ilce, start, length) => {
  const params = new URLSearchParams()
  params.set('draw', '1')
  for (let i = 0; i < 3; i++) {
    params.set(`columns[${i}][data]`, 'OKUL_ADI')
    params.set(`columns[${i}][searchable]`, 'true')
    params.set(`columns[${i}][orderable]`, 'true')
    params.set(`columns[${i}][search][value]`, '')
    params.set(`columns[${i}][search][regex]`, 'false')
  }
  params.set('order[0][column]', '0')
  params.set('order[0][dir]', 'asc')
  params.set('start', String(start))
  params.set('length', String(length))
  params.set('search[value]', '')
  params.set('search[regex]', 'false')
  params.set('il', String(il))
  params.set('ilce', String(ilce))
  return params.toString()
}

const fetchAjax = async (il, ilce, start, length) => {
  const res = await fetch(AJAX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `https://www.meb.gov.tr/baglantilar/okullar/index.php?ILKODU=${il}`,
    },
    body: buildAjaxBody(il, ilce, start, length),
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return res.json()
}

// Bir il için TÜM okulları (ilce=0 → tümü) çeker. Önce recordsTotal'ı öğrenmek
// için 1 kayıtlık bir "keşif" isteği, sonra tam kaydı tek seferde çeken bir
// istek — sayfalama/tıklama döngüsüne hiç gerek yok.
const fetchProvinceSchools = async (cityNo, cityName) => {
  const probe = await fetchAjax(cityNo, 0, 0, 1)
  const total = probe.recordsTotal || 0
  if (total === 0) return []

  const full = await fetchAjax(cityNo, 0, 0, total + 10)
  const rows = full.data || []

  const result = []
  for (const row of rows) {
    const parts = String(row.OKUL_ADI || '').split(' - ')
    if (parts.length < 3) continue // beklenmeyen format — atla (sessizce veri uydurma)

    const rawDistrict = parts[1].trim()
    const schoolName = parts.slice(2).join(' - ').trim()
    const districtName = normalizeDistrict(rawDistrict, cityName)

    uniqueDistricts.add(`${cityName.toUpperCase('tr-TR')}-${districtName}`)

    result.push({
      name: schoolName,
      district: districtName,
      type: detectSchoolType(schoolName),
      url: row.HOST ? `https://${row.HOST}.meb.k12.tr/` : null,
      kurumKodu: row.YOL || null,
    })
  }
  return result
}

// Checkpoint: her ilden sonra ARA KAYIT alır. Eski sürümde tek writeFileSync
// en sondaydı — 81 ilin ortasında çökme/kesinti olursa TÜM ilerleme kaybolurdu.
const saveCheckpoint = () => {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

const fetchSchools = async () => {
  for (const city of cities) {
    console.log(`=> ${city.name} için okullar çekiliyor...`)

    let attempts = 0
    let success = false
    let schools = []
    while (attempts < 4 && !success) {
      try {
        schools = await fetchProvinceSchools(city.no, city.name)
        success = true
      } catch (e) {
        attempts++
        console.log(`   [!] Hata: ${e.message}. 6 saniye sonra tekrar deneniyor (${attempts}/4)...`)
        await new Promise((r) => setTimeout(r, 6000))
      }
    }

    if (!success) {
      console.log(`   [❌] ${city.name} hiçbir şekilde çekilemedi, bu il atlanıyor.`)
      continue
    }

    const key = city.name.toLocaleLowerCase('tr-TR')
    data[key] = schools
    console.log(`   [✓] ${city.name} tamamlandı. Toplam okul: ${schools.length}`)

    saveCheckpoint()
    await new Promise((r) => setTimeout(r, 500))
  }

  let totalSchools = 0
  let totalProvinces = 0
  for (const key in data) {
    totalSchools += data[key].length
    totalProvinces++
  }

  data['ozet'] = {
    toplam_il: totalProvinces,
    toplam_ilce: uniqueDistricts.size,
    toplam_okul: totalSchools,
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf-8')
  if (fs.existsSync(CHECKPOINT_FILE)) fs.unlinkSync(CHECKPOINT_FILE)

  console.log(`\n[🎉] BAŞARIYLA TAMAMLANDI!`)
  console.log(`    Toplam İl: ${totalProvinces}`)
  console.log(`    Toplam İlçe: ${uniqueDistricts.size}`)
  console.log(`    Toplam Okul: ${totalSchools}`)

  // Kendi kendini doğrulama: eski sürümde bu kontrol YOKTU — script "başarıyla
  // tamamlandı" derdi ama veri sessizce %70 eksik olabilirdi (bkz. yukarıdaki
  // data-ilce regresyonu). Beklenen büyüklüklerden ciddi sapma varsa uyar.
  const sapma = (deger, beklenen) => Math.abs(deger - beklenen) / beklenen
  if (totalProvinces !== BEKLENEN_IL) {
    console.warn(`[⚠️] UYARI: beklenen ${BEKLENEN_IL} il, bulunan ${totalProvinces}.`)
  }
  if (sapma(uniqueDistricts.size, BEKLENEN_ILCE_YAKLASIK) > SAPMA_TOLERANSI) {
    console.warn(`[⚠️] UYARI: ilçe sayısı beklenenden çok sapıyor (yaklaşık ${BEKLENEN_ILCE_YAKLASIK} bekleniyordu, ${uniqueDistricts.size} bulundu). Ayrıştırma/format değişmiş olabilir.`)
  }
  if (sapma(totalSchools, BEKLENEN_OKUL_YAKLASIK) > SAPMA_TOLERANSI) {
    console.warn(`[⚠️] UYARI: okul sayısı beklenenden çok sapıyor (yaklaşık ${BEKLENEN_OKUL_YAKLASIK} bekleniyordu, ${totalSchools} bulundu). MEB'in sayfa/API yapısı yine değişmiş olabilir — çıktıyı commit'lemeden önce örnek illeri elle kontrol et.`)
  }
}

fetchSchools()
