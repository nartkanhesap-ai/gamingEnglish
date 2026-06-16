# -*- coding: utf-8 -*-
"""
Gaming English - Atlas & Vocab ses uretimi (YENI 18 UNITE)
Macera Okyanusu + Zirve unitelerinin Atlas tanitim + kelime sesleri

KULLANIM:
  1. pip install edge-tts   (kurulu degilse)
  2. python generate_sounds_new.py
  3. Olusan sounds/atlas/ ve sounds/vocab/ klasorlerini
     GitHub deposundaki sounds/ klasorune yukle (mevcutlarin yanina).
"""
import asyncio, os
import edge_tts

# Atlas tanitim sesi (onceki unitelerle ayni ayar)
ATLAS_VOICE = "en-US-AnaNeural"
ATLAS_RATE  = "-10%"
ATLAS_PITCH = "+5Hz"

# Kelime sesi
VOCAB_VOICE = "en-US-EmmaNeural"
VOCAB_RATE  = "+0%"
VOCAB_PITCH = "+0Hz"

os.makedirs("sounds/atlas", exist_ok=True)
os.makedirs("sounds/vocab", exist_ok=True)

# ---- ATLAS TANITIM METINLERI (dosya_adi: metin) ----
ATLAS = {
 "intro_feelings_emotions.mp3": "Hi explorer! Everybody has feelings, happy, sad, excited or scared. Today we will learn to talk about how we feel AND why we feel that way. When we know our feelings, we become great friends!",
 "intro_science_lab.mp3": "Welcome to the Science Lab, explorer! Today we discover how cool experiments work. In science, we often say what HAPPENS to things, 'water is heated', 'the balloon is filled'. Let us explore!",
 "intro_world_cultures.mp3": "Hello explorer! The world is full of amazing cultures, different food, games and festivals! Today we learn to COMPARE them. Which festival is bigger? Which game is more fun? Let us travel the world!",
 "intro_music_art.mp3": "Hi explorer! Music and art make life beautiful! Today we learn 'used to', to talk about things we did in the PAST but not anymore. 'I used to draw cats', but now I draw dragons! Let us create!",
 "intro_movies_books.mp3": "Hello story-lover! Movies and books take us on adventures! Today we learn the Past Continuous, to describe what was HAPPENING at a moment. 'I was watching a film when...' Let us tell stories!",
 "intro_social_media.mp3": "Hi explorer! The internet is fun, but we must stay safe! Today we learn 'should' and 'shouldn't', to give advice. 'You should ask a parent', 'You shouldn't share your password!' Let us be smart online!",
 "intro_problem_solving.mp3": "Hello clever explorer! Every problem has a solution if we think hard! Today we learn the First Conditional, 'If you try, you will succeed!' It connects an action with its result. Let us solve mysteries!",
 "intro_space_universe.mp3": "Greetings, space explorer! The universe is full of wonders! Today we learn 'will' and 'won't' to talk about the future. 'We will travel to Mars!' 'Robots won't get tired!' Let us blast off!",
 "intro_sports_champions.mp3": "Hello champion! Sports teach us to be strong and never give up! Today we learn the Present Perfect, for things that have happened. 'She has won a medal!' 'We have played together!' Let us be winners!",
 "intro_news_society.mp3": "Hello explorer! Every day there is news about our world. Today we learn linking words like 'however' and 'although', they connect ideas like bridges! 'I love summer, however, I also like rain.' Let us connect ideas!",
 "intro_debate_opinion.mp3": "Hi explorer! Everyone has opinions, and it is fun to share them! Today we learn how to give our opinion politely. 'I think dogs are best because they are loyal, but cats are nice too!' Let us debate kindly!",
 "intro_academic_words.mp3": "Hello clever explorer! Today we learn relative clauses, words like 'who', 'which' and 'where' that add information. 'The book WHICH I read was great!' They help us describe things in detail. Let us learn!",
 "intro_business_english.mp3": "Hello young inventor! Today we learn Reported Speech, how to tell what someone said. 'She said that the robot works!' It is like being a reporter! Imagine inventing cool machines. Let us report!",
 "intro_literature.mp3": "Hello storyteller! Stories are magic, they take us anywhere! Today we learn how to write our own stories with describing words and connectors. 'Once there was a hero who was brave...' Let us create tales!",
 "intro_philosophy_ethics.mp3": "Hello thinker! Today we explore big questions about right and wrong. We learn the Second Conditional, 'If I found money, I would return it!' It helps us imagine and make good choices. Let us think deeply!",
 "intro_research_skills.mp3": "Hello super researcher! Today we become detectives of knowledge! We learn 'must be', 'can't be' and 'might be' to make smart guesses. 'It must be true because there is proof!' Let us investigate!",
 "intro_global_issues.mp3": "Hello world hero! Today we learn about helping our planet and people. We use the Third Conditional to talk about the past, 'If they had recycled, they would have saved trees!' Let us be heroes of the world!",
 "intro_mastery_test.mp3": "Congratulations, champion! You have reached the final test! Today we review EVERYTHING you learned, all the grammar, all the words. You are amazing! Show what you know and become a true English Champion!",
}

# ---- VOCAB KELIMELER (dosya_adi: kelime) ----
VOCAB = {
  "agree.mp3": "Agree",
  "analyse.mp3": "Analyse",
  "argument.mp3": "Argument",
  "article.mp3": "Article",
  "astronaut.mp3": "Astronaut",
  "athlete.mp3": "Athlete",
  "atom.mp3": "Atom",
  "author.mp3": "Author",
  "biology.mp3": "Biology",
  "bored.mp3": "Bored",
  "budget.mp3": "Budget",
  "ceremony.mp3": "Ceremony",
  "challenge.mp3": "Challenge",
  "champion.mp3": "Champion",
  "character.mp3": "Character",
  "cite.mp3": "Cite",
  "citizen.mp3": "Citizen",
  "claim.mp3": "Claim",
  "client.mp3": "Client",
  "coach.mp3": "Coach",
  "comment.mp3": "Comment",
  "compare.mp3": "Compare",
  "comprehension.mp3": "Comprehension",
  "concert.mp3": "Concert",
  "conclusion.mp3": "Conclusion",
  "contract.mp3": "Contract",
  "cooperation.mp3": "Cooperation",
  "creative.mp3": "Creative",
  "culture.mp3": "Culture",
  "custom.mp3": "Custom",
  "data.mp3": "Data",
  "deadline.mp3": "Deadline",
  "decision.mp3": "Decision",
  "define.mp3": "Define",
  "director.mp3": "Director",
  "disagree.mp3": "Disagree",
  "diversity.mp3": "Diversity",
  "drum.mp3": "Drum",
  "election.mp3": "Election",
  "email.mp3": "Email",
  "ethics.mp3": "Ethics",
  "evaluate.mp3": "Evaluate",
  "evidence.mp3": "Evidence",
  "excited.mp3": "Excited",
  "experiment.mp3": "Experiment",
  "film.mp3": "Film",
  "fluency.mp3": "Fluency",
  "follow.mp3": "Follow",
  "freedom.mp3": "Freedom",
  "galaxy.mp3": "Galaxy",
  "genre.mp3": "Genre",
  "government.mp3": "Government",
  "grammar.mp3": "Grammar",
  "gravity.mp3": "Gravity",
  "guitar.mp3": "Guitar",
  "heritage.mp3": "Heritage",
  "hypothesis.mp3": "Hypothesis",
  "imagery.mp3": "Imagery",
  "inequality.mp3": "Inequality",
  "justice.mp3": "Justice",
  "language.mp3": "Language",
  "like.mp3": "Like",
  "listening.mp3": "Listening",
  "manager.mp3": "Manager",
  "medal.mp3": "Medal",
  "media.mp3": "Media",
  "meeting.mp3": "Meeting",
  "melody.mp3": "Melody",
  "message.mp3": "Message",
  "metaphor.mp3": "Metaphor",
  "microscope.mp3": "Microscope",
  "moon.mp3": "Moon",
  "moral.mp3": "Moral",
  "narrative.mp3": "Narrative",
  "nervous.mp3": "Nervous",
  "news.mp3": "News",
  "novel.mp3": "Novel",
  "olympic.mp3": "Olympic",
  "opinion.mp3": "Opinion",
  "painting.mp3": "Painting",
  "piano.mp3": "Piano",
  "plot.mp3": "Plot",
  "poetry.mp3": "Poetry",
  "post.mp3": "Post",
  "poverty.mp3": "Poverty",
  "problem.mp3": "Problem",
  "profile.mp3": "Profile",
  "proud.mp3": "Proud",
  "reason.mp3": "Reason",
  "reference.mp3": "Reference",
  "refugee.mp3": "Refugee",
  "report.mp3": "Report",
  "research.mp3": "Research",
  "result.mp3": "Result",
  "review.mp3": "Review",
  "rights.mp3": "Rights",
  "rocket.mp3": "Rocket",
  "sad.mp3": "Sad",
  "scared.mp3": "Scared",
  "share.mp3": "Share",
  "singer.mp3": "Singer",
  "solution.mp3": "Solution",
  "source.mp3": "Source",
  "speaking.mp3": "Speaking",
  "stadium.mp3": "Stadium",
  "strategy.mp3": "Strategy",
  "success.mp3": "Success",
  "summarise.mp3": "Summarise",
  "sun.mp3": "Sun",
  "support.mp3": "Support",
  "survey.mp3": "Survey",
  "sustainability.mp3": "Sustainability",
  "teamwork.mp3": "Teamwork",
  "theme.mp3": "Theme",
  "tournament.mp3": "Tournament",
  "tradition.mp3": "Tradition",
  "truth.mp3": "Truth",
  "universe.mp3": "Universe",
  "upload.mp3": "Upload",
  "value.mp3": "Value",
  "victory.mp3": "Victory",
  "violin.mp3": "Violin",
  "vocabulary.mp3": "Vocabulary",
  "wisdom.mp3": "Wisdom",
  "writing.mp3": "Writing",
}

async def gen(path, text, voice, rate, pitch):
    if os.path.exists(path):
        print("  atlandi (zaten var):", path); return
    c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await c.save(path)
    print("  olustu:", path)

async def main():
    print("=== ATLAS tanitim sesleri (%d) ===" % len(ATLAS))
    for fn, txt in ATLAS.items():
        await gen("sounds/atlas/"+fn, txt, ATLAS_VOICE, ATLAS_RATE, ATLAS_PITCH)
    print("=== VOCAB kelime sesleri (%d) ===" % len(VOCAB))
    for fn, word in VOCAB.items():
        await gen("sounds/vocab/"+fn, word, VOCAB_VOICE, VOCAB_RATE, VOCAB_PITCH)
    print("\nTAMAMLANDI! Toplam:", len(ATLAS)+len(VOCAB), "ses dosyasi")
    print("Simdi sounds/atlas ve sounds/vocab klasorlerini GitHub depona yukle.")

asyncio.run(main())