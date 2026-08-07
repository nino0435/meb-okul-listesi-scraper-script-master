<div align="center">

# MEB Tam Okul Listesi — Scraper & Open Dataset

**A lightweight, browser-free scraper that produces a complete, normalized JSON dataset of every K-12 school in Türkiye, sourced directly from the Ministry of National Education (MEB).**

[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-40B5A4)](./package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Schools](https://img.shields.io/badge/Schools-55%2C062-blue)](#-dataset-at-a-glance)
[![Provinces](https://img.shields.io/badge/Provinces-81%2F81-success)](#-dataset-at-a-glance)
[![Districts](https://img.shields.io/badge/Districts-973-informational)](#-dataset-at-a-glance)
[![Dataset](https://img.shields.io/badge/Dataset-Ready--to--use-brightgreen)](./schools.json)

[Türkçe README →](./README.tr.md)

</div>

---

## Overview

This project queries the official MEB school directory at `meb.gov.tr/baglantilar/okullar` and turns its data into a single, machine-readable JSON file. Every record carries the school name, normalized district, classified school type, direct URL, MEB institution code, and contact information (address, phone, fax).

The scraper is built to survive the realities of the source site: name collisions between cities and districts, dozens of misspellings of district names (`DOĞUBEYAZIT` vs. `DOĞUBAYAZIT`, `ÇELTİKCİ` vs. `ÇELTİKÇİ`, …), and the Turkish-language `Elâzığ` vs. `Elazığ` accent variant that quietly breaks naive string matching. After normalization, the output exactly matches the official count of **81 provinces and 973 districts**.

If you do not need to run the scraper, the latest `schools.json` is committed to the repo and can be consumed as a static dataset.

> **Aug 2026 note:** MEB migrated the province page from a plain paginated HTML list to a server-side [DataTables](https://datatables.net/) table backed by `okullar_ajax.php`. Loading a province page directly (as any URL-based crawler does) now defaults that endpoint to district code `1` only — a client-side script fixes this by resetting the filter to "all districts" *after* the page loads, so a plain URL visit silently under-collects unless you drive that UI interaction. v2.1.0 fixes this by calling the same AJAX endpoint directly with the "all districts" parameter instead of scripting a browser; see [How It Works](#how-it-works).

> **Classification fix note:** `detectSchoolType()` was mis-lowercasing the Turkish letter 'İ', because JS's single-argument `toLowerCase('tr-TR')` silently ignores its locale argument — so school names starting with 'İ' (`İlkokulu`, `İmam Hatip`, ...) never matched, and **40% of the dataset** (every elementary school) was silently mislabeled as "Diğer / Özel Eğitim". Vocational (MTAL) schools were also mislabeled as plain "Anadolu Lisesi" because their names end in "...Anadolu Lisesi" too. Both are now fixed; `type` is reliable again.

## Dataset at a Glance

| Metric | Value |
| --- | --- |
| Provinces (`il`) | **81 / 81** |
| Districts (`ilçe`) | **973** (matches official figure) |
| Schools | **55,062** |
| Address coverage | **96.2%** (52,957 schools) |
| Phone coverage | **92.1%** (50,709 schools) |
| Fax coverage | **16.3%** (8,999 schools) |
| Output file | `schools.json` (~20 MB with contact info) |
| Source | `https://www.meb.gov.tr/baglantilar/okullar` + individual school pages |
| Last refresh | regenerated on every run |

## Features

- **Full-country coverage.** Iterates all 81 provinces from `cities.json` and fetches every district (`ilce=0` = "all") in a single request per province — no pagination loop needed.
- **Zero dependencies, no browser.** Talks to MEB's own `okullar_ajax.php` endpoint with Node's built-in `fetch`. No Puppeteer, no Chromium download, no headless browser to keep up to date.
- **Contact info enrichment.** `scrape_contact.js` visits each school's `meb.k12.tr` homepage (and falls back to `/tema/iletisim.php`) to extract address, phone, and fax using two complementary strategies: text-label matching and FontAwesome icon class matching. Achieved 96% address coverage across all 55,062 schools.
- **District normalization.** A curated typo map plus rules for metropolitan municipalities (`büyükşehir`) collapses MEB's inconsistent spellings into a single canonical district name, so duplicates do not appear in the dataset.
- **School-type classifier.** A keyword classifier maps each school name to one of the standard MEB categories — İlkokul, Ortaokul, Anadolu Lisesi, Fen Lisesi, Anadolu İmam Hatip Lisesi, Mesleki ve Teknik Anadolu Lisesi, BİLSEM, Halk Eğitimi Merkezi, Öğretmenevi, and more.
- **Retry with backoff.** Up to four attempts per province with a 6-second wait between failures; a cool-down between provinces to avoid hammering the source.
- **Checkpointing.** Writes checkpoint files after every province, so a crash or network drop mid-run doesn't lose already-collected provinces.
- **Self-verifying output.** Compares the final `ozet` totals against the expected province/district/school counts and prints a warning if they deviate by more than 15% — the exact kind of silent under-collection that motivated the Aug 2026 fix now gets caught automatically instead of shipping unnoticed.

## Output Schema

`schools.json` is a single object keyed by province name (lower-cased, Turkish locale), plus an `ozet` summary block:

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

### Fields

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | School's official name as published by MEB. |
| `district` | string | Normalized district (`ilçe`), upper-case Turkish. |
| `type` | string | Detected school category (see classifier below). |
| `url` | string | Direct link to the school's `meb.k12.tr` page. |
| `kurumKodu` | string \| null | MEB's official province/district/institution code (from the `YOL` field, format: `province/district/institution`) — a stable, unique identifier for the school. `null` if absent from the source. |
| `adres` | string \| null | Street address extracted from the school's MEB webpage. `null` if not found or not published. |
| `telefon` | string \| null | Phone number. `null` if not found or placeholder-only. |
| `faks` | string \| null | Fax number. `null` if not found or placeholder-only. |

### School-type categories

`İlkokul` · `Ortaokul` · `Anaokulu` · `Lise` · `Anadolu Lisesi` · `Fen Lisesi` · `Anadolu İmam Hatip Lisesi` · `Mesleki ve Teknik Anadolu Lisesi` · `Mesleki Eğitim Merkezi` · `Spor Lisesi` · `Güzel Sanatlar Lisesi` · `Bilim ve Sanat Merkezi (BİLSEM)` · `Halk Eğitimi Merkezi` · `Öğretmenevi` · `Diğer / Özel Eğitim`

## Quick Start

### Prerequisites

- Node.js **18 or newer** (for the built-in `fetch`)
- A stable internet connection
- No disk space beyond the ~20 MB output — there are no dependencies to install

### Step 1 — Collect school list

```bash
git clone https://github.com/nino0435/meb-okul-listesi-scraper-script-master.git
cd meb-okul-listesi-scraper-script-master
node script.js
```

(`npm install` is a no-op — the project has zero runtime dependencies — but it's still safe to run if you prefer.)

While running, the script logs progress per province:

```
=> ADANA için okullar çekiliyor...
   [✓] ADANA tamamlandı. Toplam okul: 1834
...
[🎉] BAŞARIYLA TAMAMLANDI!
    Toplam İl: 81
    Toplam İlçe: 973
    Toplam Okul: 55062
```

A full run typically finishes in **under 2 minutes** — no browser to launch, just two lightweight HTTP requests per province.

### Step 2 — Enrich with contact information (optional)

```bash
node scrape_contact.js
```

This visits each school's MEB webpage to collect address, phone, and fax. It writes the contact fields directly into `schools.json` and saves a checkpoint after each province so you can resume with `--resume` if interrupted:

```bash
node scrape_contact.js --resume
```

The contact scrape processes all 55,062 schools concurrently (20 at a time) and finishes in **2–3 hours** depending on connection speed. Coverage from the Aug 2026 full run:

| Field | Coverage |
| --- | --- |
| Address | **96.2%** (52,957 / 55,062) |
| Phone | **92.1%** (50,709 / 55,062) |
| Fax | **16.3%** — most schools no longer publish a fax number |

## Using the Dataset Without Running the Scraper

If you only need the data, skip the scraper entirely:

```bash
curl -L https://raw.githubusercontent.com/nino0435/meb-okul-listesi-scraper-script-master/main/schools.json -o schools.json
```

Then load it like any JSON file:

```js
const schools = require('./schools.json');
console.log(schools.adana[0]);
console.log(schools.ozet);
```

## How It Works

1. **Iterate provinces.** `cities.json` provides the 81 official province codes (`ILKODU=1…81`).
2. **Probe the record count.** POST to MEB's own `okullar_ajax.php` (the same endpoint the province page's DataTables widget calls) with `il=<code>`, `ilce=0` ("all districts"), `length=1` — the response's `recordsTotal` tells us exactly how many schools that province has.
3. **Fetch everything in one shot.** POST again with `length` set above `recordsTotal`; DataTables returns the full result set in a single response (no pagination cursor to walk), retrying up to four times with a 6-second backoff if MEB stalls.
4. **Parse each row.** MEB serves rows shaped like `İL - İLÇE - OKUL ADI` in the `OKUL_ADI` field; the script splits on ` - `, keeps everything after the second segment as the school name (a few dozen real school names contain their own ` - `, e.g. *"Abdurrahman - Nermin Bilimli İlkokulu"*), and derives a raw district.
5. **Normalize the district.** Apply the typo map (`'DOĞUBEYAZIT' → 'DOĞUBAYAZIT'`, etc.), then collapse names that equal the province itself to `MERKEZ` — **but only for non-metropolitan provinces**, since cities like İstanbul and Ankara have no `MERKEZ`.
6. **Classify the school type.** Run keyword rules against the lowercased name to pick the right MEB category.
7. **Checkpoint and aggregate.** Write `schools.partial.json` after every province; once all 81 finish, write the final `schools.json` with each province as a key plus an `ozet` summary block, and delete the checkpoint file.
8. **Sanity-check the totals.** Compare `ozet` against the expected province/district/school counts and warn loudly if MEB's site structure has changed again.

> Why not just visit `index.php?ILKODU=<n>` directly, like a browser would? Because MEB's page defaults that same AJAX call to `ilce=1` (district code 1 only) on a fresh page load — the "show all districts" reset only fires from a client-side `change` event on the province dropdown, which a direct URL visit never triggers. Calling the AJAX endpoint with `ilce=0` ourselves sidesteps that entirely.

## Project Structure

```
.
├── script.js              # The main scraper (school list from MEB directory)
├── scrape_contact.js      # Contact info enrichment (address/phone/fax from school pages)
├── cities.json            # 81 provinces with their MEB ILKODU values
├── schools.json           # Generated dataset (committed for convenience)
├── schools.partial.json   # Checkpoint written after each province, deleted on success
├── contact_checkpoint.json  # Contact scraper checkpoint (deleted on success)
├── package.json
├── LICENSE
├── README.md              # English (this file)
└── README.tr.md           # Turkish
```

## Use Cases

- Build a "school search" feature for an education-tech product.
- Seed a database for analytics on school distribution by district or type.
- Power dropdowns in government / NGO forms that need an authoritative school list.
- Train or evaluate NLP models on Turkish proper-noun normalization.
- Generate static maps of school density across Türkiye.
- Enrich school records with verified contact information for parent/community apps.

## Disclaimer & Ethics

This scraper is intended for educational, research, and open-data purposes. The underlying data is published by MEB on a public website. The main scraper makes exactly two lightweight requests per province; the contact scraper fetches each school's public homepage with a 6-second timeout and a concurrency cap of 20 — please keep these protections in place if you fork it. If you redistribute the dataset, attribute MEB as the original source.

## Contributing

Bug reports and pull requests are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the workflow.

Particularly useful contributions:

- New entries for the district typo map when MEB publishes a previously-unseen misspelling.
- Additional school-type rules if a category is being mis-classified as `Diğer / Özel Eğitim`.
- A GitHub Action that runs the scraper monthly and commits a refreshed `schools.json`.

## License

Released under the [MIT License](./LICENSE). You may use the code and the dataset freely, including in commercial projects.

## Author

**Berhan Tekdemir** — [@nino0435](https://github.com/nino0435)

---

<div align="center">

If this saved you a few hours of scraping, please leave a ⭐ — it really helps the project reach more people.

</div>
