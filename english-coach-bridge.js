/**
 * update-words.js
 * Her ay çalıştırılan script — Claude API ile yeni kelimeler/sorular üretip
 * Firestore sharedWords koleksiyonuna kaydeder.
 *
 * Kullanım:
 *   node update-words.js                    ← bu ay
 *   node update-words.js --month=2025-03    ← belirli ay
 *   node update-words.js --game=kelime-avi  ← sadece bir oyun
 *   node update-words.js --dry-run          ← Firebase'e yazmadan önizle
 *
 * .env dosyası gerekli:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   FIREBASE_PROJECT_ID=english-coaching-2eeee
 *   FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
 */

require('dotenv').config();
const Anthropic = require('@anthropic/sdk');
const admin = require('firebase-admin');

// ─── Config ──────────────────────────────────────────────────────────────────

const GAMES = ['kelime-avi', 'gramer-quest', 'dinleme-dedektifi', 'quiz-hizli', 'yazi-sahnesi'];
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const ITEMS_PER_DOC = 15; // her seviye için 15 item (easy/medium/hard her biri)

// CLI argümanları
const args = process.argv.slice(2);
const getArg = (key) => { const a = args.find(a => a.startsWith(`--${key}=`)); return a ? a.split('=')[1] : null; };
const hasFlag = (key) => args.includes(`--${key}`);

const TARGET_MONTH = getArg('month') || currentMonth();
const TARGET_GAME  = getArg('game')  || null;  // null = tüm oyunlar
const DRY_RUN      = hasFlag('dry-run');

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Firebase Init ────────────────────────────────────────────────────────────

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

// ─── Claude Prompt'ları ───────────────────────────────────────────────────────

const PROMPTS = {

  'kelime-avi': (level, month) => `
Sen bir İngilizce öğretmenisisin. ${level} seviyesindeki 7-14 yaş çocuklar için
"Kelime Avı" oyununa kelime listesi üret. Ay: ${month}.

Her ay farklı tema seç (hayvanlar, yiyecekler, meslekler, doğa, ev eşyaları, vb.)

${ITEMS_PER_DOC} kelime üret. Her kelime için:
- word: büyük harfle İngilizce kelime
- label: normal yazım
- image: uygun emoji (tek karakter)
- translation: Türkçe karşılığı

Sadece JSON array döndür, başka hiçbir şey yazma:
[{"word":"APPLE","label":"Apple","image":"🍎","translation":"Elma"}, ...]

${level} seviyesine uygun kelimeler:
A1: çok basit, günlük nesneler
A2: basit, yaygın kelimeler  
B1: orta, soyut kavramlar başlar
B2: ileri, akademik/tematik
C1: çok ileri, idiom/jargon yakını
`,

  'gramer-quest': (level, month) => `
Sen bir İngilizce öğretmenisisin. ${level} seviyesindeki 7-14 yaş çocuklar için
"Gramer Quest" oyununa soru listesi üret. Ay: ${month}.

${ITEMS_PER_DOC} soru üret. Her soru için:
- sentence: boşluklu cümle (boşluk için _____ kullan)
- options: 3-4 şıklık dizi (doğru dahil)
- correct: doğru cevap
- explanation: kısa Türkçe açıklama

Sadece JSON array döndür:
[{"sentence":"I _____ to school.","options":["go","goes","going"],"correct":"go","explanation":"I ile go kullanılır"}, ...]

${level} gramer konuları:
A1: am/is/are, simple present, sayılar
A2: past simple, there is/are, possessives
B1: present perfect, modal verbs, comparatives  
B2: passive voice, conditionals, reported speech
C1: complex grammar, subjunctive, inversion
`,

  'dinleme-dedektifi': (level, month) => `
Sen bir İngilizce öğretmenisisin. ${level} seviyesindeki 7-14 yaş çocuklar için
"Dinleme Dedektifi" oyununa soru listesi üret. Ay: ${month}.

${ITEMS_PER_DOC} soru üret. Her soru için:
- sentence: seslendirilecek doğru cümle
- options: 4 seçenek (biri doğru, diğerleri çok yakın ama farklı)
- (correct: options[0] her zaman doğru olmalı, şıklar karıştırılacak)

Dikkat: options içindeki ilk eleman her zaman doğru cevap olmalı.
Yanlış şıklar sadece bir kelime değişik olmalı (dinleme pratiği için).

Sadece JSON array döndür:
[{"sentence":"The cat is sleeping.","options":["The cat is sleeping.","The dog is sleeping.","The cat is eating.","The cat is playing."]}, ...]

${level} cümle karmaşıklığı:
A1: 3-4 kelime, basit nesneler
A2: 5-6 kelime, basit eylemler
B1: 7-9 kelime, bağlaçlar var
B2: 10+ kelime, karmaşık yapı
C1: idiom ve bağımlı cümle
`,

  'quiz-hizli': (level, month) => `
Sen bir İngilizce öğretmenisisin. ${level} seviyesindeki 7-14 yaş çocuklar için
"Quiz Hızlı" oyununa karma soru listesi üret. Ay: ${month}.

${ITEMS_PER_DOC} soru üret. Çeşitli tipler karıştır:
- vocabulary: kelime soruları
- grammar: gramer soruları
- reading: kısa okuma

Her soru için:
- question: soru metni
- options: 4 şık
- correct: doğru cevap
- type: "vocabulary" | "grammar" | "reading"

Sadece JSON array döndür:
[{"question":"What is the opposite of 'big'?","options":["small","large","tall","wide"],"correct":"small","type":"vocabulary"}, ...]

${level} uygun zorluk uygula.
`,

  'yazi-sahnesi': (level, month) => `
Sen bir İngilizce öğretmenisisin. ${level} seviyesindeki 7-14 yaş çocuklar için
"Yazı Sahnesi" oyununa diyalog listesi üret. Ay: ${month}.

${ITEMS_PER_DOC} diyalog üret. Her diyalog için:
- title: diyaloğun başlığı (Türkçe)
- dialogue: konuşma satırları dizisi, her satır:
  - speaker: "A" veya "B"
  - text: konuşma (boşluklu kısımlar için _____ kullan)
- blanks: dizi — her boşluğun doğru cevabı sırasıyla
- hint: kısa Türkçe ipucu

Diyalog 3-5 satır olmalı, 2-4 boşluk içermeli.

Sadece JSON array döndür:
[{
  "title": "Restoranda Sipariş",
  "dialogue": [
    {"speaker":"A","text":"Hello! What would you like to _____?"},
    {"speaker":"B","text":"I'd like a _____ please."}
  ],
  "blanks": ["order","pizza"],
  "hint": "Sipariş vermek için 'order' ve yemek adları"
}, ...]

${level} uygun günlük hayat senaryoları seç (okul, alışveriş, aile, arkadaşlar).
`
};

// ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function generateWithClaude(client, game, level, month, retries = 3) {
  const prompt = PROMPTS[game](level, month);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = msg.content[0].text.trim();

      // JSON array çıkar (bazen ```json ... ``` içinde gelir)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array in response');

      const items = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(items) || items.length === 0) throw new Error('Empty array');

      return items;

    } catch (err) {
      console.error(`  ⚠️  Attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) await sleep(2000 * attempt);
    }
  }

  return null;
}

// Firestore'a kaydet (upsert)
async function saveToFirestore(game, level, month, items) {
  const docId = `${game}__${level}__${month}`;
  const ref = db.collection('sharedWords').doc(docId);

  await ref.set({
    game,
    level,
    month,
    items,
    count: items.length,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    generatedBy: 'claude-sonnet-4',
  });

  return docId;
}

// ─── Ana Script ───────────────────────────────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Gaming English — Monthly Word Update  ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`Month: ${TARGET_MONTH}`);
  console.log(`Mode:  ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`Game:  ${TARGET_GAME || 'ALL'}`);
  console.log('');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const games = TARGET_GAME ? [TARGET_GAME] : GAMES;
  const total = games.length * LEVELS.length;
  let done = 0;
  let errors = 0;

  for (const game of games) {
    console.log(`\n📦 Game: ${game}`);

    for (const level of LEVELS) {
      done++;
      process.stdout.write(`  [${done}/${total}] ${level}... `);

      // Zaten bu ay veri var mı?
      if (!DRY_RUN) {
        const docId = `${game}__${level}__${TARGET_MONTH}`;
        const existing = await db.collection('sharedWords').doc(docId).get();
        if (existing.exists) {
          console.log(`⏭️  already exists (${existing.data().count} items)`);
          continue;
        }
      }

      const items = await generateWithClaude(client, game, level, TARGET_MONTH);

      if (!items) {
        console.log('❌ FAILED');
        errors++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`✅ ${items.length} items (dry-run, not saved)`);
        console.log(`     Sample: ${JSON.stringify(items[0])}`);
      } else {
        const docId = await saveToFirestore(game, level, TARGET_MONTH, items);
        console.log(`✅ ${items.length} items → ${docId}`);
      }

      // Rate limiting: Claude API'ye çok hızlı istek atmayı önle
      await sleep(500);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Done: ${done - errors}/${total} succeeded, ${errors} failed`);

  if (errors > 0) {
    console.log('⚠️  Rerun failed ones with: node update-words.js --month=' + TARGET_MONTH);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
