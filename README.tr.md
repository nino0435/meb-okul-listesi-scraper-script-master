<div align="center">

# MEB Tam Okul Listesi — Kazıyıcı & Açık Veri Seti

**Türkiye'deki tüm MEB okullarını doğrudan resmi kaynaktan çekip tek bir düzgün JSON dosyasına dönüştüren Puppeteer tabanlı bir kazıyıcı (scraper).**

[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Puppeteer](https://img.shields.io/badge/Puppeteer-24.x-40B5A4?logo=puppeteer&logoColor=white)](https://pptr.dev/)
[![Lisans: MIT](https://img.shields.io/badge/Lisans-MIT-yellow.svg)](./LICENSE)
[![Okul](https://img.shields.io/badge/Okul-54%2C923-blue)](#-veri-seti-%C3%B6zeti)
[![İl](https://img.shields.io/badge/%C4%B0l-81%2F81-success)](#-veri-seti-%C3%B6zeti)
[![İlçe](https://img.shields.io/badge/%C4%B0l%C3%A7e-973-informational)](#-veri-seti-%C3%B6zeti)
[![Veri Seti](https://img.shields.io/badge/Veri%20Seti-Kullan%C4%B1ma%20Haz%C4%B1r-brightgreen)](./schools.json)

[English README →](./README.md)

</div>

---

## Proje Hakkında

Bu proje, MEB'in resmi `meb.gov.tr/baglantilar/okullar` adresindeki sayfa sayfa dağılmış, tutarsız biçimlenmiş okul listesini tek tıkla işlenebilir bir JSON dosyasına dönüştürür. Her kayıtta okul adı, normalize edilmiş ilçe bilgisi, sınıflandırılmış okul türü ve okulun doğrudan web sitesi yer alır.

Kaynaktaki gerçek dünya sorunlarına karşı tasarlandı: sessizce tekrarlanan sayfalar, il-ilçe isim çakışmaları, MEB sayfalarında onlarca farklı şekilde yazılan ilçe isimleri (`DOĞUBEYAZIT` ↔ `DOĞUBAYAZIT`, `ÇELTİKCİ` ↔ `ÇELTİKÇİ` gibi), ve basit string karşılaştırmasını çöküşe sürükleyen `Elâzığ` ↔ `Elazığ` aksan farkı. Normalizasyon sonrasında çıktı; resmi sayım olan **81 il ve 973 ilçeye birebir** oturur.

Kodları çalıştırmayı düşünmüyorsanız `schools.json` dosyası halihazırda depoda yer alır — statik bir veri seti olarak doğrudan kullanabilirsiniz.

## Veri Seti Özeti

| Metrik | Değer |
| --- | --- |
| İl | **81 / 81** |
| İlçe | **973** (resmi sayıyla aynı) |
| Okul | **54.923** |
| Çıktı dosyası | `schools.json` (~9 MB) |
| Kaynak | `https://www.meb.gov.tr/baglantilar/okullar` |
| Güncelleme | her çalıştırmada yeniden üretilir |

## Öne Çıkanlar

- **Türkiye'nin tamamı.** `cities.json` üzerinden 81 ili tek tek dolaşır, sayfalama sonuna kadar tüm sayfaları yürür.
- **İlçe normalizasyonu.** El ile derlenmiş bir yazım hatası sözlüğü ve büyükşehir kurallarıyla; MEB'in farklı sayfalarda farklı yazdığı ilçe isimleri tek bir kanonik isme indirgenir. Böylece veri setinde mükerrer ilçe oluşmaz.
- **Okul türü sınıflandırıcı.** Anahtar kelime tabanlı sınıflandırıcı; her okulu MEB'in standart kategorilerinden birine eşler — İlkokul, Ortaokul, Anadolu Lisesi, Fen Lisesi, Anadolu İmam Hatip Lisesi, Mesleki ve Teknik Anadolu Lisesi, BİLSEM, Halk Eğitimi Merkezi, Öğretmenevi vb.
- **Akıllı sayfa geçişi.** "Sonraki sayfa" düğmesini metin üzerinden bulur (`>`, `»`, `Sonraki`, sayfa numarası) ve sayfanın **gerçekten değiştiğini** doğrulamadan ilerlemez. MEB'in aynı sayfayı sessizce tekrar sunması durumunda sonsuz döngüye girmez.
- **Yeniden deneme + bekleme.** Her il için en fazla 4 deneme; hatalarda 6 sn bekleme; iller arasında 1 sn'lik nezaket molası. Kaynağı yormaz.
- **Aksanlara duyarlı eşleştirme.** `â/î/û` harfleri sadeleştirilir, Türkçe locale ile küçük harfe çevrilir. Böylece DOM filtrelemesinde `Elâzığ` gibi iller doğru yakalanır.
- **Kendiliğinden özet.** Çıktıya, toplam il/ilçe/okul sayılarını barındıran bir `ozet` bloğu eklenir.

## Çıktı Şeması

`schools.json`, her il için (Türkçe locale ile küçük harfle yazılmış) bir anahtar barındıran tek bir nesnedir; sonunda bir `ozet` bloğu vardır:

```json
{
  "adana": [
    {
      "name": "Akören Çok Programlı Anadolu Lisesi",
      "district": "ALADAĞ",
      "type": "Anadolu Lisesi",
      "url": "https://aladagakorencokprogramlilisesi.meb.k12.tr/"
    }
  ],
  "ozet": {
    "toplam_il": 81,
    "toplam_ilce": 973,
    "toplam_okul": 54923
  }
}
```

### Alanlar

| Alan | Tip | Açıklama |
| --- | --- | --- |
| `name` | string | Okulun MEB sitesindeki resmi adı. |
| `district` | string | Normalize edilmiş ilçe (`ilçe`), Türkçe büyük harf. |
| `type` | string | Tespit edilen okul kategorisi (aşağıdaki listeye bakın). |
| `url` | string | Okulun `meb.k12.tr` adresine doğrudan bağlantı. |

### Okul türü kategorileri

`İlkokul` · `Ortaokul` · `Anaokulu` · `Lise` · `Anadolu Lisesi` · `Fen Lisesi` · `Anadolu İmam Hatip Lisesi` · `Mesleki ve Teknik Anadolu Lisesi` · `Mesleki Eğitim Merkezi` · `Spor Lisesi` · `Güzel Sanatlar Lisesi` · `Bilim ve Sanat Merkezi (BİLSEM)` · `Halk Eğitimi Merkezi` · `Öğretmenevi` · `Diğer / Özel Eğitim`

## Hızlı Başlangıç

### Gereksinimler

- Node.js **18 veya üstü**
- ~250 MB boş disk alanı (Puppeteer kendi Chromium'unu indirir)
- Sabit bir internet bağlantısı

### Kurulum ve çalıştırma

```bash
git clone https://github.com/nino0435/meb-okul-listesi-scraper-script-master.git
cd meb-okul-listesi-scraper-script-master
npm install
node script.js
```

Apple Silicon (M1/M2/M3) Mac kullanıyorsanız ve Puppeteer uyumlu bir Chromium indiremiyorsa, en güncel sürümü yükleyin:

```bash
npm install puppeteer@latest
```

Çalışma sırasında her il için ilerleme yazdırılır:

```
=> ADANA için okullar çekiliyor...
   [✓] ADANA tamamlandı. Toplam okul: 1834
...
[🎉] BAŞARIYLA TAMAMLANDI!
    Toplam İl: 81
    Toplam İlçe: 973
    Toplam Okul: 54923
```

Tam bir tarama; internetinize ve MEB sunucusunun durumuna göre **15–25 dakika** sürer.

## Sadece Veri Setini Kullanmak

Yalnızca veriyi istiyorsanız, kazıyıcıyı çalıştırmadan dosyayı doğrudan indirin:

```bash
curl -L https://raw.githubusercontent.com/nino0435/meb-okul-listesi-scraper-script-master/main/schools.json -o schools.json
```

Sonra istediğiniz dilde okuyun:

```js
const schools = require('./schools.json');
console.log(schools.adana[0]);
console.log(schools.ozet);
```

## Nasıl Çalışıyor?

1. **İlleri dolaş.** `cities.json` 81 il için resmi `ILKODU=1…81` değerlerini sağlar.
2. **İl sayfasını aç.** Puppeteer, masaüstü user-agent ile `index.php?ILKODU=<n>` adresine gider; 50 sn timeout ve gerekirse 4 denemeye kadar yeniden bağlanır.
3. **Bağlantıları çıkar.** Sayfa içindeki `<a>` etiketleri; aksan sadeleştirme + Türkçe küçük harf normalizasyonu ile filtrelenir. Sadece şehir adını ve bir tire içeren bağlantılar tutulur.
4. **Satırları ayrıştır.** MEB satırları `İL - İLÇE - OKUL ADI` biçiminde sunar. `-` üzerinden böler, son parçayı okul adı olarak alır, ilçeyi türetir.
5. **İlçeyi normalize et.** Yazım hatası sözlüğü uygulanır (`'DOĞUBEYAZIT' → 'DOĞUBAYAZIT'` gibi). Sonra, **yalnızca büyükşehir olmayan illerde**, il adıyla eşleşen ilçeler `MERKEZ` olarak kabul edilir — çünkü İstanbul ve Ankara gibi illerde "MERKEZ" diye bir ilçe yoktur.
6. **Okul türünü sınıflandır.** Okul adının küçük harf hali üzerinde anahtar kelime kuralları çalıştırılır.
7. **Sayfayı güvenli ilerlet.** Bir "sonraki sayfa" düğmesi bulunup tıklanır; ardından 25 deneme × 600 ms süreyle ilk satırın gerçekten değişmesi beklenir. Değişmezse bu il bitmiştir.
8. **Toparla ve kaydet.** Her il bir anahtar olacak şekilde `schools.json` yazılır; sona toplam değerleri içeren bir `ozet` bloğu eklenir.

## Proje Yapısı

```
.
├── script.js          # Kazıyıcı
├── cities.json        # 81 il ve MEB ILKODU değerleri
├── schools.json       # Üretilen veri seti (depoda hazır)
├── package.json
├── LICENSE
├── README.md          # İngilizce
└── README.tr.md       # Türkçe (bu dosya)
```

## Kullanım Senaryoları

- Eğitim teknolojisi uygulamalarında "okul arama" özelliği.
- Okul dağılımı (ilçe, tür) üzerine analitik için veritabanı tohumlama.
- Kamu/STK formlarında güvenilir bir okul listesi açılır menüsü.
- Türkçe özel adların normalizasyonu için NLP modeli eğitimi/değerlendirmesi.
- Türkiye genelinde okul yoğunluğunun statik haritalanması.

## Etik ve Sorumluluk

Bu kazıyıcı; eğitim, araştırma ve açık veri amaçları için tasarlanmıştır. Kaynak veri MEB tarafından kamuya açık bir sitede yayımlanmaktadır. Script kendi kendini frenler (sayfa etkileşimleri arasında ~600 ms, iller arasında 1 sn bekleme), timeout'lara saygı gösterir ve düzgün şekilde yeniden dener. Lütfen projeyi fork ederseniz bu korumaları kaldırmayın. Veriyi yeniden yayımlarken kaynak olarak MEB'i belirtin.

## Katkı

Hata bildirimleri ve pull request'ler hoş karşılanır. Akış için [CONTRIBUTING.md](./CONTRIBUTING.md) dosyasına bakın.

Özellikle değerli katkılar:

- MEB'in henüz yakalanmamış bir ilçe yazımı için sözlüğe yeni giriş.
- `Diğer / Özel Eğitim` olarak yanlış sınıflandırılan bir okul tipi için yeni sınıflandırıcı kuralı.
- Ayda bir scraper'ı çalıştırıp `schools.json`'u yenileyen bir GitHub Action.

## Lisans

[MIT Lisansı](./LICENSE) altındadır. Hem kodu hem de veri setini ticari projeler dahil olmak üzere serbestçe kullanabilirsiniz.

## Yazar

**Berhan Tekdemir** — [@nino0435](https://github.com/nino0435)

---

<div align="center">

Bu proje size birkaç saat kazandırdıysa, lütfen ⭐ vermeyi unutmayın — projeyi daha çok kişiye ulaştırır.

</div>
