# Contributing / Katkı Rehberi

> 🇬🇧 English first, 🇹🇷 Türkçe aşağıda.

---

## 🇬🇧 Contributing

Thanks for taking the time to improve this project. The scraper covers the entire MEB directory, which means there's always room to make the typo map smarter, the school-type classifier more accurate, or the pipeline more robust.

### Good first issues

- **Add a missing district typo.** If you spot a district in `schools.json` that looks misspelled or duplicated, add the canonical mapping to the `typos` object in `script.js` and open a PR.
- **Fix a mis-classified school type.** If a school is tagged `Diğer / Özel Eğitim` but you can see from its name that it has a clear category, add or refine a rule in `detectSchoolType()`.
- **Improve docs.** Typos, clearer wording, missing examples — all welcome.

### Workflow

1. Fork the repo and create a topic branch from `main`:
   ```bash
   git checkout -b fix/district-typo-bahcesaray
   ```
2. Make your change. Keep diffs focused — one logical fix per PR.
3. If you changed scraping logic, re-run the script and confirm the totals in the final `ozet` block still match (or improve) the previous run.
4. Commit with a clear message:
   ```
   fix(districts): map 'BAHCESARAY' to 'BAHÇESARAY'
   ```
5. Push and open a pull request. In the description, include:
   - What changed and why
   - Before / after counts from the `ozet` block, if the change touches the scraper

### Code style

- Plain JavaScript (no TypeScript, no build step).
- Match the existing 2-space indentation and single-quoted strings.
- Prefer small, named helper functions over inline magic.

### What to avoid

- Removing the delays, retries, or per-province cool-down. They exist to be a good citizen against the MEB site.
- Adding dependencies for things `puppeteer` + Node's built-ins can already do.
- Committing personal API keys, `.env` files, or large unrelated binaries.

### Reporting bugs

Open an issue and include:

- Node version (`node -v`)
- OS (and chip — Apple Silicon vs. Intel matters for Puppeteer)
- The exact error or unexpected output
- The province where it occurred, if applicable

---

## 🇹🇷 Katkı Rehberi

Bu projeyi geliştirmek için zaman ayırdığınız için teşekkürler. Scraper tüm MEB dizinini tarıyor; dolayısıyla yazım hatası sözlüğü, okul türü sınıflandırıcı veya tarama akışı her zaman iyileştirilebilir.

### İlk katkı için uygun konular

- **Eksik bir ilçe yazımı ekleyin.** `schools.json` içinde yanlış yazılmış ya da çift kayıt olarak görünen bir ilçe bulursanız, doğru eşleştirmeyi `script.js` içindeki `typos` nesnesine ekleyip PR açın.
- **Yanlış sınıflandırılmış bir okul türünü düzeltin.** Bir okul `Diğer / Özel Eğitim` olarak işaretlenmesine rağmen adından kategorisi açıksa, `detectSchoolType()` içine yeni bir kural ekleyin veya mevcut kuralı geliştirin.
- **Dokümantasyonu iyileştirin.** Yazım hataları, daha net ifadeler, eksik örnekler — hepsi memnuniyetle karşılanır.

### Akış

1. Depoyu fork edin ve `main` üzerinden bir konu dalı (branch) oluşturun:
   ```bash
   git checkout -b fix/ilce-yazimi-bahcesaray
   ```
2. Değişikliğinizi yapın. Her PR tek bir mantıksal düzeltme içersin.
3. Scraper mantığını değiştirdiyseniz scripti yeniden çalıştırın ve `ozet` bloğundaki toplam değerlerin önceki çalıştırmayla aynı (ya da daha iyi) kaldığını doğrulayın.
4. Açıklayıcı bir commit mesajı yazın:
   ```
   fix(ilce): 'BAHCESARAY' → 'BAHÇESARAY' eşleştirmesi eklendi
   ```
5. Push edip pull request açın. Açıklamada şunlar olsun:
   - Ne değişti ve neden
   - Eğer scraper'a dokunduysanız, önceki ve yeni `ozet` rakamları

### Kod tarzı

- Düz JavaScript (TypeScript veya build adımı yok).
- Mevcut 2 boşluk girinti ve tek tırnak kullanımına sadık kalın.
- Inline karmaşık ifadeler yerine kısa, isimlendirilmiş yardımcı fonksiyonları tercih edin.

### Kaçınılması gerekenler

- Bekleme süreleri, yeniden deneme döngüsü veya iller arası mola kaldırılmamalı. Bunlar MEB sitesine saygılı davranmak için var.
- `puppeteer` ve Node yerleşikleriyle yapılabilecek şeyler için yeni bağımlılık eklemeyin.
- Kişisel API anahtarları, `.env` dosyaları veya ilgisiz büyük ikili dosyalar commit etmeyin.

### Hata bildirimi

Issue açarken şunları paylaşın:

- Node sürümü (`node -v`)
- İşletim sistemi (ve işlemci — Apple Silicon mı, Intel mi; Puppeteer için fark eder)
- Aldığınız tam hata mesajı veya beklenmedik çıktı
- Mümkünse, hatanın oluştuğu il
