/**
 * words-client.js
 * Gaming English oyunlarına dahil edilecek evrensel kelime yükleme modülü.
 *
 * Çalışma mantığı:
 * 1. localStorage'dan öğrencinin uid ve level bilgisini okur
 *    (English Coach sitesi login olduğunda bunları yazar)
 * 2. Cloudflare Worker'dan seviyeye uygun kelimeleri çeker
 * 3. Başarısız olursa fallback (yerleşik) kelimelere döner
 * 4. Sonucu 24 saat localStorage'da cache'ler (performans)
 */

const WordsClient = (() => {

  // ─── Config — kendi Worker URL'inle değiştir ──────────────────────────────
  const WORKER_URL = 'https://words-api.nartkanhesap.workers.dev';
  const CACHE_TTL  = 24 * 60 * 60 * 1000; // 24 saat (ms)

  // ─── Yardımcı ─────────────────────────────────────────────────────────────

  function getStudentInfo() {
    // English Coach sitesi login olduğunda localStorage'a yazar:
    // gamingEnglish_uid, gamingEnglish_level
    return {
      uid:   localStorage.getItem('gamingEnglish_uid')   || null,
      level: localStorage.getItem('gamingEnglish_level') || null,
    };
  }

  function currentMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function cacheKey(game, level, month) {
    return `gew_cache__${game}__${level}__${month}`;
  }

  function readCache(game, level, month) {
    try {
      const raw = localStorage.getItem(cacheKey(game, level, month));
      if (!raw) return null;
      const { ts, items } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) return null;
      return items;
    } catch { return null; }
  }

  function writeCache(game, level, month, items) {
    try {
      localStorage.setItem(cacheKey(game, level, month), JSON.stringify({
        ts: Date.now(),
        items,
      }));
    } catch { /* storage full, ignore */ }
  }

  // ─── Ana fetch fonksiyonu ──────────────────────────────────────────────────

  /**
   * Oyun için güncel kelime listesini getirir.
   *
   * @param {string} game - "kelime-avi" | "gramer-quest" | "dinleme-dedektifi" | "quiz-hizli" | "yazi-sahnesi"
   * @param {Object} fallback - { easy: [...], medium: [...], hard: [...] } — API çöktüğünde kullanılır
   * @returns {Promise<{items, level, difficulty, source}>}
   */
  async function fetchWords(game, fallback = null) {
    const { uid, level: storedLevel } = getStudentInfo();
    const month = currentMonth();

    // 1. Cache'e bak
    const cachedLevel = storedLevel || 'A1';
    const cached = readCache(game, cachedLevel, month);
    if (cached) {
      return {
        items:      cached,
        level:      cachedLevel,
        difficulty: levelToDifficulty(cachedLevel),
        source:     'cache',
      };
    }

    // 2. API'den çek
    try {
      const params = new URLSearchParams({ game, month });
      if (uid)         params.set('uid',   uid);
      if (storedLevel) params.set('level', storedLevel);

      const res = await fetch(`${WORKER_URL}/words?${params}`, {
        signal: AbortSignal.timeout(5000) // 5 saniye timeout
      });

      if (!res.ok) throw new Error(`API ${res.status}`);

      const data = await res.json();
      writeCache(game, data.level, month, data.items);

      return {
        items:      data.items,
        level:      data.level,
        difficulty: data.difficulty,
        source:     'api',
      };

    } catch (err) {
      console.warn(`[WordsClient] API failed (${err.message}), using fallback`);

      // 3. Fallback — yerleşik kelimeler
      if (fallback) {
        const diff = levelToDifficulty(cachedLevel);
        const items = fallback[diff] || fallback.easy || [];
        return { items, level: cachedLevel, difficulty: diff, source: 'fallback' };
      }

      return { items: [], level: cachedLevel, difficulty: 'easy', source: 'fallback' };
    }
  }

  // ─── Seviye → Zorluk ──────────────────────────────────────────────────────

  function levelToDifficulty(level) {
    const map = { 'A1': 'easy', 'A2': 'easy', 'B1': 'medium', 'B2': 'hard', 'C1': 'hard', 'C2': 'hard' };
    return map[level] || 'easy';
  }

  // ─── UI Helper — loading/error banner ─────────────────────────────────────

  function showLoadingBanner() {
    const el = document.createElement('div');
    el.id = 'words-loading-banner';
    el.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0;
      background: linear-gradient(90deg, #667eea, #764ba2);
      color: white; text-align: center;
      padding: 10px; font-size: 14px; font-weight: 600;
      z-index: 9999; font-family: 'Poppins', sans-serif;
      animation: slideDown 0.3s ease;
    `;
    el.innerHTML = '🔄 Seviyene uygun kelimeler yükleniyor...';
    document.body.prepend(el);
  }

  function hideLoadingBanner(source) {
    const el = document.getElementById('words-loading-banner');
    if (!el) return;
    if (source === 'fallback') {
      el.innerHTML = '⚠️ Çevrimdışı mod — yerleşik kelimeler kullanılıyor';
      el.style.background = '#f59e0b';
      setTimeout(() => el.remove(), 3000);
    } else {
      el.remove();
    }
  }

  function showLevelBadge(level) {
    // Sayfada .level-badge sınıflı element varsa seviyeyi göster
    const badge = document.querySelector('.level-badge');
    if (badge) badge.textContent = level;
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  return {
    fetchWords,
    levelToDifficulty,
    getStudentInfo,
    showLoadingBanner,
    hideLoadingBanner,
    showLevelBadge,
  };

})();

// Global olarak erişilebilir
window.WordsClient = WordsClient;
