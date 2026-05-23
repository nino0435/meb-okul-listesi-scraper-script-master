<div align="center">

# MEB Tam Okul Listesi — Scraper & Open Dataset

**A Puppeteer-powered scraper that produces a complete, normalized JSON dataset of every K-12 school in Türkiye, sourced directly from the Ministry of National Education (MEB).**

[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Puppeteer](https://img.shields.io/badge/Puppeteer-24.x-40B5A4?logo=puppeteer&logoColor=white)](https://pptr.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Schools](https://img.shields.io/badge/Schools-54%2C923-blue)](#-dataset-at-a-glance)
[![Provinces](https://img.shields.io/badge/Provinces-81%2F81-success)](#-dataset-at-a-glance)
[![Districts](https://img.shields.io/badge/Districts-973-informational)](#-dataset-at-a-glance)
[![Dataset](https://img.shields.io/badge/Dataset-Ready--to--use-brightgreen)](./schools.json)

[Türkçe README →](./README.tr.md)

</div>

---

## Overview

This project crawls the official MEB school directory at `meb.gov.tr/baglantilar/okullar` and turns its paginated, inconsistently-formatted HTML into a single, machine-readable JSON file. Every record carries the school name, normalized district, classified school type, and direct URL.

The scraper is built to survive the realities of the source site: silent pagination, name collisions between cities and districts, dozens of misspellings of district names (`DOĞUBEYAZIT` vs. `DOĞUBAYAZIT`, `ÇELTİKCİ` vs. `ÇELTİKÇİ`, …), and the Turkish-language `Elâzığ` vs. `Elazığ` accent variant that quietly breaks naive string matching. After normalization, the output exactly matches the official count of **81 provinces and 973 districts**.

If you do not need to run the scraper, the latest `schools.json` is committed to the repo and can be consumed as a static dataset.

## Dataset at a Glance

| Metric | Value |
| --- | --- |
| Provinces (`il`) | **81 / 81** |
| Districts (`ilçe`) | **973** (matches official figure) |
| Schools | **54,923** |
| Output file | `schools.json` (~9 MB) |
| Source | `https://www.meb.gov.tr/baglantilar/okullar` |
| Last refresh | regenerated on every run |

## Features

- **Full-country coverage.** Iterates all 81 provinces from `cities.json` and walks every pagination cursor until exhausted.
- **District normalization.** A curated typo map plus rules for metropolitan municipalities (`büyükşehir`) collapses MEB's inconsistent spellings into a single canonical district name, so duplicates do not appear in the dataset.
- **School-type classifier.** A keyword classifier maps each school name to one of the standard MEB categories — İlkokul, Ortaokul, Anadolu Lisesi, Fen Lisesi, Anadolu İmam Hatip Lisesi, Mesleki ve Teknik Anadolu Lisesi, BİLSEM, Halk Eğitimi Merkezi, Öğretmenevi, and more.
- **Robust pagination.** Detects "next page" controls by text (`>`, `»`, `Sonraki`, page number) and verifies the page actually changed before advancing — this prevents infinite loops when MEB silently re-serves the same page.
- **Retry with backoff.** Up to four attempts per province with a 6-second wait between failures; a 1-second cool-down between provinces to avoid hammering the source.
- **Accent-aware matching.** Strips `â/î/û` and applies Turkish-locale lowercasing so cities like `Elâzığ` are matched correctly during DOM filtering.
- **Self-reporting summary.** The script appends an `ozet` (summary) key to the output with totals for provinces, districts, and schools.

## Output Schema

`schools.json` is a single object keyed by province name (lower-cased, Turkish locale), plus an `ozet` summary block:

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

### Fields

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | School's official name as published by MEB. |
| `district` | string | Normalized district (`ilçe`), upper-case Turkish. |
| `type` | string | Detected school category (see classifier below). |
| `url` | string | Direct link to the school's `meb.k12.tr` page. |

### School-type categories

`İlkokul` · `Ortaokul` · `Anaokulu` · `Lise` · `Anadolu Lisesi` · `Fen Lisesi` · `Anadolu İmam Hatip Lisesi` · `Mesleki ve Teknik Anadolu Lisesi` · `Mesleki Eğitim Merkezi` · `Spor Lisesi` · `Güzel Sanatlar Lisesi` · `Bilim ve Sanat Merkezi (BİLSEM)` · `Halk Eğitimi Merkezi` · `Öğretmenevi` · `Diğer / Özel Eğitim`

## Quick Start

### Prerequisites

- Node.js **18 or newer**
- ~250 MB free disk (Chromium download for Puppeteer)
- A stable internet connection

### Install & run

```bash
git clone https://github.com/nino0435/meb-tam-okul-listesi-scraper-script.git
cd meb-tam-okul-listesi-scraper-script
npm install
node script.js
```

On Apple Silicon (M1/M2/M3) Macs, if Puppeteer fails to download a compatible Chromium build, force the latest version:

```bash
npm install puppeteer@latest
```

While running, the script logs progress per province:

```
=> ADANA için okullar çekiliyor...
   [✓] ADANA tamamlandı. Toplam okul: 1834
...
[🎉] BAŞARIYLA TAMAMLANDI!
    Toplam İl: 81
    Toplam İlçe: 973
    Toplam Okul: 54923
```

A full run takes roughly **15–25 minutes** depending on your connection and MEB's response time.

## Using the Dataset Without Running the Scraper

If you only need the data, skip the scraper entirely:

```bash
curl -L https://raw.githubusercontent.com/nino0435/meb-tam-okul-listesi-scraper-script/main/schools.json -o schools.json
```

Then load it like any JSON file:

```js
const schools = require('./schools.json');
console.log(schools.adana[0]);
console.log(schools.ozet);
```

## How It Works

1. **Iterate provinces.** `cities.json` provides the 81 official province codes (`ILKODU=1…81`).
2. **Open the province page.** Puppeteer navigates to `index.php?ILKODU=<n>` with a desktop user-agent and a 50s load timeout, retrying up to four times if MEB stalls.
3. **Extract candidate links.** Anchor tags are filtered in the page context using accent-stripped, Turkish-locale lowercased matching — only links whose visible text contains the city name and a hyphen are kept.
4. **Parse each row.** MEB serves rows shaped like `İL - İLÇE - OKUL ADI`; the script splits on `-`, keeps the school name (last segment), and derives a raw district.
5. **Normalize the district.** Apply the typo map (`'DOĞUBEYAZIT' → 'DOĞUBAYAZIT'`, etc.), then collapse names that equal the province itself to `MERKEZ` — **but only for non-metropolitan provinces**, since cities like İstanbul and Ankara have no `MERKEZ`.
6. **Classify the school type.** Run keyword rules against the lowercased name to pick the right MEB category.
7. **Advance pagination safely.** Find a clickable next-page control, then poll the DOM up to 25 times (600 ms each) waiting for the first row to change. If it never changes, the province is done.
8. **Aggregate and persist.** Write `schools.json` with each province as a key, plus an `ozet` summary block.

## Project Structure

```
.
├── script.js          # The scraper
├── cities.json        # 81 provinces with their MEB ILKODU values
├── schools.json       # Generated dataset (committed for convenience)
├── package.json
├── LICENSE
├── README.md          # English (this file)
└── README.tr.md       # Turkish
```

## Use Cases

- Build a "school search" feature for an education-tech product.
- Seed a database for analytics on school distribution by district or type.
- Power dropdowns in government / NGO forms that need an authoritative school list.
- Train or evaluate NLP models on Turkish proper-noun normalization.
- Generate static maps of school density across Türkiye.

## Disclaimer & Ethics

This scraper is intended for educational, research, and open-data purposes. The underlying data is published by MEB on a public website. The script throttles itself (≈600 ms between page interactions and a 1-second cool-down between provinces), respects timeouts, and retries gracefully — please keep these protections in place if you fork it. If you redistribute the dataset, attribute MEB as the original source.

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
