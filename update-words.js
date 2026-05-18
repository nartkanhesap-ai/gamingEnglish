/**
 * Cloudflare Worker — Gaming English Words API
 * Deploy: words-api.nartkanhesap.workers.dev
 *
 * GET /words?game=kelime-avi&uid=USER_UID
 *   → kullanıcının seviyesini English Coach Firebase'den okur
 *   → sharedWords'dan bu ay + bu seviyedeki kelimeleri döner
 *
 * GET /words?game=kelime-avi&level=A1
 *   → seviyeyi direkt alır (login yokken fallback)
 */

const FIREBASE_PROJECT = 'english-coaching-2eeee';
const GAMING_FIREBASE_PROJECT = 'english-coaching-2eeee'; // aynı proje, ayrı koleksiyon

// Geçerli ayı YYYY-MM formatında döner
function currentMonth() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// English Coach users koleksiyonundan kullanıcı seviyesini çek
async function getUserLevel(uid, apiKey) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/users/${uid}?key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  // Firestore REST API'de stringValue şeklinde döner
  return data?.fields?.level?.stringValue
      || data?.fields?.englishLevel?.stringValue
      || data?.fields?.placement?.stringValue
      || null;
}

// sharedWords koleksiyonundan kelime listesi çek
async function getWords(game, level, month, apiKey) {
  // Firestore query: game == X AND level == Y AND month == Z
  const url = `https://firestore.googleapis.com/v1/projects/${GAMING_FIREBASE_PROJECT}/databases/(default)/documents:runQuery?key=${apiKey}`;

  const query = {
    structuredQuery: {
      from: [{ collectionId: 'sharedWords' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            { fieldFilter: { field: { fieldPath: 'game'  }, op: 'EQUAL', value: { stringValue: game  } } },
            { fieldFilter: { field: { fieldPath: 'level' }, op: 'EQUAL', value: { stringValue: level } } },
            { fieldFilter: { field: { fieldPath: 'month' }, op: 'EQUAL', value: { stringValue: month } } },
          ]
        }
      },
      limit: 1
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query)
  });

  if (!res.ok) return null;
  const results = await res.json();

  // İlk sonucu al
  const doc = results?.[0]?.document;
  if (!doc) return null;

  // items array'ini parse et
  const itemsField = doc.fields?.items?.arrayValue?.values;
  if (!itemsField) return null;

  // Firestore map formatını plain JS objeye çevir
  return itemsField.map(v => {
    const map = v.mapValue?.fields || {};
    const obj = {};
    for (const [k, fv] of Object.entries(map)) {
      obj[k] = fv.stringValue ?? fv.integerValue ?? fv.booleanValue ?? fv.doubleValue ?? '';
    }
    return obj;
  });
}

// Seviye → difficulty eşlemesi
function levelToDifficulty(level) {
  const map = { 'A1': 'easy', 'A2': 'easy', 'B1': 'medium', 'B2': 'hard', 'C1': 'hard', 'C2': 'hard' };
  return map[level] || 'easy';
}

// CORS headers
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    // OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: corsHeaders(origin)
      });
    }

    const game  = url.searchParams.get('game');
    const uid   = url.searchParams.get('uid');
    let   level = url.searchParams.get('level');

    if (!game) {
      return new Response(JSON.stringify({ error: 'game param required' }), {
        status: 400, headers: corsHeaders(origin)
      });
    }

    const API_KEY = env.FIREBASE_API_KEY;

    // 1. Kullanıcı UID varsa English Coach'tan seviyesini çek
    if (uid && !level) {
      level = await getUserLevel(uid, API_KEY);
    }

    // 2. Hâlâ seviye yoksa A1 default
    if (!level) level = 'A1';

    const month = url.searchParams.get('month') || currentMonth();

    // 3. sharedWords'dan kelimeleri çek
    let items = await getWords(game, level, month, API_KEY);

    // 4. Bu ay veri yoksa önceki ayı dene (grace period)
    if (!items || items.length === 0) {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const prevMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      items = await getWords(game, level, prevMonth, API_KEY);
    }

    // 5. Hiç veri yoksa 404
    if (!items || items.length === 0) {
      return new Response(JSON.stringify({
        error: 'No words found',
        game, level, month,
        hint: 'Run the monthly update script to populate sharedWords'
      }), { status: 404, headers: corsHeaders(origin) });
    }

    return new Response(JSON.stringify({
      game,
      level,
      month,
      difficulty: levelToDifficulty(level),
      count: items.length,
      items
    }), { status: 200, headers: corsHeaders(origin) });
  }
};
