<div align="center">

# MEB Tam Okul Listesi — Kazıyıcı & Açık Veri Seti

**Türkiye'deki tüm MEB okullarını doğrudan resmi kaynaktan çekip tek bir düzgün JSON dosyasına dönüştüren, hafif (tarayıcısız) bir kazıyıcı (scraper).**

[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Bağımlılık yok](https://img.shields.io/badge/ba%C4%9F%C4%B1ml%C4%B1l%C4%B1k-0-40B5A4)](./package.json)
[![Lisans: MIT](https://img.shields.io/badge/Lisans-MIT-yellow.svg)](./LICENSE)
[![Okul](https://img.shields.io/badge/Okul-55%2C062-blue)](#-veri-seti-%C3%B6zeti)
[![İl](https://img.shields.io/badge/%C4%B0l-81%2F81-success)](#-veri-seti-%C3%B6zeti)
[![İlçe](https://img.shields.io/badge/%C4%B0l%C3%A7e-973-informational)](#-veri-seti-%C3%B6zeti)
[![Veri Seti](https://img.shields.io/badge/Veri%20Seti-Kullan%C4%B1ma%20Haz%C4%B1r-brightgreen)](./schools.json)

[English README →](./README.md)

</div>

---

## Proje Hakkında

Bu proje, MEB'in resmi `meb.gov.tr/baglantilar/okullar` adresindeki sayfa sayfa dağılmış, tutarsız biçimlenmiş okul listesini tek tıkla işlenebilir bir JSON dosyasına dönüştürür. Her kayıtta okul adı, normalize edilmiş ilçe bilgisi, sınıflandırılmış okul türü ve okulun doğrudan web sitesi yer alır.

Kaynaktaki gerçek dünya sorunlarına karşı tasarlandı: il-ilçe isim çakışmaları, MEB sayfalarında onlarca farklı şekilde yazılan ilçe isimleri (`DOĞUBEYAZIT` ↔ `DOĞUBAYAZIT`, `ÇELTİKCİ` ↔ `ÇELTİKÇİ` gibi), ve basit string karşılaştırmasını çöküşe sürükleyen `Elâzığ` ↔ `Elazığ` aksan farkı. Normalizasyon sonrasında çıktı; resmi sayım olan **81 il ve 973 ilçeye birebir** oturur.

Kodları çalıştırmayı düşünmüyorsanız `schools.json` dosyası halihazırda depoda yer alır — statik bir veri seti olarak doğrudan kullanabilirsiniz.

> **Ağustos 2026 notu:** MEB, il sayfasını düz sayfalanmış HTML listesinden `okullar_ajax.php` destekli sunucu-taraflı bir [DataTables](https://datatables.net/) tablosuna taşıdı. Bir il sayfasını doğrudan URL ile açmak (herhangi bir URL-tabanlı kazıyıcının yaptığı gibi) artık bu uç noktayı sadece 1 numaralı ilçeyle sınırlıyor — "tüm ilçeler" filtresi yalnızca sayfa yüklendikten SONRA bir istemci-taraflı script ile sıfırlanıyor, yani düz bir URL ziyareti bu arayüz etkileşimini tetiklemeden sessizce eksik veri toplar. v2.1.0 bunu, bir tarayıcı yönlendirmek yerine aynı AJAX uç noktasını "tüm ilçeler" parametresiyle doğrudan çağırarak çözer; bkz. [Nasıl Çalışıyor?](#nas%C4%B1l-%C3%A7al%C4%B1%C5%9F%C4%B1yor).

> **Sınıflandırma düzeltmesi notu:** `detectSchoolType()`, JS'in tek-argümanlı `toLowerCase('tr-TR')`'sinin locale argümanını yok saydığı için 'İ' harfini yanlış küçültüyordu — bu yüzden "İlkokulu"/"İmam Hatip" gibi İ ile başlayan okul isimleri hiç eşleşmiyor, veri setinin **%40'ı** ("İlkokul"ların tamamı) yanlışlıkla "Diğer / Özel Eğitim"e düşüyordu. Ayrıca MTAL (meslek lisesi) okulları isimleri de "...Anadolu Lisesi" ile bittiği için düz "Anadolu Lisesi" olarak yanlış etiketleniyordu. İkisi de düzeltildi; `type` alanı artık güvenilir.

## Veri Seti Özeti

| Metrik | Değer |
| --- | --- |
| İl | **81 / 81** |
| İlçe | **973** (resmi sayıyla aynı) |
| Okul | **55.062** |
| Adres kapsamı | **%96,2** (52.957 okul) |
| Telefon kapsamı | **%92,1** (50.709 okul) |
| Faks kapsamı | **%16,3** (8.999 okul) |
| Çıktı dosyası | `schools.json` (~20 MB iletişim bilgileriyle birlikte) |
| Kaynak | `https://www.meb.gov.tr/baglantilar/okullar` + bireysel okul sayfaları |
| Güncelleme | her çalıştırmada yeniden üretilir |

## Öne Çıkanlar

- **Türkiye'nin tamamı.** `cities.json` üzerinden 81 ili tek tek dolaşır; her il için tüm ilçeleri (`ilce=0` = "tümü") TEK istekte çeker — sayfalama döngüsüne gerek yok.
- **Bağımlılık yok, tarayıcı yok.** MEB'in kendi `okullar_ajax.php` uç noktasıyla Node'un yerleşik `fetch`'i üzerinden konuşur. Puppeteer yok, Chromium indirmesi yok, güncel tutulması gereken bir headless tarayıcı yok.
- **İletişim bilgisi zenginleştirme.** `scrape_contact.js` her okulun `meb.k12.tr` ana sayfasını ziyaret eder (bulamazsa `/tema/iletisim.php`'ye fallback yapar), adres, telefon ve faks bilgisini iki tamamlayıcı stratejiyle çıkarır: metin etiket eşleştirmesi ve FontAwesome ikon sınıfı eşleştirmesi. 55.062 okulda %96 adres kapsamı sağlandı.
- **İlçe normalizasyonu.** El ile derlenmiş bir yazım hatası sözlüğü ve büyükşehir kurallarıyla; MEB'in farklı sayfalarda farklı yazdığı ilçe isimleri tek bir kanonik isme indirgenir. Böylece veri setinde mükerrer ilçe oluşmaz.
- **Okul türü sınıflandırıcı.** Anahtar kelime tabanlı sınıflandırıcı; her okulu MEB'in standart kategorilerinden birine eşler — İlkokul, Ortaokul, Anadolu Lisesi, Fen Lisesi, Anadolu İmam Hatip Lisesi, Mesleki ve Teknik Anadolu Lisesi, BİLSEM, Halk Eğitimi Merkezi, Öğretmenevi vb.
- **Yeniden deneme + bekleme.** Her il için en fazla 4 deneme; hatalarda 6 sn bekleme; iller arasında nezaket molası. Kaynağı yormaz.
- **Checkpoint.** Her ilden sonra `schools.partial.json` yazılır — çalışma ortasında çökme/bağlantı kopması olsa bile o ana kadar toplanan iller kaybolmaz.
- **Kendi kendini doğrulama.** Sonuçtaki `ozet` toplamları, beklenen il/ilçe/okul sayılarıyla karşılaştırılır; %15'ten fazla sapma varsa uyarı basılır — Ağustos 2026'daki sessiz eksik-veri sorununu bir daha fark edilmeden geçmesin diye bu kontrol artık otomatik.

## Çıktı Şeması

`schools.json`, her il için (Türkçe locale ile küçük harfle yazılmış) bir anahtar barındıran tek bir nesnedir; sonunda bir `ozet` bloğu vardır:

```json
{
  "adana": [
    {
      "name": "Akören Çok Programlı Anadolu Lisesi",
      "district": "ALADAĞ",
      "type": "Anadolu Lisesi",
      "url": "https://aladagakorencokprogramlilisesi.meb.k12.tr/",
      "kurumKodu": "01/02/112770",
      "adres": "AKÖREN MAHALLESİ CUMHURİYET CAD. NO 35, ALADAĞ/ADANA",
      "telefon": "(322) 594 2007",
      "faks": null
    }
  ],
  "ozet": {
    "toplam_il": 81,
    "toplam_ilce": 973,
    "toplam_okul": 55062
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
| `kurumKodu` | string \| null | MEB'in resmi il/ilçe/kurum kodu (`YOL` alanından, biçim: `il/ilçe/kurum`) — okulun kararlı, benzersiz kimliği. Kaynakta yoksa `null`. |
| `adres` | string \| null | Okulun MEB sayfasından çıkarılan açık adresi. Bulunamazsa veya yayımlanmamışsa `null`. |
| `telefon` | string \| null | Telefon numarası. Bulunamazsa veya yalnızca yer tutucu varsa `null`. |
| `faks` | string \| null | Faks numarası. Bulunamazsa veya yalnızca yer tutucu varsa `null`. |

### Okul türü kategorileri

`İlkokul` · `Ortaokul` · `Anaokulu` · `Lise` · `Anadolu Lisesi` · `Fen Lisesi` · `Anadolu İmam Hatip Lisesi` · `Mesleki ve Teknik Anadolu Lisesi` · `Mesleki Eğitim Merkezi` · `Spor Lisesi` · `Güzel Sanatlar Lisesi` · `Bilim ve Sanat Merkezi (BİLSEM)` · `Halk Eğitimi Merkezi` · `Öğretmenevi` · `Diğer / Özel Eğitim`

## Hızlı Başlangıç

### Gereksinimler

- Node.js **18 veya üstü** (yerleşik `fetch` için)
- Sabit bir internet bağlantısı
- ~9 MB'lık çıktı dışında disk alanına gerek yok — kurulacak bir bağımlılık yok

### Adım 1 — Okul listesini topla

```bash
git clone https://github.com/nino0435/meb-okul-listesi-scraper-script-master.git
cd meb-okul-listesi-scraper-script-master
node script.js
```

(`npm install` hiçbir şey yapmaz — projenin çalışma zamanı bağımlılığı yok — ama isterseniz yine de çalıştırmanız güvenlidir.)

Çalışma sırasında her il için ilerleme yazdırılır:

```
=> ADANA için okullar çekiliyor...
   [✓] ADANA tamamlandı. Toplam okul: 1834
...
[🎉] BAŞARIYLA TAMAMLANDI!
    Toplam İl: 81
    Toplam İlçe: 973
    Toplam Okul: 55062
```

Tam bir tarama genellikle **2 dakikadan kısa** sürer — açılacak bir tarayıcı yok, il başına sadece iki hafif HTTP isteği var.

### Adım 2 — İletişim bilgilerini zenginleştir (isteğe bağlı)

```bash
node scrape_contact.js
```

Bu komut, her okulun MEB web sayfasını ziyaret ederek adres, telefon ve faks bilgisini toplar; doğrudan `schools.json` dosyasına yazar. Her ilden sonra checkpoint kaydeder, kesintide `--resume` ile kaldığı yerden devam edebilirsiniz:

```bash
node scrape_contact.js --resume
```

İletişim taraması 55.062 okulu eş zamanlı (20'şer gruplar hâlinde) işler, bağlantı hızına göre **2-3 saat** sürer. Ağustos 2026 tam tarasının kapsama sonuçları:

| Alan | Kapsama |
| --- | --- |
| Adres | **%96,2** (52.957 / 55.062) |
| Telefon | **%92,1** (50.709 / 55.062) |
| Faks | **%16,3** — çoğu okul artık faks numarası yayımlamıyor |

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
2. **Kayıt sayısını öğren.** İl sayfasındaki DataTables bileşeninin çağırdığı aynı `okullar_ajax.php` uç noktasına `il=<kod>`, `ilce=0` ("tüm ilçeler") ve `length=1` ile POST atılır — yanıttaki `recordsTotal` o ilin tam okul sayısını verir.
3. **Her şeyi tek seferde çek.** `length`, `recordsTotal`'ın üzerinde bir değerle tekrar POST edilir; DataTables TÜM sonuç kümesini tek yanıtta döndürür (dolaşılacak bir sayfalama imleci yok). MEB yanıt vermezse 6 saniyelik beklemeyle en fazla 4 kez yeniden denenir.
4. **Satırları ayrıştır.** MEB satırları `OKUL_ADI` alanında `İL - İLÇE - OKUL ADI` biçiminde sunar. ` - ` üzerinden böler, ikinci parçadan sonrasını okul adı olarak birleştirir (bazı gerçek okul adlarının kendi içinde ` - ` geçtiği görüldü, örn. *"Abdurrahman - Nermin Bilimli İlkokulu"*), ilçeyi türetir.
5. **İlçeyi normalize et.** Yazım hatası sözlüğü uygulanır (`'DOĞUBEYAZIT' → 'DOĞUBAYAZIT'` gibi). Sonra, **yalnızca büyükşehir olmayan illerde**, il adıyla eşleşen ilçeler `MERKEZ` olarak kabul edilir — çünkü İstanbul ve Ankara gibi illerde "MERKEZ" diye bir ilçe yoktur.
6. **Okul türünü sınıflandır.** Okul adının küçük harf hali üzerinde anahtar kelime kuralları çalıştırılır.
7. **Checkpoint'le ve topla.** Her ilden sonra `schools.partial.json` yazılır; 81 il de bitince her il bir anahtar olacak şekilde nihai `schools.json` yazılır (artı bir `ozet` bloğu), checkpoint dosyası silinir.
8. **Toplamları sağlama al.** `ozet`, beklenen il/ilçe/okul sayılarıyla karşılaştırılır; MEB'in site yapısı yine değiştiyse yüksek sesle uyarı verilir.

> Neden doğrudan `index.php?ILKODU=<n>` adresine gidip bir tarayıcı gibi davranmıyoruz? Çünkü MEB'in sayfası, taze bir sayfa yüklemesinde aynı AJAX çağrısını `ilce=1`e (sadece 1 numaralı ilçe) sabitliyor — "tüm ilçeleri göster" sıfırlaması SADECE il dropdown'ındaki bir istemci-taraflı `change` olayından tetikleniyor, ki doğrudan URL ziyareti bunu asla tetiklemiyor. Uç noktayı kendimiz `ilce=0` ile çağırmak bunu tamamen atlatıyor.

## Proje Yapısı

```
.
├── script.js               # Ana kazıyıcı (MEB dizininden okul listesi)
├── scrape_contact.js        # İletişim bilgisi zenginleştirici (okul sayfalarından adres/telefon/faks)
├── cities.json              # 81 il ve MEB ILKODU değerleri
├── schools.json             # Üretilen veri seti (depoda hazır)
├── schools.partial.json     # Her ilden sonra yazılan checkpoint, başarıda silinir
├── contact_checkpoint.json  # İletişim tarayıcısı checkpoint dosyası, başarıda silinir
├── package.json
├── LICENSE
├── README.md                # İngilizce
└── README.tr.md             # Türkçe (bu dosya)
```

## Kullanım Senaryoları

- Eğitim teknolojisi uygulamalarında "okul arama" özelliği.
- Okul dağılımı (ilçe, tür) üzerine analitik için veritabanı tohumlama.
- Kamu/STK formlarında güvenilir bir okul listesi açılır menüsü.
- Türkçe özel adların normalizasyonu için NLP modeli eğitimi/değerlendirmesi.
- Türkiye genelinde okul yoğunluğunun statik haritalanması.

## Etik ve Sorumluluk

Bu kazıyıcı; eğitim, araştırma ve açık veri amaçları için tasarlanmıştır. Kaynak veri MEB tarafından kamuya açık bir sitede yayımlanmaktadır. Script il başına tam olarak iki hafif istek yapar, iller arasında kendini frenler, timeout'lara saygı gösterir ve düzgün şekilde yeniden dener. Lütfen projeyi fork ederseniz bu korumaları kaldırmayın. Veriyi yeniden yayımlarken kaynak olarak MEB'i belirtin.

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
