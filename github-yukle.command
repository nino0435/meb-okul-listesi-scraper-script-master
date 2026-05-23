#!/bin/bash
# ============================================================
#  MEB Okul Listesi → GitHub Public Push Sihirbazı
#  Yazar: Berhan Tekdemir (@nino0435)
#
#  KULLANIM:
#    Bu dosyaya Finder'da çift tıklayın. Hepsi otomatik.
#    (Eğer "izin verilmedi" derse, Terminal'i açıp şu satırı yapıştırın:
#       bash ~/Downloads/meb-okul-listesi-scraper-script-master/github-yukle.command )
# ============================================================

set -e
cd "$(dirname "$0")"

# Renkler
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[0;34m'; N='\033[0m'

REPO_NAME="meb-tam-okul-listesi-scraper-script"
GITHUB_USER="nino0435"

clear
echo ""
echo -e "${B}╔════════════════════════════════════════════════════════╗${N}"
echo -e "${B}║   MEB Okul Listesi → GitHub Public Push Sihirbazı     ║${N}"
echo -e "${B}╚════════════════════════════════════════════════════════╝${N}"
echo ""
echo "Bu script şunları yapar:"
echo "  1) node_modules klasörünü siler (push'u yavaşlatır)"
echo "  2) Git deposunu başlatır"
echo "  3) Tüm dosyaları commit eder"
echo "  4) GitHub'a public olarak yükler"
echo ""
echo -e "${Y}Devam etmek için Enter'a basın, iptal için Ctrl+C...${N}"
read

# --- 1) git var mı? ---
if ! command -v git &> /dev/null; then
  echo -e "${R}✗ git kurulu değil.${N}"
  echo "Terminal'de şunu çalıştırın: ${Y}xcode-select --install${N}"
  echo "Kurulduktan sonra bu scripti tekrar başlatın."
  read -p "Çıkmak için Enter'a basın..."
  exit 1
fi
echo -e "${G}✓${N} git mevcut ($(git --version | awk '{print $3}'))"

# --- 2) node_modules sil ---
if [ -d "node_modules" ]; then
  echo -e "${Y}→${N} node_modules siliniyor (birkaç saniye sürebilir)..."
  rm -rf node_modules
  echo -e "${G}✓${N} silindi."
fi

# --- 3) git init ---
if [ ! -d ".git" ]; then
  git init -q
  git branch -M main
  echo -e "${G}✓${N} git deposu başlatıldı (branch: main)"
fi

# --- 4) Git kimliği (yoksa al) ---
if [ -z "$(git config user.email)" ]; then
  echo ""
  echo -e "${Y}Git commit kimliği gerekli (sadece bu repo için):${N}"
  read -p "  GitHub e-postanız: " GIT_EMAIL
  read -p "  Adınız (commit'lerde görünecek): " GIT_NAME
  git config user.email "$GIT_EMAIL"
  git config user.name "$GIT_NAME"
fi

# --- 5) commit ---
git add .
if git diff --cached --quiet; then
  echo -e "${Y}→${N} Commit edilecek yeni değişiklik yok."
else
  git commit -q -m "Initial public release: MEB schools scraper v2.0

- 81 il, 973 ilce, 54.923 okul iceren tam veri seti
- Puppeteer tabanli kaziyici (retry, throttling, akilli sayfalama)
- Ilce yazim hatasi normalizasyonu (Elazig, Dogubeyazit vb.)
- Okul turu siniflandirici (Ilkokul, Anadolu Lisesi, BILSEM, vb.)
- MIT lisansi, EN + TR dokumantasyon"
  echo -e "${G}✓${N} commit oluşturuldu."
fi

# --- 6) remote ---
REMOTE="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
if git remote get-url origin &> /dev/null; then
  git remote set-url origin "$REMOTE"
else
  git remote add origin "$REMOTE"
fi
echo -e "${G}✓${N} remote ayarlandı: ${B}${REMOTE}${N}"

# --- 7) GitHub'da repo açıldı mı? ---
echo ""
echo -e "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
echo -e "${Y}ÖNEMLİ:${N} Şimdi GitHub'da repo açmalısınız."
echo ""
echo "  1. Tarayıcıda şu adresi açın:  ${B}https://github.com/new${N}"
echo "  2. Repository name:  ${G}${REPO_NAME}${N}"
echo "  3. ${G}Public${N} seçili olsun"
echo -e "  4. ${R}README, .gitignore, license kutularını İŞARETLEMEYİN${N}"
echo "  5. 'Create repository' butonuna basın"
echo ""

# Otomatik tarayıcıda aç
if command -v open &> /dev/null; then
  open "https://github.com/new" 2>/dev/null || true
  echo -e "${G}→${N} Tarayıcıda https://github.com/new açıldı."
fi

echo ""
echo -e "${Y}Repo'yu oluşturduktan sonra Enter'a basın, push başlasın...${N}"
read

# --- 8) push ---
echo ""
echo -e "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
echo -e "${Y}Push başlıyor. Kullanıcı adı/şifre sorulursa:${N}"
echo -e "   Username: ${G}${GITHUB_USER}${N}"
echo -e "   Password: GitHub şifresi DEĞİL → ${G}Personal Access Token${N}"
echo ""
echo "Token yoksa: ${B}https://github.com/settings/tokens${N}"
echo "  → Generate new token (classic)"
echo "  → 'repo' kutusunu işaretle → Generate"
echo "  → Tokenı kopyala, password kısmına yapıştır"
echo ""
echo -e "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
echo ""

if git push -u origin main; then
  echo ""
  echo -e "${G}╔════════════════════════════════════════════════════════╗${N}"
  echo -e "${G}║                  🎉  BAŞARILI!                         ║${N}"
  echo -e "${G}╚════════════════════════════════════════════════════════╝${N}"
  echo ""
  REPO_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}"
  echo -e "Repo'nuz public olarak yayında:"
  echo -e "${B}${REPO_URL}${N}"
  echo ""
  if command -v open &> /dev/null; then
    sleep 1
    open "$REPO_URL" 2>/dev/null || true
    echo -e "${G}→${N} Tarayıcıda repo sayfası açıldı."
  fi
  echo ""
  echo "Sonraki adım önerisi: 'About' bölümüne topic ekleyin:"
  echo "  puppeteer, meb, scraper, turkiye-okullari, dataset"
  echo ""
else
  echo ""
  echo -e "${R}✗ Push başarısız.${N}"
  echo ""
  echo "Olası sebepler:"
  echo "  • Repo'yu GitHub'da henüz oluşturmadınız → https://github.com/new"
  echo "  • Yanlış token girdiniz → https://github.com/settings/tokens"
  echo "  • İnternet bağlantınız yok"
  echo ""
  echo "Yeniden denemek için bu scripti tekrar çalıştırın."
  echo ""
fi

read -p "Çıkmak için Enter'a basın..."
