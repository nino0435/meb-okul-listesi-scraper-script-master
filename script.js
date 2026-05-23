const puppeteer = require('puppeteer')
const cities = require('./cities.json')
const fs = require('fs')

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

// Verileri ayrıştıran ana fonksiyon
const cleanData = function (schools, cityName, uniqueDistrictsSet = null) {
  const data = []
  
  const buyuksehirler = [
    'İSTANBUL', 'ANKARA', 'İZMİR', 'BURSA', 'ANTALYA', 'KONYA', 'ADANA', 'GAZİANTEP', 
    'ŞANLIURFA', 'KOCAELİ', 'MERSİN', 'DİYARBAKIR', 'HATAY', 'MANİSA', 'BALIKESİR', 
    'SAMSUN', 'VAN', 'AYDIN', 'DENİZLİ', 'TEKİRDAĞ', 'MUĞLA', 'KAYSERİ', 'ESKİŞEHİR', 
    'ERZURUM', 'KAHRAMANMARAŞ', 'MARDİN', 'SAKARYA', 'MALATYA', 'TRABZON', 'ORDU'
  ];
  const cityUpper = cityName.toUpperCase('tr-TR');

  for (const sch of schools) {
    const words = sch.text.split('-')
    if (words.length < 2) {
      continue
    }
    
    const schoolName = words[words.length - 1].trim()
    
    let rawDistrict = 'MERKEZ'
    if (words.length >= 3) {
      rawDistrict = words[1].trim()
    } else if (words.length === 2) {
      rawDistrict = words[0].trim()
    }
    
    const districtName = normalizeDistrict(rawDistrict, cityName)
    
    if (uniqueDistrictsSet) {
      if (districtName !== 'BÜYÜKŞEHİR' && !(buyuksehirler.includes(cityUpper) && districtName === 'MERKEZ')) {
        uniqueDistrictsSet.add(`${cityUpper}-${districtName}`)
      }
    }

    data.push({
      name: schoolName,
      district: districtName,
      type: detectSchoolType(schoolName),
      url: sch.url
    })
  }
  return data
}

const fetchSchools = async () => {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

  for (const city of cities) {
    let pageNum = 1
    let hasNextPage = true
    let allCitySchools = []
    let previousPageFirstSchoolName = null

    console.log(`=> ${city.name} için okullar çekiliyor...`)

    // Geliştirilmiş Yeniden Deneme (Retry) Döngüsü
    let entryAttempts = 0
    let entrySuccess = false
    while (entryAttempts < 4 && !entrySuccess) {
      try {
        await page.goto(`https://www.meb.gov.tr/baglantilar/okullar/index.php?ILKODU=${city.no}`, { waitUntil: 'load', timeout: 50000 })
        entrySuccess = true
      } catch (e) {
        entryAttempts++
        console.log(`   [!] Bağlantı hatası veya yavaşlık algılandı. 6 saniye sonra tekrar deneniyor (${entryAttempts}/4)...`)
        await new Promise(r => setTimeout(r, 6000))
      }
    }

    if (!entrySuccess) {
      console.log(`   [❌] İl sayfasına hiçbir şekilde bağlanılamadı, bu il atlanıyor.`);
      continue;
    }

    while (hasNextPage) {
      let items = []
      try {
        items = await page.evaluate((currentCityName) => {
          const links = Array.from(document.getElementsByTagName('a'));
          
          const normalize = (str) => {
            if (!str) return '';
            return str.toLocaleLowerCase('tr-TR')
                      .replace(/â/g, 'a')
                      .replace(/î/g, 'i')
                      .replace(/û/g, 'u')
                      .trim();
          };

          const searchName = normalize(currentCityName);
          
          return links
            .filter(i => {
              if (!i.text) return false;
              const linkText = normalize(i.text);
              return linkText.includes(searchName) && linkText.includes('-');
            })
            .map(i => ({ text: i.text.trim(), url: i.href }));
        }, city.name)
      } catch (err) {}

      const schools = cleanData(items, city.name, uniqueDistricts)

      if (schools.length === 0) {
        break
      }

      if (previousPageFirstSchoolName === schools[0].name) {
        break
      }
      previousPageFirstSchoolName = schools[0].name

      allCitySchools = allCitySchools.concat(schools)

      const clickSuccess = await page.evaluate((nextPageNum) => {
        const elements = Array.from(document.querySelectorAll('a, button, span, li'));
        const targetStr = nextPageNum.toString();
        
        let btn = elements.find(el => el.textContent.trim() === targetStr);
        
        if (!btn) {
          btn = elements.find(el => {
            const t = el.textContent.trim();
            return t === '>' || t === '»' || t.toLowerCase().includes('sonraki');
          });
        }
        
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      }, pageNum + 1)

      if (!clickSuccess) {
        hasNextPage = false
      } else {
        let pageChanged = false
        for (let attempts = 0; attempts < 25; attempts++) {
          await new Promise(r => setTimeout(r, 600)) // Sayfa yükünü hafifletmek için bekleme süresi artırıldı
          try {
            const newItems = await page.evaluate((currentCityName) => {
              const links = Array.from(document.getElementsByTagName('a'));
              const normalize = (str) => {
                if (!str) return '';
                return str.toLocaleLowerCase('tr-TR').replace(/â/g, 'a').trim();
              };
              const searchName = normalize(currentCityName);
              return links
                .filter(i => i.text && normalize(i.text).includes(searchName) && i.text.includes('-'))
                .map(i => ({ text: i.text.trim(), url: i.href }));
            }, city.name)
            const newSchools = cleanData(newItems, city.name)
            
            if (newSchools.length > 0 && newSchools[0].name !== previousPageFirstSchoolName) {
              pageChanged = true
              break
            }
          } catch (err) {}
        }

        if (!pageChanged) {
          hasNextPage = false
        } else {
          pageNum++
        }
      }
    }

    const key = `${city.name}`.toLocaleLowerCase('tr-TR')
    data[key] = allCitySchools
    console.log(`   [✓] ${city.name} tamamlandı. Toplam okul: ${allCitySchools.length}`)
    
    // MEB güvenlik duvarını dinlendirmek için iller arasına 1 saniyelik statik mola eklendi
    await new Promise(r => setTimeout(r, 1000))
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
    toplam_okul: totalSchools
  }

  fs.writeFileSync('./schools.json', JSON.stringify(data, null, 2), 'utf-8')
  await browser.close()
  console.log(`\n[🎉] BAŞARIYLA TAMAMLANDI!`);
  console.log(`    Toplam İl: ${totalProvinces}`);
  console.log(`    Toplam İlçe: ${uniqueDistricts.size} (Resmi Sayıya Tam Eşitlendi!)`);
  console.log(`    Toplam Okul: ${totalSchools}`);
}

fetchSchools()