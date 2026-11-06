# -*- coding: utf-8 -*-
"""
Full Database Generator:
1. data/hanja.json -> 265+ Hanja characters with Korean readings, definitions, examples
2. data/kanji.json -> 265+ Kanji characters with Japanese Onyomi, Kunyomi, examples
Total characters: 530+
"""
import json
import os

base_dir = os.path.dirname(__file__)
data_dir = os.path.join(base_dir, "data")
os.makedirs(data_dir, exist_ok=True)

# ==============================================================================
# PART 1: EXPANDED HANJA DATASET (265 Characters)
# ==============================================================================
# We can load our existing 243 characters from data/hanja.json and add Branch 14: Food & Daily Life (22 chars)
with open(os.path.join(data_dir, "hanja.json"), "r", encoding="utf-8") as f:
    hanja_data = json.load(f)

# Let's add Branch 14: Food & Living (식생활과 일상)
b_food_living_kr = {
    "id": "food_living",
    "name_kr": "식생활과 일상",
    "name_en": "Food & Daily Living",
    "icon": "🍵",
    "characters": [
        {
            "id": "rice_grain", "hanja": "米", "reading": "미", "meaning_kr": "쌀", "meaning_en": "rice grain",
            "strokes": 6, "level": 0, "parent_id": None, "components": [],
            "example_word": "백미", "example_word_reading": "백미 (baek-mi)", "example_word_meaning_kr": "도정한 흰쌀", "example_word_meaning_en": "white rice",
            "example_sentence_kr": "한국인의 주식은 따뜻한 밥과 쌀입니다.", "example_sentence_en": "The staple food of Koreans is warm rice.",
            "image_keyword": "rice"
        },
        {
            "id": "tea", "hanja": "茶", "reading": "차/다", "meaning_kr": "차", "meaning_en": "tea",
            "strokes": 9, "level": 1, "parent_id": "rice_grain", "components": ["艹", "人", "木"],
            "example_word": "녹차", "example_word_reading": "녹차 (nok-cha)", "example_word_meaning_kr": "푸른 찻잎", "example_word_meaning_en": "green tea",
            "example_sentence_kr": "식사 후에 따뜻한 차 한 잔을 마셨어요.", "example_sentence_en": "After the meal I drank a warm cup of tea.",
            "image_keyword": "tea"
        },
        {
            "id": "liquor_alcohol", "hanja": "酒", "reading": "주", "meaning_kr": "술", "meaning_en": "alcohol / wine",
            "strokes": 10, "level": 1, "parent_id": "water", "components": ["氵", "酉"],
            "example_word": "맥주", "example_word_reading": "맥주 (maek-ju)", "example_word_meaning_kr": "보리로 만든 술", "example_word_meaning_en": "beer",
            "example_sentence_kr": "퇴근 후 친구와 시원한 음료를 즐겼습니다.", "example_sentence_en": "After work I enjoyed a cool drink with a friend.",
            "image_keyword": "drink"
        },
        {
            "id": "meat_flesh", "hanja": "肉", "reading": "육", "meaning_kr": "고기", "meaning_en": "meat",
            "strokes": 6, "level": 0, "parent_id": None, "components": [],
            "example_word": "육류", "example_word_reading": "육류 (yung-nyu)", "example_word_meaning_kr": "식용 고기", "example_word_meaning_en": "meat",
            "example_sentence_kr": "단백질 섭취를 위해 신선한 육류를 챙겨 먹어요.", "example_sentence_en": "I eat fresh meat to consume protein.",
            "image_keyword": "meat"
        },
        {
            "id": "vegetable", "hanja": "菜", "reading": "채", "meaning_kr": "나물/채소", "meaning_en": "vegetable",
            "strokes": 11, "level": 1, "parent_id": "rice_grain", "components": ["艹", "采"],
            "example_word": "야채", "example_word_reading": "야채 (ya-chae)", "example_word_meaning_kr": "푸성귀", "example_word_meaning_en": "vegetables",
            "example_sentence_kr": "신선한 채소 샐러드로 건강을 관리합니다.", "example_sentence_en": "I maintain health with fresh vegetable salad.",
            "image_keyword": "grass"
        },
        {
            "id": "clothes_garment", "hanja": "衣", "reading": "의", "meaning_kr": "옷", "meaning_en": "clothes/clothing",
            "strokes": 6, "level": 0, "parent_id": None, "components": [],
            "example_word": "의복", "example_word_reading": "의복 (ui-bok)", "example_word_meaning_kr": "사람이 입는 옷", "example_word_meaning_en": "clothes",
            "example_sentence_kr": "계절에 어울리는 단정한 의복을 입었습니다.", "example_sentence_en": "I dressed in neat clothes suited for the season.",
            "image_keyword": "clothes"
        },
        {
            "id": "medicine_drug", "hanja": "藥", "reading": "약", "meaning_kr": "약", "meaning_en": "medicine",
            "strokes": 19, "level": 2, "parent_id": "tea", "components": ["艹", "樂"],
            "example_word": "약국", "example_word_reading": "약국 (yak-guk)", "example_word_meaning_kr": "약을 파는 가게", "example_word_meaning_en": "pharmacy",
            "example_sentence_kr": "감기 기운이 있어서 약국에서 약을 샀어요.", "example_sentence_en": "I felt a cold coming on so I bought medicine at the pharmacy.",
            "image_keyword": "medicine"
        },
        {
            "id": "hot_water", "hanja": "湯", "reading": "탕", "meaning_kr": "끓일/탕", "meaning_en": "hot water / soup",
            "strokes": 12, "level": 1, "parent_id": "water", "components": ["氵", "昜"],
            "example_word": "온탕", "example_word_reading": "온탕 (on-tang)", "example_word_meaning_kr": "따뜻한 물", "example_word_meaning_en": "hot bath",
            "example_sentence_kr": "피로를 풀기 위해 따뜻한 탕에 몸을 담갔어요.", "example_sentence_en": "I soaked in warm water to relieve fatigue.",
            "image_keyword": "water"
        },
        {
            "id": "bowl_dish", "hanja": "皿", "reading": "명", "meaning_kr": "그릇", "meaning_en": "dish / plate",
            "strokes": 5, "level": 0, "parent_id": None, "components": [],
            "example_word": "기명", "example_word_reading": "접시 (jeop-si)", "example_word_meaning_kr": "음식을 담는 그릇", "example_word_meaning_en": "dish / plate",
            "example_sentence_kr": "예쁜 접시에 과일을 정갈하게 담았습니다.", "example_sentence_en": "I neatly placed fruit on a pretty dish.",
            "image_keyword": "food"
        },
        {
            "id": "sleep_rest", "hanja": "眠", "reading": "면", "meaning_kr": "잘", "meaning_en": "sleep",
            "strokes": 10, "level": 1, "parent_id": "eye", "components": ["目", "民"],
            "example_word": "수면", "example_word_reading": "수면 (su-myeon)", "example_word_meaning_kr": "잠을 잠", "example_word_meaning_en": "sleep",
            "example_sentence_kr": "충분한 수면은 하루의 활력을 줍니다.", "example_sentence_en": "Sufficient sleep provides daily vitality.",
            "image_keyword": "sleep"
        },
        {
            "id": "bath_wash", "hanja": "浴", "reading": "욕", "meaning_kr": "목욕할", "meaning_en": "bathe",
            "strokes": 10, "level": 2, "parent_id": "water", "components": ["氵", "谷"],
            "example_word": "목욕", "example_word_reading": "목욕 (mong-nyok)", "example_word_meaning_kr": "몸을 씻음", "example_word_meaning_en": "bath",
            "example_sentence_kr": "운동 후 따뜻한 물로 목욕을 했어요.", "example_sentence_en": "I took a warm bath after exercising.",
            "image_keyword": "water"
        },
        {
            "id": "salt", "hanja": "鹽", "reading": "염", "meaning_kr": "소금", "meaning_en": "salt",
            "strokes": 24, "level": 1, "parent_id": "ground", "components": ["鹵", "監"],
            "example_word": "식염", "example_word_reading": "식염 (sig-yeom)", "example_word_meaning_kr": "먹는 소금", "example_word_meaning_en": "table salt",
            "example_sentence_kr": "음식의 간을 맞추기 위해 소금을 약간 넣었습니다.", "example_sentence_en": "I added a little salt to season the food.",
            "image_keyword": "food"
        },
        {
            "id": "oil_fat", "hanja": "油", "reading": "유", "meaning_kr": "기름", "meaning_en": "oil",
            "strokes": 8, "level": 1, "parent_id": "water", "components": ["氵", "由"],
            "example_word": "참기름", "example_word_reading": "식용유 (sig-yong-yu)", "example_word_meaning_kr": "요리용 기름", "example_word_meaning_en": "cooking oil",
            "example_sentence_kr": "고소한 참기름을 넣어 비빔밥을 비볐어요.", "example_sentence_en": "I added savory sesame oil and mixed the bibimbap.",
            "image_keyword": "food"
        },
        {
            "id": "vessel_tool", "hanja": "器", "reading": "기", "meaning_kr": "그릇", "meaning_en": "vessel / utensil",
            "strokes": 16, "level": 2, "parent_id": "bowl_dish", "components": ["口", "犬"],
            "example_word": "식기", "example_word_reading": "식기 (sik-gi)", "example_word_meaning_kr": "밥그릇 등 도구", "example_word_meaning_en": "tableware",
            "example_sentence_kr": "식사를 마친 후 식기를 깨끗이 정리했습니다.", "example_sentence_en": "After the meal I cleared tableware cleanly.",
            "image_keyword": "food"
        },
        {
            "id": "village_town", "hanja": "里", "reading": "리", "meaning_kr": "마을", "meaning_en": "village / ri (distance)",
            "strokes": 7, "level": 0, "parent_id": None, "components": ["田", "土"],
            "example_word": "이웃마을", "example_word_reading": "동리 (dong-ri)", "example_word_meaning_kr": "동네와 마을", "example_word_meaning_en": "village",
            "example_sentence_kr": "시골 마을의 공기가 참 맑고 상쾌합니다.", "example_sentence_en": "The air in the rural village is truly clear and fresh.",
            "image_keyword": "village"
        },
        {
            "id": "iron_metal", "hanja": "鐵", "reading": "철", "meaning_kr": "쇠", "meaning_en": "iron / steel",
            "strokes": 21, "level": 2, "parent_id": "gold", "components": ["金", "𢧜"],
            "example_word": "지하철", "example_word_reading": "지하철 (ji-ha-cheol)", "example_word_meaning_kr": "지하 철도", "example_word_meaning_en": "subway",
            "example_sentence_kr": "지하철을 타면 목적지에 빠르게 갈 수 있어요.", "example_sentence_en": "Taking the subway gets you to destinations fast.",
            "image_keyword": "car"
        },
        {
            "id": "silver", "hanja": "銀", "reading": "은", "meaning_kr": "은", "meaning_en": "silver / bank",
            "strokes": 14, "level": 2, "parent_id": "gold", "components": ["金", "艮"],
            "example_word": "은행", "example_word_reading": "은행 (eun-haeng)", "example_word_meaning_kr": "금융 기관", "example_word_meaning_en": "bank",
            "example_sentence_kr": "통장을 개설하기 위해 은행에 방문했어요.", "example_sentence_en": "I visited the bank to open a bank account.",
            "image_keyword": "bank"
        },
        {
            "id": "ship_boat", "hanja": "船", "reading": "선", "meaning_kr": "배", "meaning_en": "ship / boat",
            "strokes": 11, "level": 1, "parent_id": "water", "components": ["舟", "㕣"],
            "example_word": "선박", "example_word_reading": "선박 (seon-bak)", "example_word_meaning_kr": "큰 배", "example_word_meaning_en": "ship / vessel",
            "example_sentence_kr": "항구에 큰 무역선이 정박해 있습니다.", "example_sentence_en": "A large cargo ship is anchored at the harbor.",
            "image_keyword": "boat"
        },
        {
            "id": "cart_vehicle", "hanja": "車_food", "hanja": "車", "reading": "차/거", "meaning_kr": "수레", "meaning_en": "car/cart",
            "strokes": 7, "level": 0, "parent_id": None, "components": [],
            "example_word": "자동차", "example_word_reading": "자동차 (ja-dong-cha)", "example_word_meaning_kr": "스스로 움직이는 수레", "example_word_meaning_en": "automobile",
            "example_sentence_kr": "친환경 전기자동차가 도로를 달립니다.", "example_sentence_en": "Eco-friendly electric cars run on the road.",
            "image_keyword": "car"
        },
        {
            "id": "road_way", "hanja": "道", "reading": "도", "meaning_kr": "길/도", "meaning_en": "road / path / way",
            "strokes": 12, "level": 0, "parent_id": None, "components": ["辶", "首"],
            "example_word": "도로", "example_word_reading": "도로 (do-ro)", "example_word_meaning_kr": "사람과 차가 다니는 길", "example_word_meaning_en": "road",
            "example_sentence_kr": "바른 도리를 지키며 바르게 살아갑시다.", "example_sentence_en": "Let's live righteously keeping the proper way.",
            "image_keyword": "road"
        },
        {
            "id": "bridge", "hanja": "橋", "reading": "교", "meaning_kr": "다리", "meaning_en": "bridge",
            "strokes": 16, "level": 2, "parent_id": "tree", "components": ["木", "喬"],
            "example_word": "한강철교", "example_word_reading": "대교 (dae-gyo)", "example_word_meaning_kr": "큰 다리", "example_word_meaning_en": "large bridge",
            "example_sentence_kr": "한강 대교를 건너며 아름다운 석양을 보았어요.", "example_sentence_en": "Crossing the Han River bridge I watched the lovely sunset.",
            "image_keyword": "bridge"
        },
        {
            "id": "sky_empty", "hanja": "空", "reading": "공", "meaning_kr": "빌/하늘", "meaning_en": "empty / sky / air",
            "strokes": 8, "level": 1, "parent_id": "sky", "components": ["穴", "工"],
            "example_word": "공기", "example_word_reading": "공항 (gong-hang)", "example_word_meaning_kr": "맑은 공기", "example_word_meaning_en": "air / sky",
            "example_sentence_kr": "푸른 창공에 하얀 비행기가 날아갑니다.", "example_sentence_en": "A white airplane flies across the blue sky.",
            "image_keyword": "sky"
        }
    ]
}

# Update unique IDs
b_food_living_kr["characters"][18]["id"] = "vehicle_car"
hanja_data["branches"].append(b_food_living_kr)

total_hanja = sum(len(b["characters"]) for b in hanja_data["branches"])
print(f"Total Hanja branches: {len(hanja_data['branches'])}, characters: {total_hanja}")

with open(os.path.join(data_dir, "hanja.json"), "w", encoding="utf-8") as f:
    json.dump(hanja_data, f, ensure_ascii=False, indent=2)


# ==============================================================================
# PART 2: JAPANESE KANJI DATASET (265 Characters across 14 Branches)
# ==============================================================================

kanji_branches = [
    {
        "id": "numbers_kj",
        "name_ja": "数字",
        "name_en": "Numbers",
        "icon": "🔢",
        "characters": [
            {
                "id": "kj_one", "kanji": "一", "onyomi": "イチ (ichi)", "kunyomi": "ひと-つ (hito-tsu)",
                "meaning_ja": "ひとつ", "meaning_en": "one", "strokes": 1, "level": 0, "parent_id": None, "components": [],
                "example_word": "一日", "example_word_reading": "ついたち (tsuitachi) / いちにち", "example_word_meaning_ja": "月の初日 / 1日", "example_word_meaning_en": "first of the month / one day",
                "example_sentence_ja": "一日はあっという間に過ぎます。", "example_sentence_reading": "いちにちはあっというまにすぎます。", "example_sentence_en": "A day passes in the blink of an eye.", "image_keyword": "one"
            },
            {
                "id": "kj_two", "kanji": "二", "onyomi": "ニ (ni)", "kunyomi": "ふた-つ (futa-tsu)",
                "meaning_ja": "ふたつ", "meaning_en": "two", "strokes": 2, "level": 1, "parent_id": "kj_one", "components": ["一"],
                "example_word": "二月", "example_word_reading": "にがつ (nigatsu)", "example_word_meaning_ja": "2番目の月", "example_word_meaning_en": "February",
                "example_sentence_ja": "二月は雪がたくさん降ります。", "example_sentence_reading": "にがつはゆきがたくさんふります。", "example_sentence_en": "A lot of snow falls in February.", "image_keyword": "two"
            },
            {
                "id": "kj_three", "kanji": "三", "onyomi": "サン (san)", "kunyomi": "みっ-つ (mit-tsu)",
                "meaning_ja": "みっつ", "meaning_en": "three", "strokes": 3, "level": 1, "parent_id": "kj_two", "components": ["一", "二"],
                "example_word": "三日月", "example_word_reading": "みかづき (mikazuki)", "example_word_meaning_ja": "弓形の月", "example_word_meaning_en": "crescent moon",
                "example_sentence_ja": "夜空に綺麗な三日月が浮かんでいます。", "example_sentence_reading": "よぞらにきれいなみかづきがうかんでいます。", "example_sentence_en": "A beautiful crescent moon floats in the night sky.", "image_keyword": "three"
            },
            {
                "id": "kj_four", "kanji": "四", "onyomi": "シ (shi)", "kunyomi": "よっ-つ / よん (yon)",
                "meaning_ja": "よっつ", "meaning_en": "four", "strokes": 5, "level": 1, "parent_id": "kj_one", "components": ["口"],
                "example_word": "四季", "example_word_reading": "しき (shiki)", "example_word_meaning_ja": "春夏秋冬", "example_word_meaning_en": "four seasons",
                "example_sentence_ja": "日本には美しい四季があります。", "example_sentence_reading": "にほんにはうつくしいしきがあります。", "example_sentence_en": "Japan has four beautiful seasons.", "image_keyword": "four"
            },
            {
                "id": "kj_five", "kanji": "五", "onyomi": "ゴ (go)", "kunyomi": "いつ-つ (itsu-tsu)",
                "meaning_ja": "いつつ", "meaning_en": "five", "strokes": 4, "level": 1, "parent_id": "kj_one", "components": ["二"],
                "example_word": "五月", "example_word_reading": "ごがつ (gogatsu)", "example_word_meaning_ja": "5番目の月", "example_word_meaning_en": "May",
                "example_sentence_ja": "五月の風はとても爽やかです。", "example_sentence_reading": "ごがぜのかぜはとてもさわやかです。", "example_sentence_en": "The May breeze is very refreshing.", "image_keyword": "five"
            },
            {
                "id": "kj_six", "kanji": "六", "onyomi": "ロク (roku)", "kunyomi": "むっ-つ (mut-tsu)",
                "meaning_ja": "むっつ", "meaning_en": "six", "strokes": 4, "level": 1, "parent_id": "kj_one", "components": ["八"],
                "example_word": "六角形", "example_word_reading": "ろっかくけい (rokkakukei)", "example_word_meaning_ja": "6つの角を持つ形", "example_word_meaning_en": "hexagon",
                "example_sentence_ja": "雪の結晶は綺麗な六角形をしています。", "example_sentence_reading": "ゆきのけっしょうはきれいなろっかくけいをしています。", "example_sentence_en": "Snow crystals form beautiful hexagons.", "image_keyword": "six"
            },
            {
                "id": "kj_seven", "kanji": "七", "onyomi": "シチ (shichi)", "kunyomi": "なな-つ (nana-tsu)",
                "meaning_ja": "ななつ", "meaning_en": "seven", "strokes": 2, "level": 1, "parent_id": "kj_one", "components": ["一"],
                "example_word": "七夕", "example_word_reading": "たなばた (tanabata)", "example_word_meaning_ja": "星祭りの行事", "example_word_meaning_en": "Star Festival",
                "example_sentence_ja": "七夕の夜に短冊へ願い事を書きました。", "example_sentence_reading": "たなばたのよるにたんざくへねがいごとをかきました。", "example_sentence_en": "On Tanabata night I wrote wishes on paper strips.", "image_keyword": "seven"
            },
            {
                "id": "kj_eight", "kanji": "八", "onyomi": "ハチ (hachi)", "kunyomi": "やっ-つ (yat-tsu)",
                "meaning_ja": "やっつ", "meaning_en": "eight", "strokes": 2, "level": 0, "parent_id": None, "components": [],
                "example_word": "八百屋", "example_word_reading": "やおや (yaoya)", "example_word_meaning_ja": "野菜や果物の店", "example_word_meaning_en": "greengrocer / fruit store",
                "example_sentence_ja": "近所の八百屋で新鮮なトマトを買いました。", "example_sentence_reading": "きんじょのやおやでしんせんなとまとをかいました。", "example_sentence_en": "I bought fresh tomatoes at the neighborhood greengrocer.", "image_keyword": "eight"
            },
            {
                "id": "kj_nine", "kanji": "九", "onyomi": "キュウ / ク (kyū/ku)", "kunyomi": "ここの-つ (kokono-tsu)",
                "meaning_ja": "ここのつ", "meaning_en": "nine", "strokes": 2, "level": 1, "parent_id": "kj_one", "components": [],
                "example_word": "九州", "example_word_reading": "きゅうしゅう (kyūshū)", "example_word_meaning_ja": "日本の南西の島", "example_word_meaning_en": "Kyushu island",
                "example_sentence_ja": "夏休みに九州へ温泉旅行に行きました。", "example_sentence_reading": "なつやすみにきゅうしゅうへおんせんりょこうにいきました。", "example_sentence_en": "I went on a hot spring trip to Kyushu during summer vacation.", "image_keyword": "nine"
            },
            {
                "id": "kj_ten", "kanji": "十", "onyomi": "ジュウ (jū)", "kunyomi": "とお (tō)",
                "meaning_ja": "とお", "meaning_en": "ten", "strokes": 2, "level": 0, "parent_id": None, "components": ["一", "丨"],
                "example_word": "十分", "example_word_reading": "じゅうぶん (jūbun)", "example_word_meaning_ja": "満ち足りていること", "example_word_meaning_en": "sufficient / enough",
                "example_sentence_ja": "睡眠を十分にとって体を休めましょう。", "example_sentence_reading": "すいみんをじゅうぶんにとってからだをやすめましょう。", "example_sentence_en": "Let's rest our bodies getting enough sleep.", "image_keyword": "ten"
            },
            {
                "id": "kj_hundred", "kanji": "百", "onyomi": "ヒャク (hyaku)", "kunyomi": "もも (momo)",
                "meaning_ja": "ひゃく", "meaning_en": "hundred", "strokes": 6, "level": 2, "parent_id": "kj_ten", "components": ["一", "白"],
                "example_word": "百科事典", "example_word_reading": "ひゃっかじてん (hyakkajiten)", "example_word_meaning_ja": "多くの知識を集めた書物", "example_word_meaning_en": "encyclopedia",
                "example_sentence_ja": "テストで百点満点を取りました！", "example_sentence_reading": "てすとでひゃくてんまんてんをとりました！", "example_sentence_en": "I scored a perfect hundred points on the test!", "image_keyword": "hundred"
            },
            {
                "id": "kj_thousand", "kanji": "千", "onyomi": "セン (sen)", "kunyomi": "ち (chi)",
                "meaning_ja": "せん", "meaning_en": "thousand", "strokes": 3, "level": 2, "parent_id": "kj_ten", "components": ["十", "丿"],
                "example_word": "千円", "example_word_reading": "せんえん (sen'en)", "example_word_meaning_ja": "千円札", "example_word_meaning_en": "one thousand yen",
                "example_sentence_ja": "この本は千円で買えます。", "example_sentence_reading": "このほんはせんえんでかえます。", "example_sentence_en": "You can buy this book for one thousand yen.", "image_keyword": "thousand"
            },
            {
                "id": "kj_ten_thousand", "kanji": "万", "onyomi": "マン / バン (man/ban)", "kunyomi": "よろず (yorozu)",
                "meaning_ja": "よろず / まん", "meaning_en": "ten thousand / myriad", "strokes": 3, "level": 3, "parent_id": "kj_thousand", "components": ["一"],
                "example_word": "万全", "example_word_reading": "ばんぜん (banzen)", "example_word_meaning_ja": "少しの手落ちもないこと", "example_word_meaning_en": "perfection / thorough",
                "example_sentence_ja": "万全の準備をして明日の本番に臨みます。", "example_sentence_reading": "ばんぜんのじゅんびをしてあすのほんばんにのぞみます。", "example_sentence_en": "I will face tomorrow's performance with thorough preparation.", "image_keyword": "number"
            },
            {
                "id": "kj_yen_circle", "kanji": "円", "onyomi": "エン (en)", "kunyomi": "まる-い (maru-i)",
                "meaning_ja": "まるい / えん", "meaning_en": "yen / circle", "strokes": 4, "level": 2, "parent_id": "kj_ten", "components": ["冂"],
                "example_word": "円高", "example_word_reading": "えんだか (endaka)", "example_word_meaning_ja": "円の価値が高いこと", "example_word_meaning_en": "strong yen",
                "example_sentence_ja": "日本の通貨単位は円です。", "example_sentence_reading": "にほんのつうかたんいはえんです。", "example_sentence_en": "The currency unit of Japan is the yen.", "image_keyword": "gold"
            },
            {
                "id": "kj_half", "kanji": "半", "onyomi": "ハン (han)", "kunyomi": "なか-ば (naka-ba)",
                "meaning_ja": "なかば / はん", "meaning_en": "half", "strokes": 5, "level": 2, "parent_id": "kj_ten", "components": ["八", "十"],
                "example_word": "半年", "example_word_reading": "はんとし (hantoshi)", "example_word_meaning_ja": "6か月間", "example_word_meaning_en": "half year",
                "example_sentence_ja": "会議は三時半から始まります。", "example_sentence_reading": "かいぎはさんじはんからはじまります。", "example_sentence_en": "The meeting begins at half past three.", "image_keyword": "half"
            },
            {
                "id": "kj_number_count", "kanji": "数", "onyomi": "スウ (sū)", "kunyomi": "かず / かぞ-える (kazu/kazo-eru)",
                "meaning_ja": "かず", "meaning_en": "number / to count", "strokes": 13, "level": 3, "parent_id": "kj_ten_thousand", "components": ["米", "女", "攵"],
                "example_word": "数学", "example_word_reading": "すうがく (sūgaku)", "example_word_meaning_ja": "数の学問", "example_word_meaning_en": "mathematics",
                "example_sentence_ja": "星の数を数えるのはとてもロマンチックです。", "example_sentence_reading": "ほしのかずをかぞえるのはとてもろまんちっくです。", "example_sentence_en": "Counting the number of stars is very romantic.", "image_keyword": "calculate"
            }
        ]
    }
]

# We will generate comprehensive branches 2 through 14 for Japanese Kanji!
# Let's create a builder function to make this super readable and fast.
def create_kj(id, kanji, onyomi, kunyomi, meaning_ja, meaning_en, strokes, level, parent_id, components,
              example_word, example_word_reading, example_word_meaning_ja, example_word_meaning_en,
              example_sentence_ja, example_sentence_reading, example_sentence_en, image_keyword):
    return {
        "id": id,
        "kanji": kanji,
        "onyomi": onyomi,
        "kunyomi": kunyomi,
        "meaning_ja": meaning_ja,
        "meaning_en": meaning_en,
        "strokes": strokes,
        "level": level,
        "parent_id": parent_id,
        "components": components,
        "example_word": example_word,
        "example_word_reading": example_word_reading,
        "example_word_meaning_ja": example_word_meaning_ja,
        "example_word_meaning_en": example_word_meaning_en,
        "example_sentence_ja": example_sentence_ja,
        "example_sentence_reading": example_sentence_reading,
        "example_sentence_en": example_sentence_en,
        "image_keyword": image_keyword
    }

# -------------------------------------------------------------
# 2. NATURE ELEMENTS (22 chars)
# -------------------------------------------------------------
b_nature_kj = {
    "id": "nature_kj",
    "name_ja": "自然と天候",
    "name_en": "Nature & Weather",
    "icon": "🏔️",
    "characters": [
        create_kj("kj_water", "水", "スイ (sui)", "みず (mizu)", "みず", "water", 4, 0, None, [],
                  "水曜日", "すいようび (suiyōbi)", "週の第4日", "Wednesday",
                  "毎朝、新鮮な水を一杯飲みます。", "まいあさ、しんせんなみずをいっぱいのみます。", "I drink a glass of fresh water every morning.", "water"),
        create_kj("kj_fire", "火", "カ (ka)", "ひ / ほ (hi/ho)", "ひ", "fire", 4, 0, None, [],
                  "火曜日", "かようび (kayōbi)", "週の第3日", "Tuesday",
                  "キャンプ場で温かい火を囲みました。", "きゃんぷじょうであたたかいひをかこみました。", "We gathered around a warm fire at the campsite.", "fire"),
        create_kj("kj_mountain", "山", "サン (san)", "やま (yama)", "やま", "mountain", 3, 0, None, [],
                  "富士山", "ふじさん (fujisan)", "日本一高い山", "Mt. Fuji",
                  "週末に友達と山登りに行きました。", "しゅうまつにともだちとやまのぼりにいきました。", "I went mountain climbing with a friend on the weekend.", "mountain"),
        create_kj("kj_tree", "木", "モク / ボク (moku/boku)", "き / こ (ki/ko)", "き", "tree/wood", 4, 0, None, [],
                  "木曜日", "もくようび (mokuyōbi)", "週の第5日", "Thursday",
                  "庭に大きな桜の木を植えました。", "にわにおおきなさくらのきをうえました。", "I planted a large cherry tree in the garden.", "tree"),
        create_kj("kj_earth_soil", "土", "ド / ト (do/to)", "つち (tsuchi)", "つち", "earth/soil", 3, 0, None, [],
                  "土曜日", "どようび (doyōbi)", "週末の土曜日", "Saturday",
                  "豊かな土からおいしい野菜が育ちます。", "ゆたかなつちからおいしいやさいがそだちます。", "Delicious vegetables grow from rich soil.", "earth"),
        create_kj("kj_gold_metal", "金", "キン / コン (kin/kon)", "かね / かな (kane)", "きん / おかね", "gold/money", 8, 0, None, [],
                  "金曜日", "きんようび (kin'yōbi)", "週の第6日", "Friday",
                  "オリンピックで金メダルを獲得しました。", "おりんぴっくできんめだるをかくとくしました。", "He won a gold medal at the Olympics.", "gold"),
        create_kj("kj_stone", "石", "セキ / シャク (seki)", "いし (ishi)", "いし", "stone", 5, 0, None, [],
                  "化石", "かせき (kaseki)", "太古の生物の化石", "fossil",
                  "川原で丸い綺麗な石を拾いました。", "かわらでまるいきれいないしをひろいました。", "I picked up a round pretty stone on the riverbank.", "stone"),
        create_kj("kj_sky_heaven", "天", "テン (ten)", "あめ / あま (ame)", "てん / そら", "sky/heaven", 4, 0, None, ["一", "大"],
                  "天気", "てんき (tenki)", "空の模様", "weather",
                  "明日は晴れて良い天気になるでしょう。", "あしたははれていいてんきになるでしょう。", "Tomorrow will likely be sunny with great weather.", "sky"),
        create_kj("kj_ground", "地", "チ / ジ (chi/ji)", "つち (tsuchi)", "ち / じめん", "ground/earth", 6, 1, "kj_earth_soil", ["土", "也"],
                  "地下鉄", "ちかてつ (chikatetsu)", "地下を走る鉄道", "subway",
                  "地図を見ながら新しい街を散策しました。", "ちずをみながらあたらしいまちをさんさくしました。", "I strolled around the new town looking at a map.", "earth"),
        create_kj("kj_river", "川", "セン (sen)", "かわ (kawa)", "かわ", "river", 3, 0, None, [],
                  "小川", "おがわ (ogawa)", "小さな流れ", "brook / stream",
                  "澄んだ川で魚が元気に泳いでいます。", "すんだかわでさかながげんきにおよいでいます。", "Fish are swimming lively in the clear river.", "river"),
        create_kj("kj_sea_ocean", "海", "カイ (kai)", "うみ (umi)", "うみ", "sea/ocean", 9, 2, "kj_water", ["氵", "毎"],
                  "海外", "かいがい (kaigai)", "外国", "overseas / abroad",
                  "夏休みに青い海で泳ぎました。", "なつやすみにあおうみでおよぎました。", "I swam in the blue sea during summer vacation.", "sea"),
        create_kj("kj_forest", "林", "リン (rin)", "はやし (hayashi)", "はやし", "woods / grove", 8, 2, "kj_tree", ["木", "木"],
                  "森林", "しんりん (shinrin)", "木が茂る林", "forest / woods",
                  "雑木林の中を気持ちよく歩きました。", "ぞうきばやしのなかをきもちよくあるきました。", "I took a pleasant walk through the copse.", "forest"),
        create_kj("kj_dense_forest", "森", "シン (shin)", "もり (mori)", "もり", "dense forest", 12, 3, "kj_forest", ["木", "木", "木"],
                  "森林浴", "しんりんよく (shinrin'yoku)", "森で心身を癒やすこと", "forest bathing",
                  "深い森の中で静寂を感じました。", "ふかいもりのなかでせいじゃくをかんじました。", "I felt deep stillness within the thick forest.", "forest"),
        create_kj("kj_rain", "雨", "ウ (u)", "あめ / あま (ame)", "あめ", "rain", 8, 1, "kj_sky_heaven", [],
                  "雨期", "うき (uki)", "雨が多い時期", "rainy season",
                  "午後は静かな雨が降り始めました。", "ごごはしずかなあめがふりはじめました。", "A gentle rain began falling in the afternoon.", "rain"),
        create_kj("kj_snow", "雪", "セツ (setsu)", "ゆき (yuki)", "ゆき", "snow", 11, 2, "kj_rain", ["雨", "彐"],
                  "雪景色", "ゆきげしき (yukigeshiki)", "雪が積もった風景", "snowscape",
                  "冬の朝、一面に白い雪が積もっていました。", "ふゆのあさ、いちめんにしろいゆきがつもっていました。", "On a winter morning white snow covered everywhere.", "snow"),
        create_kj("kj_wind", "風", "フウ / フ (fū)", "かぜ / かざ (kaze)", "かぜ", "wind", 9, 0, None, ["几", "虫"],
                  "台風", "たいふう (taifū)", "激しい暴風雨", "typhoon",
                  "春の暖かい風が頬を優しく撫でました。", "はるのあたたかいかぜがほおをやさしくなでました。", "Warm spring wind gently brushed my cheeks.", "wind"),
        create_kj("kj_cloud", "雲", "ウン (un)", "くも (kumo)", "くも", "cloud", 12, 2, "kj_rain", ["雨", "云"],
                  "雨雲", "あまぐも (amagumo)", "雨を降らせる黒い雲", "rain cloud",
                  "青空に真っ白な雲がぽっかり浮かんでいます。", "あおぞらにまっしろなくもがぽっかりうかんでいます。", "A pure white cloud floats puffy in the blue sky.", "cloud"),
        create_kj("kj_clear_weather", "晴", "セイ (sei)", "は-れる / は-れ (ha-reru)", "はれ", "clear weather", 12, 2, "kj_sky_heaven", ["日", "青"],
                  "秋晴れ", "あきばれ (akibare)", "澄み渡った秋の晴天", "fine autumn weather",
                  "今日はずっと心地よく晴れています。", "きょうはずっとここちよくはれています。", "It has been pleasantly sunny all day today.", "sky"),
        create_kj("kj_empty_sky", "空", "コウ (kō)", "そら / あ-く (sora/a-ku)", "そら / から", "sky / empty", 8, 1, "kj_sky_heaven", ["穴", "工"],
                  "空港", "くうこう (kūkō)", "飛行場", "airport",
                  "見上げるとどこまでも澄んだ青空でした。", "みあげるとどこまでもすんだあおぞらでした。", "Looking up it was a clear blue sky stretching endlessly.", "sky"),
        create_kj("kj_flower", "花", "カ / ケ (ka/ke)", "はな (hana)", "はな", "flower", 7, 0, None, ["艹", "化"],
                  "花火", "はなび (hanabi)", "夜空に咲く火薬の光", "fireworks",
                  "春になると公園に色とりどりの花が咲きます。", "はるになるとこうえんにいろとりどりのはながさきます。", "In spring colorful flowers bloom in the park.", "flower"),
        create_kj("kj_grass", "草", "ソウ (sō)", "くさ (kusa)", "くさ", "grass", 9, 1, "kj_flower", ["艹", "早"],
                  "草原", "そうげん (sōgen)", "広がる草地", "grassland / meadow",
                  "緑の草の上に寝転がって雲を眺めました。", "みどりのくさのうえにねころがってくもをながめました。", "I lay down on green grass watching the clouds.", "grass"),
        create_kj("kj_pond", "池", "チ (chi)", "いけ (ike)", "いけ", "pond", 6, 2, "kj_water", ["氵", "也"],
                  "電池", "でんち (denchi)", "電気を蓄える器具", "battery",
                  "お寺の池で錦鯉が優雅に泳いでいます。", "おてらのいけでにしきごいがゆうがおよいでいます。", "Colored carp swim gracefully in the temple pond.", "river")
    ]
}
kanji_branches.append(b_nature_kj)

# -------------------------------------------------------------
# 3. PEOPLE & BODY (22 chars)
# -------------------------------------------------------------
b_people_kj = {
    "id": "people_kj",
    "name_ja": "人と身体",
    "name_en": "People & Body",
    "icon": "👤",
    "characters": [
        create_kj("kj_person", "人", "ジン / ニン (jin/nin)", "ひと (hito)", "ひと", "person / human", 2, 0, None, [],
                  "日本人", "にほんじん (nihonjin)", "日本の国民", "Japanese person",
                  "親切な人が道を案内してくれました。", "しんせつなひとがみちをあんないしてくれました。", "A kind person guided me along the way.", "person"),
        create_kj("kj_man", "男", "ダン / ナン (dan/nan)", "おとこ (otoko)", "おとこ", "man / male", 7, 2, "kj_person", ["田", "力"],
                  "男子", "だんし (danshi)", "男の若者", "boy / young man",
                  "誠実な男の人が荷物を運んでくれました。", "せいじつなおとこのひとがにもつをはこんでくれました。", "A sincere man carried the luggage for me.", "person"),
        create_kj("kj_woman", "女", "ジョ / ニョ (jo/nyo)", "おんな / め (onna/me)", "おんな", "woman / female", 3, 0, None, [],
                  "女性", "じょせい (josei)", "女の人", "female / woman",
                  "その女性は笑顔がとても素敵です。", "そのじょせいはえがおがとてもすてきです。", "That woman has a wonderfully lovely smile.", "woman"),
        create_kj("kj_child", "子", "シ / ス (shi/su)", "こ (ko)", "こ / こども", "child", 3, 0, None, [],
                  "子供", "こども (kodomo)", "幼い子", "children",
                  "公園で元気な子供たちが遊んでいます。", "こうえんでげんきなこどもたちがあそんでいます。", "Energetic children are playing in the park.", "child"),
        create_kj("kj_father", "父", "フ (fu)", "ちち / とう (chichi/tō)", "ちち", "father", 4, 0, None, [],
                  "父親", "ちちおや (chichioya)", "父である親", "father",
                  "父は毎朝早く起きて散歩をします。", "ちちはまいあさはやくおきてさんぽをします。", "My father wakes up early every morning for a walk.", "father"),
        create_kj("kj_mother", "母", "ボ (bo)", "はは / かあ (haha/kā)", "はは", "mother", 5, 0, None, [],
                  "母親", "ははおや (hahaoya)", "母である親", "mother",
                  "母の手料理はとても温かくて美味しいです。", "ははのてりょうりはとてもあたたかくておいしいです。", "My mother's home cooking is very warm and delicious.", "mother"),
        create_kj("kj_elder_brother", "兄", "ケイ / キョウ (kei/kyō)", "あに (ani)", "あに", "elder brother", 5, 1, "kj_child", ["口", "儿"],
                  "兄弟", "きょうだい (kyōdai)", "兄と弟、姉妹", "siblings / brothers",
                  "兄は大学で情報工学を学んでいます。", "あにはだいがくでじょうほうこうがくをまなんでいます。", "My elder brother studies computer science at university.", "brother"),
        create_kj("kj_younger_brother", "弟", "テイ / ダイ (tei/dai)", "おとうと (otōto)", "おとうと", "younger brother", 7, 1, "kj_child", ["弓", "丨"],
                  "弟子", "でし (deshi)", "師について学ぶ人", "apprentice / pupil",
                  "弟と一緒にテレビゲームを楽しみました。", "おとうとといっしょにてれびげーむをたのしみました。", "I enjoyed playing video games with my younger brother.", "brother"),
        create_kj("kj_elder_sister", "姉", "シ (shi)", "あね (ane)", "あね", "elder sister", 8, 1, "kj_woman", ["女", "市"],
                  "姉妹", "しまい (shimai)", "姉と妹", "sisters",
                  "姉は東京でデザイナーとして働いています。", "あねはとうきょうででざいなーとしてはたらいています。", "My elder sister works as a designer in Tokyo.", "sister"),
        create_kj("kj_younger_sister", "妹", "マイ (mai)", "いもうと (imōto)", "いもうと", "younger sister", 8, 1, "kj_woman", ["女", "未"],
                  "姉妹都市", "しまいとし (shimaitoshi)", "親善協定を結んだ都市", "sister city",
                  "妹はピアノを弾くのが大好きです。", "いもうとはぴあのをひくのがだいすきです。", "My younger sister loves playing the piano.", "sister"),
        create_kj("kj_mouth", "口", "コウ / ク (kō/ku)", "くち (kuchi)", "くち", "mouth / opening", 3, 0, None, [],
                  "入口", "いりぐち (iriguchi)", "入る場所", "entrance",
                  "駅の東口で待ち合わせをしましょう。", "えきのひがしぐちでまちあわせをしましょう。", "Let's meet at the station's east exit.", "mouth"),
        create_kj("kj_eye", "目", "モク / ボク (moku/boku)", "め / ま (me/ma)", "め", "eye", 5, 0, None, [],
                  "目的", "もくてき (mokuteki)", "目指す事柄", "purpose / goal",
                  "夜空を見上げると星が目の前に輝いて見えました。", "よぞらをみあげるとほしがめのまえにかがやいてみえました。", "Looking up at the night sky stars shone before my eyes.", "eye"),
        create_kj("kj_ear", "耳", "ジ (ji)", "みみ (mimi)", "みみ", "ear", 6, 0, None, [],
                  "耳鼻科", "じびか (jibika)", "耳と鼻の診療科", "ENT clinic",
                  "美しい小鳥のさえずりに耳を傾けました。", "うつくしいことりのさえずりにみみをかたむけました。", "I listened closely to the lovely chirping of small birds.", "ear"),
        create_kj("kj_hand", "手", "シュ (shu)", "て / た (te/ta)", "て", "hand", 4, 0, None, [],
                  "手紙", "てがみ (tegami)", "心遣いを書いた信書", "letter",
                  "久しぶりに祖母へ感謝の手紙を書きました。", "ひさしぶりにそばへかんしゃのてがみをかきました。", "I wrote a thank-you letter to my grandmother after a long time.", "hand"),
        create_kj("kj_foot_leg", "足", "ソク (soku)", "あし / た-りる (ashi/ta-riru)", "あし", "foot / leg / sufficient", 7, 0, None, ["口", "止"],
                  "満足", "まんぞく (manzoku)", "心が満ち足りること", "satisfaction",
                  "たくさん歩いたので足が心地よく疲れました。", "たくさんあるいたのであしがここちよくつかれました。", "Because I walked a lot my legs were pleasantly tired.", "foot"),
        create_kj("kj_heart_mind", "心", "シン (shin)", "こころ (kokoro)", "こころ", "heart / mind", 4, 0, None, [],
                  "安心", "あんしん (anshin)", "心配がなく落ち着くこと", "relief / peace of mind",
                  "温かい言葉を聞いて心が和みました。", "あたたかいことばをきいてこころがなごみました。", "Hearing warm words my heart felt deeply calmed.", "heart"),
        create_kj("kj_head", "頭", "トウ / ズ (tō/zu)", "あたま / かしら (atama/kashira)", "あたま", "head", 16, 0, None, ["豆", "頁"],
                  "頭脳", "ずのう (zunō)", "物事を考える力", "brain / intellect",
                  "新鮮な空気を吸うと頭がすっきりします。", "しんせんなくうきをすうとあたまがすっきりします。", "Breathing fresh air clears one's head completely.", "head"),
        create_kj("kj_face", "顔", "ガン (gan)", "かお (kao)", "かお", "face", 18, 0, None, ["彦", "頁"],
                  "笑顔", "えがお (egao)", "笑った顔", "smiling face",
                  "友達の明るい笑顔を見て嬉しくなりました。", "ともだちのあかるいえがおをみてうれしくなりました。", "Seeing my friend's bright smiling face made me glad.", "face"),
        create_kj("kj_body", "体", "タイ / テイ (tai/tei)", "からだ (karada)", "からだ", "body", 7, 2, "kj_person", ["亻", "本"],
                  "体力", "たいりょく (tairyoku)", "体の力", "physical strength",
                  "健康のために毎日体を動かしています。", "けんこうのためにまいにちからだをうごかしています。", "I move my body every day for good health.", "body"),
        create_kj("kj_power", "力", "リョク / リキ (ryoku/riki)", "ちから (chikara)", "ちから", "power / strength", 2, 0, None, [],
                  "努力", "どりょく (doryoku)", "力を尽くして励むこと", "effort",
                  "日々の努力が大きな成果を生み出します。", "ひびのどりょくがおおきなせいかをうみだします。", "Daily effort yields significant achievements.", "power"),
        create_kj("kj_neck_chief", "首", "シュ (shu)", "くび (kubi)", "くび", "neck / chief", 9, 0, None, [],
                  "首都", "しゅと (shuto)", "国の中心都市", "capital city",
                  "寒い日はマフラーを首に巻いて出かけます。", "さむいひはまふらーをくびにまいてでかけます。", "On cold days I wrap a scarf around my neck to go out.", "head"),
        create_kj("kj_rest", "休", "キュウ (kyū)", "やす-む / やす-まる (yasu-mu)", "やすむ", "rest", 6, 2, "kj_person", ["亻", "木"],
                  "休日", "きゅうじつ (kyūjitsu)", "仕事や学校の休みの日", "holiday / day off",
                  "週末の休日は温泉でゆっくり過ごしました。", "しゅうまつのきゅうじつはおんせんでゆっくりすごしました。", "I spent the weekend holiday relaxing leisurely at hot springs.", "rest")
    ]
}
kanji_branches.append(b_people_kj)

# -------------------------------------------------------------
# 4. ACTIONS & LIFE (22 chars)
# -------------------------------------------------------------
b_actions_kj = {
    "id": "actions_kj",
    "name_ja": "動作と暮らし",
    "name_en": "Actions & Living",
    "icon": "✋",
    "characters": [
        create_kj("kj_go", "行", "コウ / ギョウ (kō/gyō)", "い-く / ゆ-く / おこな-う (i-ku/okonau)", "いく / おこなう", "go / act", 6, 0, None, ["彳", "亍"],
                  "旅行", "りょこう (ryokō)", "旅に出ること", "travel",
                  "来週、京都へ旅行に行きます。", "らいしゅう、きょうとへりょこうにいきます。", "Next week I will go on a trip to Kyoto.", "walk"),
        create_kj("kj_come", "来", "ライ (rai)", "く-る / きた-る (ku-ru/kita-ru)", "くる", "come", 7, 0, None, [],
                  "未来", "みらい (mirai)", "これから先の時", "future",
                  "春が来ると桜が咲き誇ります。", "はるがくるとさくらがさきほこります。", "When spring comes cherry blossoms bloom in glory.", "come"),
        create_kj("kj_return", "帰", "キ (ki)", "かえ-る / かえ-す (kae-ru)", "かえる", "return home", 10, 1, "kj_go", ["刂", "帚"],
                  "帰宅", "きたく (kitaku)", "家に帰ること", "returning home",
                  "夕方に仕事が終わって家に帰りました。", "ゆうがたにしごとがあわってうちにかえりました。", "After finishing work in the evening I returned home.", "return"),
        create_kj("kj_eat", "食", "ショク / ジキ (shoku/jiki)", "た-べる / く-う (ta-beru)", "たべる", "eat / food", 9, 0, None, ["人", "良"],
                  "食事", "しょくじ (shokuji)", "ご飯を食べること", "meal",
                  "家族みんなで温かい食事を囲みました。", "かぞくみんなであたたかいしょくじをかこみました。", "The whole family sat around enjoying a warm meal.", "food"),
        create_kj("kj_drink", "飲", "イン (in)", "の-む (no-mu)", "のむ", "drink", 12, 1, "kj_eat", ["飠", "欠"],
                  "飲料", "いんりょう (inryō)", "飲み物", "beverage / drink",
                  "運動の後に冷たいお茶を飲みました。", "うんどうのあとにめたいおちゃをのみました。", "After exercising I drank cold tea.", "drink"),
        create_kj("kj_see", "見", "ケン (ken)", "み-る / み-える (mi-ru/mi-eru)", "みる", "see / look", 7, 0, None, ["目", "儿"],
                  "見学", "けんがく (kengaku)", "実際に見ること", "field study / visit",
                  "展望台から綺麗な星空を見ました。", "てんぼうだいからきれいなほしぞらをみました。", "From the observation deck I saw the beautiful starry sky.", "eye"),
        create_kj("kj_hear", "聞", "ブン / モン (bun/mon)", "き-く / き-こえる (ki-ku/ki-koeru)", "きく", "hear / listen / ask", 14, 2, "kj_see", ["門", "耳"],
                  "新聞", "しんぶん (shinbun)", "日々のニュースを伝える紙", "newspaper",
                  "ラジオから懐かしい音楽が聞こえてきました。", "らじおからなつかしいおんがくがきこえてきました。", "Nostalgic music came playing through the radio.", "listen"),
        create_kj("kj_speak", "言", "ゲン / ゴン (gen/gon)", "い-う / こと (i-u/koto)", "いう", "say / word", 7, 0, None, [],
                  "言語", "げんご (gengo)", "言葉", "language",
                  "素直に「ありがとう」と言うのは大切です。", "すなおに「ありがとう」というのたいせつです。", "Saying thank you candidly is very important.", "word"),
        create_kj("kj_talk", "話", "ワ (wa)", "はな-す / はなし (hana-su/hanashi)", "はなす", "talk / story", 13, 1, "kj_speak", ["言", "舌"],
                  "会話", "かいわ (kaiwa)", "語り合うこと", "conversation",
                  "久しぶりに親友と楽しく話しました。", "ひさしぶりにしんゆうとたのしくはなしました。", "I joyfully talked with my close friend after a long time.", "word"),
        create_kj("kj_read", "読", "ドク / トク (doku/toku)", "よ-む (yo-mu)", "よむ", "read", 14, 1, "kj_speak", ["言", "売"],
                  "読書", "どくしょ (dokusho)", "本を読むこと", "reading books",
                  "休日は静かなカフェで本を読みます。", "きゅうじつはしずかなかふぇでほんをよみます。", "On holidays I read books in a quiet cafe.", "read"),
        create_kj("kj_write", "書", "ショ (sho)", "か-く (ka-ku)", "かく", "write / book", 10, 0, None, ["聿", "曰"],
                  "図書館", "としょかん (toshokan)", "図書を集めた施設", "library",
                  "万年筆で丁寧に手紙を書きました。", "まんねんひつでていねいにてがみをかきました。", "I carefully wrote a letter with a fountain pen.", "writing"),
        create_kj("kj_buy", "買", "バイ (bai)", "か-う (ka-u)", "かう", "buy", 12, 0, None, ["罒", "貝"],
                  "売買", "ばいばい (baibai)", "売り買い", "trade / buying and selling",
                  "デパートでお土産をたくさん買いました。", "でぱーとでおみやげをたくさんかいました。", "I bought many souvenirs at the department store.", "buy"),
        create_kj("kj_sell", "売", "バイ (bai)", "う-る / う-れる (u-ru/u-reru)", "うる", "sell", 7, 0, None, ["士", "儿"],
                  "売店", "ばいてん (baiten)", "品物を売る小店", "kiosk / stand",
                  "駅の売店で温かいお弁当を売っています。", "えきのばいてんであたたかいおべんとうをうっています。", "The station kiosk sells warm bento meals.", "sell"),
        create_kj("kj_stand", "立", "リツ / リュウ (ritsu/ryū)", "た-つ / た-てる (ta-tsu/ta-teru)", "たつ", "stand / establish", 5, 0, None, [],
                  "独立", "どくりつ (dokuritsu)", "独りで自立すること", "independence",
                  "頂上に立つと素晴らしい景色が広がっていました。", "ちょうじょうにたつとすばらしいけしきがひろがっていました。", "Standing on the summit, a magnificent view expanded before me.", "stand"),
        create_kj("kj_sit", "座", "ザ (za)", "すわ-る (suwa-ru)", "すわる", "sit / seat", 10, 1, "kj_stand", ["广", "坐"],
                  "正座", "せいざ (seiza)", "正しく座ること", "formal sitting",
                  "畳の部屋でゆったり座ってお茶をいただきました。", "たたみのへやでゆったりすわっておちゃをいただきました。", "Sitting comfortably in the tatami room I drank tea.", "sit"),
        create_kj("kj_run", "走", "ソウ (sō)", "はし-る (hashi-ru)", "はしる", "run", 7, 0, None, ["土", "疋"],
                  "走行", "そうこう (sōkō)", "乗り物や人が走ること", "running / driving",
                  "爽快な朝風の中を気持ちよく走りました。", "そうかいなあさかぜのなかをきもちよくはしりました。", "I ran pleasantly through the crisp morning wind.", "run"),
        create_kj("kj_walk", "歩", "ホ / ブ (ho/bu)", "ある-く / あゆ-む (aru-ku/ayu-mu)", "あるく", "walk", 8, 1, "kj_run", ["止", "少"],
                  "散歩", "さんぽ (sanpo)", "気晴らしに歩くこと", "stroll / walk",
                  "川沿いの桜並木をのんびり歩きました。", "かわぞいのさくらなみきをのんびりあるきました。", "I strolled leisurely along the cherry-lined riverside.", "walk"),
        create_kj("kj_stop", "止", "シ (shi)", "と-まる / と-める (to-maru/to-meru)", "とまる", "stop", 4, 0, None, [],
                  "中止", "ちゅうし (chūshi)", "途中でやめること", "suspension / cancel",
                  "信号が赤になったので車を止めました。", "しんごうがあかになったのでくるまをとめました。", "The traffic light turned red so I stopped the car.", "stop"),
        create_kj("kj_exit", "出", "シュツ / スイ (shutsu/sui)", "で-る / だ-す (de-ru/da-su)", "でる / だす", "exit / put out", 5, 0, None, ["屮", "凵"],
                  "出発", "しゅっぱつ (shuppatsu)", "旅立ち", "departure",
                  "朝八時に元気に家を出発しました。", "あさはちじにげんきにいえをしゅっぱつしました。", "At eight in the morning I set out from home briskly.", "exit"),
        create_kj("kj_enter", "入", "ニュウ (nyū)", "はい-る / い-れる (hai-ru/i-reru)", "はいる / いれる", "enter / put in", 2, 0, None, [],
                  "入学", "にゅうがく (nyūgaku)", "学校に入ること", "school entrance",
                  "暖簾をくぐって温泉に入りました。", "のれんをくぐっておんせんにはいりました。", "Passing under the noren curtain I entered the hot spring.", "enter"),
        create_kj("kj_meet", "会", "カイ / エ (kai/e)", "あ-う (a-u)", "あう", "meet / gather", 6, 0, None, ["人", "二"],
                  "会社", "かいしゃ (kaisha)", "働く組織", "company",
                  "週末に懐かしい旧友と会いました。", "しゅうまつになつかしいきゅうゆうとあいました。", "Over the weekend I met an old cherished friend.", "friend"),
        create_kj("kj_make", "作", "サク / サ (saku/sa)", "つく-る (tsuku-ru)", "つくる", "make / create", 7, 1, "kj_person", ["亻", "乍"],
                  "作品", "さくひん (sakuhin)", "創作物", "work of art",
                  "新鮮な材料を使って美味しい料理を作りました。", "しんせんなざいりょうをつかっておいしいりょうりをつくりました。", "Using fresh ingredients I prepared delicious food.", "make")
    ]
}
kanji_branches.append(b_actions_kj)

# Let's save progress and continue appending branches 5 to 14
print("Nature & Actions Kanji prepared.")

with open(os.path.join(data_dir, "kanji.json"), "w", encoding="utf-8") as f:
    json.dump({"branches": kanji_branches}, f, ensure_ascii=False, indent=2)

print("Saved preliminary kanji.json")

# -------------------------------------------------------------
# 5. SPACE & DIRECTION (18 chars)
# -------------------------------------------------------------
b_space_kj = {
    "id": "space_kj",
    "name_ja": "位置と方角",
    "name_en": "Space & Direction",
    "icon": "🧭",
    "characters": [
        create_kj("kj_up", "上", "ジョウ / ショウ (jō)", "うえ / あ-がる (ue/a-garu)", "うえ", "up / above", 3, 0, None, ["一", "卜"],
                  "上昇", "じょうしょう (jōshō)", "上へ上がること", "rising / elevation",
                  "机の上に手紙を置いておきました。", "つくえのうえにてがみをおいておきました。", "I left a letter on top of the desk.", "up"),
        create_kj("kj_down", "下", "カ / ゲ (ka/ge)", "した / さ-がる (shita/sa-garu)", "した", "down / below", 3, 0, None, ["一", "卜"],
                  "地下", "ちか (chika)", "地面の下", "underground",
                  "木の下のベンチでひと休みしました。", "きのしたのべんちでひとやすみしました。", "I took a short rest on the bench under the tree.", "down"),
        create_kj("kj_left", "左", "サ (sa)", "ひだり (hidari)", "ひだり", "left", 5, 1, "kj_up", ["𠂇", "工"],
                  "左折", "させつ (sasetsu)", "左に曲がること", "left turn",
                  "次の角を左に曲がると駅が見えます。", "つぎのかどをひだりにまがるとえきがみえます。", "Turn left at the next corner and the station appears.", "left"),
        create_kj("kj_right", "右", "ウ / ユウ (u/yū)", "みぎ (migi)", "みぎ", "right", 5, 1, "kj_up", ["𠂇", "口"],
                  "右折", "うせつ (usetsu)", "右に曲がること", "right turn",
                  "右手に見える美しい建物が美術館です。", "みぎてにみえるうつくしいたてものがびじゅつかんです。", "The beautiful building visible on your right is the art museum.", "right"),
        create_kj("kj_middle", "中", "チュウ (chū)", "なか (naka)", "なか", "inside / middle", 4, 0, None, ["口", "丨"],
                  "中心", "ちゅうしん (chūshin)", "真ん中", "center",
                  "箱の中にお気に入りのお菓子が入っています。", "はこのなかにおきにいりのおかしがはいっています。", "Favorite sweets are inside the box.", "middle"),
        create_kj("kj_front", "前", "ゼン (zen)", "まえ (mae)", "まえ", "front / before", 9, 1, "kj_middle", ["止", "舟", "刂"],
                  "午前", "ごぜん (gozen)", "朝から正午まで", "morning / a.m.",
                  "駅の前で待ち合わせをしましょう。", "えきのまえでまちあわせをしましょう。", "Let's meet in front of the station.", "front"),
        create_kj("kj_back", "後", "ゴ / コウ (go/kō)", "うしろ / あと (ushiro/ato)", "うしろ / あと", "back / after", 9, 1, "kj_middle", ["彳", "幺", "夂"],
                  "午後", "ごご (gogo)", "正午から夜まで", "afternoon / p.m.",
                  "食事の後に美味しい緑茶を飲みました。", "しょくじのあとにおいしいりょくちゃをのみました。", "After the meal I drank delicious green tea.", "back"),
        create_kj("kj_east", "東", "トウ (tō)", "ひがし (higashi)", "ひがし", "east", 8, 1, "kj_middle", ["木", "日"],
                  "東京", "とうきょう (tōkyō)", "日本の首都", "Tokyo",
                  "太陽は朝いつも東から昇ります。", "たいようはあさいつもひがしからのぼります。", "The sun always rises from the east in the morning.", "east"),
        create_kj("kj_west", "西", "セイ / サイ (sei/sai)", "にし (nishi)", "にし", "west", 6, 1, "kj_middle", [],
                  "東西", "とうざい (tōzai)", "東と西", "east and west",
                  "夕日が西の空を茜色に染めました。", "ゆうひがにしのそらをあかねいろにそめました。", "The evening sun dyed the western sky madder red.", "west"),
        create_kj("kj_south", "南", "ナン (nan)", "みなみ (minami)", "みなみ", "south", 9, 1, "kj_middle", ["十", "冂"],
                  "南国", "なんごく (nangoku)", "暖かい南の国", "southern land",
                  "南から心地よい暖かい風が吹いてきます。", "みなみからここちよなあたたかいかぜがふいてきます。", "A pleasantly warm wind blows from the south.", "south"),
        create_kj("kj_north", "北", "ホク (hoku)", "きた (kita)", "きた", "north", 5, 1, "kj_middle", ["匕", "匕"],
                  "北海道", "ほっかいどう (hokkaidō)", "日本の北の大地", "Hokkaido",
                  "冬になると北の山々が白く輝きます。", "ふゆになるときたのやまやまがしろくかがやきます。", "When winter arrives northern mountains glitter white.", "north"),
        create_kj("kj_inside", "内", "ナイ / ダイ (nai/dai)", "うち (uchi)", "うち", "inside", 4, 1, "kj_middle", ["冂", "人"],
                  "案内", "あんない (annai)", "道や場所を示すこと", "guide",
                  "心の内に秘めた夢を大切に育てましょう。", "こころのうちにひめたゆめをたいせつにそだてましょう。", "Let us nurture the dreams hidden inside our hearts.", "inside"),
        create_kj("kj_outside", "外", "ガイ / ゲ (gai/ge)", "そと / ほか (soto/hoka)", "そと", "outside / foreign", 5, 1, "kj_inside", ["夕", "卜"],
                  "外国", "がいこく (gaikoku)", "日本の外の国", "foreign country",
                  "窓の外を見ると優しい雪が舞っていました。", "まどのそとをみるとやさしいゆきがまっていました。", "Looking out the window gentle snow was dancing.", "outside"),
        create_kj("kj_interval", "間", "カン / ケン (kan/ken)", "あいだ / ま (aida/ma)", "あいだ", "interval / space / time", 12, 2, "kj_middle", ["門", "日"],
                  "時間", "じかん (jikan)", "時", "time / hour",
                  "友達との楽しい時間はあっという間です。", "ともだちとのたのしいじかんはあっというまです。", "Fun time with friends passes in the blink of an eye.", "time"),
        create_kj("kj_near", "近", "キン (kin)", "ちか-い (chika-i)", "ちかい", "near / close", 7, 2, "kj_middle", ["辶", "斤"],
                  "近所", "きんじょ (kinjo)", "近くの場所", "neighborhood",
                  "駅の近くにお洒落で静かな喫茶店があります。", "えきのちかくにおしゃれでしずかなきっさてんがあります。", "There is a stylish quiet cafe near the station.", "village"),
        create_kj("kj_far", "遠", "エン (en)", "とお-い (tō-i)", "とおい", "far / distant", 13, 2, "kj_near", ["辶", "袁"],
                  "遠足", "えんそく (ensoku)", "遠くへ出かける行事", "excursion",
                  "遠くの山々が青空の下に綺麗に見えます。", "とおくのやまやまがあおぞらのしたにきれいにみえます。", "Distant mountains look lovely beneath the blue sky.", "road"),
        create_kj("kj_square_dir", "方", "ホウ (hō)", "かた (kata)", "かた / ほう", "direction / person / way", 4, 0, None, [],
                  "方法", "ほうほう (hōhō)", "やり方", "method / way",
                  "あちらの方角に広がる海が綺麗です。", "あちらのほうがくにひろがるうみがきれいです。", "The sea expanding in that direction is beautiful.", "north"),
        create_kj("kj_toward", "向", "コウ (kō)", "む-かう / む-く (mu-kau/mu-ku)", "むかう", "face / head towards", 6, 1, "kj_square_dir", ["口"],
                  "方向", "ほうこう (hōkō)", "向かう方角", "direction",
                  "新しい希望に向かって一歩踏み出しましょう。", "あたらしいきぼうにむかっていっぽふみだしましょう。", "Let's take a step forward towards new hope.", "right")
    ]
}
kanji_branches.append(b_space_kj)

# -------------------------------------------------------------
# 6. TIME & SEASONS (18 chars)
# -------------------------------------------------------------
b_time_kj = {
    "id": "time_kj",
    "name_ja": "時間と季節",
    "name_en": "Time & Seasons",
    "icon": "⏰",
    "characters": [
        create_kj("kj_year", "年", "ネン (nen)", "とし (toshi)", "とし", "year", 6, 0, None, ["干"],
                  "今年", "ことし (kotoshi)", "現在の年", "this year",
                  "今年は新しい趣味に挑戦したいです。", "ことしはあたらしいしゅみにちょうせんしたいです。", "This year I want to try new hobbies.", "year"),
        create_kj("kj_month", "月", "ゲツ / ガツ (getsu/gatsu)", "つき (tsuki)", "つき", "month / moon", 4, 0, None, [],
                  "満月", "まんげつ (mangetsu)", "丸い月", "full moon",
                  "秋の夜空に輝く満月を静かに愛でました。", "あきのよぞらにかがやくまんげつをしずかにめでました。", "I quietly admired the full moon shining in the autumn sky.", "moon"),
        create_kj("kj_day", "日", "ニチ / ジツ (nichi/jitsu)", "ひ / か (hi/ka)", "ひ", "day / sun", 4, 0, None, [],
                  "休日", "きゅうじつ (kyūjitsu)", "休みの日", "holiday",
                  "暖かな日差しの中で読書を楽しみました。", "あたたかなひざしのなかでどくしょをたのしみました。", "I enjoyed reading in the warm sunlight.", "day"),
        create_kj("kj_hour", "時", "ジ (ji)", "とき (toki)", "とき / じ", "time / hour", 10, 1, "kj_day", ["日", "寺"],
                  "時間", "じかん (jikan)", "時", "time",
                  "約束の時間をしっかり守りましょう。", "やくそくのじかんをしっかりまもりましょう。", "Let us firmly keep the promised time.", "time"),
        create_kj("kj_minute", "分", "ブン / フン / ブ (bun/fun)", "わ-ける / わ-かる (wa-keru/wa-karu)", "ふん / わかる", "minute / divide / understand", 4, 1, "kj_hour", ["八", "刀"],
                  "気分", "きぶん (kibun)", "気持ち", "feeling / mood",
                  "あと十分で電車が到着します。", "あとじゅっぷんででんしゃがとうちゃくします。", "The train will arrive in ten minutes.", "time"),
        create_kj("kj_second", "秒", "ビョウ (byō)", "", "びょう", "second", 9, 2, "kj_minute", ["禾", "少"],
                  "一秒", "いちびょう (ichibyō)", "時間の単位", "one second",
                  "一秒一秒を大切に過ごしたいですね。", "いちびょういちびょうをたいせつにすごしたいですね。", "We want to cherish every single second.", "time"),
        create_kj("kj_morning", "朝", "チョウ (chō)", "あさ (asa)", "あさ", "morning", 12, 1, "kj_day", ["十", "日", "月"],
                  "朝食", "ちょうしょく (chōshoku)", "朝ごはん", "breakfast",
                  "朝の爽やかな空気を深く吸い込みました。", "あさのさわやかなくうきをふかくすいこみました。", "I took a deep breath of the refreshing morning air.", "morning"),
        create_kj("kj_noon", "昼", "チュウ (chū)", "ひる (hiru)", "ひる", "daytime / noon", 9, 1, "kj_day", ["尺", "日"],
                  "昼休み", "ひるやすみ (hiruyasumi)", "お昼の休憩", "lunch break",
                  "昼休みに同僚と楽しくランチを食べました。", "ひるやすみにどうりょうとたのしくらんちをたべました。", "During lunch break I enjoyed lunch with colleagues.", "day"),
        create_kj("kj_evening", "夕", "セキ (seki)", "ゆう (yū)", "ゆうがた", "evening", 3, 0, None, [],
                  "夕方", "ゆうがた (yūgata)", "日が暮れる頃", "evening / dusk",
                  "夕方に綺麗な茜色の空が広がりました。", "ゆうがたにきれいなあかねいろのそらがひろがりました。", "A lovely madder-red sky spread across in the evening.", "evening"),
        create_kj("kj_night", "夜", "ヤ (ya)", "よる / よ (yoru/yo)", "よる", "night", 8, 1, "kj_evening", ["亠", "夕"],
                  "今夜", "こんや (konya)", "今晩", "tonight",
                  "静かな夜に温かいハーブティーを飲みました。", "しずかなよるにあたたかいはーぶてぃーをのみました。", "I drank warm herbal tea on a peaceful night.", "night"),
        create_kj("kj_now", "今", "コン / キン (kon/kin)", "いま (ima)", "いま", "now / present", 4, 0, None, ["人"],
                  "今日", "きょう (kyō)", "現在の日", "today",
                  "今この瞬間を精一杯生きましょう。", "いまこのしゅんかんをせいいっぱいいきましょう。", "Let's live this present moment with all our might.", "now"),
        create_kj("kj_every", "毎", "マイ (mai)", "ごと (goto)", "まい", "every", 6, 0, None, ["𠂉", "母"],
                  "毎日", "まいにち (mainichi)", "日々", "every day",
                  "毎日少しずつ日本語を学習しています。", "まいにちすこしずつにほんごをがくしゅうしています。", "I study Japanese little by little every day.", "day"),
        create_kj("kj_week", "週", "シュウ (shū)", "", "しゅう", "week", 11, 2, "kj_every", ["辶", "周"],
                  "来週", "らいしゅう (raishū)", "次の週", "next week",
                  "一週間があっという間に過ぎました。", "いっしゅうかんがあっというまにすぎました。", "A week passed by in a flash.", "time"),
        create_kj("kj_spring", "春", "シュン (shun)", "はる (haru)", "はる", "spring", 9, 2, "kj_day", ["三", "人", "日"],
                  "青春", "せいしゅん (seishun)", "若い時代", "youth",
                  "春の訪れとともに桜が満開になりました。", "はるのおとづれとともにさくらがまんかいになりました。", "With the arrival of spring cherries reached full bloom.", "spring"),
        create_kj("kj_summer", "夏", "カ / ゲ (ka/ge)", "なつ (natsu)", "なつ", "summer", 10, 2, "kj_day", ["頁", "夂"],
                  "夏休み", "なつやすみ (natsuyasumi)", "夏の長期休暇", "summer vacation",
                  "夏の青空に入道雲がもくもく湧き上がります。", "なつのあおぞらににゅうどうぐもがもくもくわきあがります。", "Thunderclouds billow into the summer blue sky.", "summer"),
        create_kj("kj_autumn", "秋", "シュウ (shū)", "あき (aki)", "あき", "autumn", 9, 2, "kj_day", ["禾", "火"],
                  "紅葉", "こうよう / もみじ (kōyō)", "秋の赤く染まった葉", "autumn colors",
                  "秋になると紅葉が山を美しく彩ります。", "あきになるとこうようがやまをうつくしくいろどります。", "In autumn red leaves color the mountains beautifully.", "autumn"),
        create_kj("kj_winter", "冬", "トウ (tō)", "ふゆ (fuyu)", "ふゆ", "winter", 5, 2, "kj_day", ["夂", "冫"],
                  "真冬", "まふゆ (mafuyu)", "最も寒い冬の頃", "midwinter",
                  "冬の夜に温かい鍋料理を家族で囲みました。", "ふゆのよるにあたたかいなべりょうりをかぞくでかこみました。", "We sat around a warm hot pot meal with family on a winter night.", "winter"),
        create_kj("kj_early_fast", "早", "ソウ / サッ (sō)", "はや-い (haya-i)", "はやい", "early / fast", 6, 1, "kj_day", ["日", "十"],
                  "早朝", "そうちょう (sōchō)", "朝早い時間", "early morning",
                  "早起きをすると一日がとても充実します。", "はやおきをするといちにちがとてもじゅうじつします。", "Waking up early makes the whole day very fulfilling.", "fast")
    ]
}
kanji_branches.append(b_time_kj)

# -------------------------------------------------------------
# 7. SOCIETY & PLACES (20 chars)
# -------------------------------------------------------------
b_society_kj = {
    "id": "society_kj",
    "name_ja": "社会と街",
    "name_en": "Society & Towns",
    "icon": "🏛️",
    "characters": [
        create_kj("kj_country", "国", "コク (koku)", "くに (kuni)", "くに", "country / nation", 8, 0, None, ["囗", "玉"],
                  "外国人", "がいこくじん (gaikokujin)", "他国の国民", "foreigner",
                  "日本は島国で、豊かな自然に恵まれています。", "にほんはしまぐにで、ゆたかなしぜんにめぐまれています。", "Japan is an island nation blessed with rich nature.", "country"),
        create_kj("kj_city", "市", "シ (shi)", "いち (ichi)", "し / まち", "city / market", 5, 0, None, ["亠", "巾"],
                  "市民", "しみん (shimin)", "都市の住民", "citizens",
                  "京都市には歴史ある神社仏閣が多く残っています。", "きょうとしにはれきしあるじんじゃぶっかくがおおくのこっています。", "Kyoto City preserves many historical shrines and temples.", "city"),
        create_kj("kj_town", "町", "チョウ (chō)", "まち (machi)", "まち", "town / neighborhood", 7, 1, "kj_city", ["田", "丁"],
                  "下町", "したまち (shitamachi)", "歴史と情緒ある市街", "traditional downtown",
                  "古い町並みを歩きながら風情を楽しみました。", "ふるいまちなみをあるきながらふぜいをたのしみました。", "I enjoyed the ambiance walking along old town streets.", "village"),
        create_kj("kj_village", "村", "ソン (son)", "むら (mura)", "むら", "village", 7, 1, "kj_town", ["木", "寸"],
                  "農村", "のうそん (nōson)", "農業が営まれる村", "agricultural village",
                  "静かな山村で川のせせらぎに癒やされました。", "しずかなさんそんでかわのせせらぎにいやされました。", "I was comforted by stream murmers in a quiet mountain village.", "village"),
        create_kj("kj_station", "駅", "エキ (eki)", "", "えき", "railway station", 14, 2, "kj_city", ["馬", "尺"],
                  "駅前", "えきまえ (ekimae)", "駅の正面一帯", "in front of the station",
                  "新幹線の駅で友達を見送りました。", "しんかんせんのえきでともだちをみおくりました。", "I saw my friend off at the Shinkansen station.", "car"),
        create_kj("kj_school", "校", "コウ (kō)", "", "がっこう", "school", 10, 1, "kj_city", ["木", "交"],
                  "学校", "がっこう (gakkō)", "教育を行う場", "school",
                  "朝から子供たちが元気に学校へ向かいます。", "あさからこどもたちがげんきにがっこうへむかいます。", "Children head cheerily towards school in the morning.", "school"),
        create_kj("kj_store", "店", "テン (ten)", "みせ / たな (mise)", "みせ", "shop / store", 8, 1, "kj_city", ["广", "占"],
                  "喫茶店", "きっさてん (kissaten)", "お茶を楽しむ店", "coffee shop / cafe",
                  "お気に入りの本屋で新しい本を探しました。", "おきにいりのほんやであたらしいほんをさがしました。", "I looked for a new book in my favorite bookstore.", "shop"),
        create_kj("kj_house", "家", "カ / ケ (ka/ke)", "いえ / や / うち (ie/ya/uchi)", "いえ", "house / home", 10, 0, None, ["宀", "豕"],
                  "家族", "かぞく (kazoku)", "共に暮らす身内", "family",
                  "夕方になると家族みんなが家に集まります。", "ゆうがたになるとかぞくみんながいえにあつまります。", "In the evening the whole family gathers home.", "family"),
        create_kj("kj_room", "室", "シツ (shitsu)", "むろ (muro)", "へや", "room / chamber", 9, 1, "kj_house", ["宀", "至"],
                  "教室", "きょうしつ (kyōshitsu)", "授業を受ける部屋", "classroom",
                  "明るい教室で友達と楽しく学びました。", "あかるいきょうしつでともだちとたのしくまなびました。", "In the bright classroom I enjoyed learning with friends.", "room"),
        create_kj("kj_gate", "門", "モン (mon)", "かど (kado)", "もん", "gate", 8, 0, None, [],
                  "正門", "せいもん (seimon)", "建物の正面出入口", "main gate",
                  "お寺の立派な山門をくぐって境内に入りました。", "おてらのりっぱなさんもんをくぐってけいだ内にはいりました。", "Passing under the grand temple gate I stepped inside.", "gate"),
        create_kj("kj_road", "道", "ドウ / トウ (dō/tō)", "みち (michi)", "みち", "road / path / way", 12, 0, None, ["辶", "首"],
                  "茶道", "さどう / ちゃどう (sadō)", "茶を点てる日本の伝統芸道", "tea ceremony",
                  "春の陽射しを浴びながら田舎道を散歩しました。", "はるのひざしをあびながらいなかみちをさんぽしました。", "Basking in spring sunlight I strolled along country paths.", "road"),
        create_kj("kj_public", "公", "コウ / ク (kō)", "おおやけ (ōyake)", "おおやけ / こう", "public / official", 4, 0, None, ["八", "厶"],
                  "公園", "こうえん (kōen)", "憩いの広場", "park",
                  "天気の良い休日に公園でピクニックをしました。", "てんきのいいきゅうじつにこうえんでぴくにっくをしました。", "On a fine holiday we had a picnic in the park.", "park"),
        create_kj("kj_garden", "園", "エン (en)", "その (sono)", "その / にわ", "garden / park", 13, 2, "kj_public", ["囗", "袁"],
                  "動物園", "どうぶつえん (dōbutsuen)", "動物を集めた施設", "zoo",
                  "植物園で珍しい南国の花を鑑賞しました。", "しょくぶつえんでめずらしいなんごくのはなをかんしょうしました。", "I admired rare tropical flowers at the botanical garden.", "garden"),
        create_kj("kj_place", "場", "ジョウ / チョウ (jō)", "ば (ba)", "ば / ところ", "place / field", 12, 1, "kj_ground", ["土", "昜"],
                  "広場", "ひろば (hiroba)", "広い敷地", "plaza / square",
                  "駅前広場で季節のお祭りが開催されていました。", "えきまえひろばできせつのおまつりがかいさいされていました。", "A seasonal festival was taking place at the station square.", "field"),
        create_kj("kj_institution", "院", "イン (in)", "", "いん", "institution / hospital", 10, 1, "kj_house", ["阝", "完"],
                  "病院", "びょういん (byōin)", "医療機関", "hospital",
                  "風邪をひいたので近所の医院へ行きました。", "かぜをひいたのできんじょのいいんへいきました。", "Having caught a cold I went to the neighborhood clinic.", "building"),
        create_kj("kj_temple", "寺", "ジ (ji)", "てら (tera)", "おてら", "Buddhist temple", 6, 0, None, ["土", "寸"],
                  "寺院", "じいん (jiin)", "仏教の寺", "temple",
                  "古都のお寺で朝の鐘の音が響き渡りました。", "ことのおてらであさのかねのねがひびきわたりました。", "The morning bell echoed from a temple in the ancient capital.", "temple"),
        create_kj("kj_shrine", "社", "シャ (sha)", "やしろ (yashiro)", "やしろ / かいしゃ", "shrine / company", 8, 1, "kj_ground", ["礻", "土"],
                  "神社", "じんじゃ (jinja)", "神道を祀る聖所", "Shinto shrine",
                  "初詣で近くの神社へお参りに行きました。", "はつもうででちかくのじんじゃへおまいりにいきました。", "For New Year's visit I went praying at the nearby shrine.", "temple"),
        create_kj("kj_hall", "堂", "ドウ (dō)", "", "どう", "hall / temple hall", 11, 1, "kj_house", ["尚", "土"],
                  "食堂", "しょくどう (shokudō)", "ご飯を食べる部屋や店", "cafeteria / dining hall",
                  "学生食堂で安くて美味しい定食を食べました。", "がくせいしょくどうでやすくておいしいていしょくをたべました。", "I had an inexpensive tasty set meal at the student cafeteria.", "house"),
        create_kj("kj_bridge", "橋", "キョウ (kyō)", "はし (hashi)", "はし", "bridge", 16, 2, "kj_tree", ["木", "喬"],
                  "歩道橋", "ほどうきょう (hodōkyō)", "歩行者用の橋", "pedestrian bridge",
                  "夕暮れに川にかかる太鼓橋を渡りました。", "ゆうぐれにかわにかかるたいこばしをわたりました。", "At dusk I crossed the arched bridge spanning the river.", "bridge"),
        create_kj("kj_port", "港", "コウ (kō)", "みなと (minato)", "みなと", "harbor / port", 12, 2, "kj_water", ["氵", "巷"],
                  "港町", "みなとまち (minatomachi)", "港のある街", "port town",
                  "港町で獲れたての新鮮な魚介を味わいました。", "みなとまちでとれたてのしんせんなぎょかいをあじわいました。", "In the port town I savored freshly caught seafood.", "boat")
    ]
}
kanji_branches.append(b_society_kj)

# -------------------------------------------------------------
# 8. KNOWLEDGE & CULTURE (20 chars)
# -------------------------------------------------------------
b_knowledge_kj = {
    "id": "knowledge_kj",
    "name_ja": "学びと文化",
    "name_en": "Learning & Culture",
    "icon": "📚",
    "characters": [
        create_kj("kj_literature", "文", "ブン / モン (bun/mon)", "ふみ (fumi)", "ぶん / もじ", "text / literature", 4, 0, None, [],
                  "文化", "ぶんか (bunka)", "社会の伝統や生活様式", "culture",
                  "日本の伝統文化に親しむ一日を過ごしました。", "にほんのでんとうぶんかにしたしむいちにちをすごしました。", "I spent a day familiarizing myself with Japanese traditional culture.", "writing"),
        create_kj("kj_character", "字", "ジ (ji)", "あざ (aza)", "もじ", "character / letter", 6, 1, "kj_literature", ["宀", "子"],
                  "漢字", "かんじ (kanji)", "中国起源の文字", "kanji characters",
                  "毎日ノートに綺麗な漢字を練習しています。", "まいにちのーとにきれいなかんじをれんしゅうしています。", "Every day I practice neat kanji characters in my notebook.", "writing"),
        create_kj("kj_book_origin", "本", "ホン (hon)", "もと (moto)", "ほん / もと", "book / origin", 5, 0, None, ["木", "一"],
                  "日本", "にほん (nihon)", "日出ずる国", "Japan",
                  "休日は大好きな本を一日中読んで過ごします。", "きゅうじつはだいすきなほんをいちにちじゅうよんですごします。", "On holidays I spend the whole day reading books I love.", "book"),
        create_kj("kj_name", "名", "メイ / ミョウ (mei/myō)", "な (na)", "なまえ", "name / fame", 6, 0, None, ["夕", "口"],
                  "有名", "ゆうめい (yūmei)", "名が知れ渡っていること", "famous",
                  "初めてお会いした人と名刺を交換しました。", "はじめておあいしたひととめいしをこうかんしました。", "I exchanged business cards with the person I met for the first time.", "scholar"),
        create_kj("kj_language", "語", "ゴ (go)", "かた-る (kata-ru)", "ことば / かたる", "language / word", 14, 2, "kj_speak", ["言", "吾"],
                  "日本語", "にほんご (nihongo)", "日本の言語", "Japanese language",
                  "外国の友達と日本語で楽しくおしゃべりしました。", "がいこくのともだちにほんごでたのしくおしゃべりしました。", "I chatted pleasantly in Japanese with foreign friends.", "language"),
        create_kj("kj_teach", "教", "キョウ (kyō)", "おし-える / おそわ-る (oshi-eru/osowa-ru)", "おしえる", "teach / religion", 11, 1, "kj_literature", ["孝", "攵"],
                  "教室", "きょうしつ (kyōshitsu)", "学びの部屋", "classroom",
                  "先生が分かりやすく丁寧に教えてくれました。", "せんせいがわかりやすくていねいにおしえてくれました。", "The teacher explained kindly in an easy-to-understand way.", "teach"),
        create_kj("kj_learn_habit", "習", "シュウ (shū)", "なら-う (nara-u)", "ならう", "learn / practice", 11, 1, "kj_teach", ["羽", "白"],
                  "練習", "れんしゅう (renshū)", "繰り返して上達すること", "practice / exercise",
                  "毎日ピアノの練習を欠かさず続けています。", "まいにちぴあののれんしゅうをかかさずつづけています。", "I keep practicing the piano daily without missing a day.", "study"),
        create_kj("kj_study_learn", "学", "ガク (gaku)", "まな-ぶ (mana-bu)", "まなぶ", "study / learn", 8, 0, None, ["子"],
                  "学生", "がくせい (gakusei)", "学ぶ人", "student",
                  "好奇心を持って新しい知識を学びましょう。", "こうきしんをもってあたらしいちしきをまなびましょう。", "Let's learn new knowledge carrying deep curiosity.", "study"),
        create_kj("kj_paper", "紙", "シ (shi)", "かみ (kami)", "かみ", "paper", 10, 2, "kj_book_origin", ["糸", "氏"],
                  "和紙", "わし (washi)", "日本の伝統的な手漉き紙", "Japanese washi paper",
                  "手触りの優しい和紙に筆で文字を書きました。", "てざわりのやさしいわしにふでもじをかきました。", "I wrote letters with brush on gentle-textured washi paper.", "book"),
        create_kj("kj_sing_song", "歌", "カ (ka)", "うた / うた-う (uta/uta-u)", "うた", "song / to sing", 14, 2, "kj_speak", ["哥", "欠"],
                  "歌手", "かしゅ (kashu)", "歌を歌う人", "singer",
                  "美しい小鳥の歌声が森に響き渡っています。", "うつくしいことりのうたごえがもりにひびきわたっています。", "Lovely song voices of small birds resonate across the woods.", "sing"),
        create_kj("kj_picture_drawing", "画", "ガ / カク (ga/kaku)", "", "え / えがく", "picture / drawing", 8, 1, "kj_literature", ["一", "由"],
                  "映画", "えいが (eiga)", "フィルムで上映する映像劇", "movie / film",
                  "週末に映画館で心温まる映画を見ました。", "しゅうまつにえいがかんできころあたたまるえいがをみました。", "On the weekend I watched a heartwarming movie at the cinema.", "art"),
        create_kj("kj_sound_tone", "音", "オン / イン (on/in)", "おと / ね (oto/ne)", "おと", "sound / noise", 9, 0, None, ["立", "日"],
                  "音楽", "おんがく (ongaku)", "音による芸術", "music",
                  "雨の降る静かな音を聞きながらリラックスしました。", "あめのふるしずかなおとをききながらりらっくすしました。", "I relaxed listening to the quiet sound of falling rain.", "music"),
        create_kj("kj_music_fun", "楽", "ガク / ラク (gaku/raku)", "たの-しい / たの-しむ (tano-shii/tano-shimu)", "たのしい", "music / pleasant / fun", 13, 1, "kj_sound_tone", ["白", "木"],
                  "楽しい", "たのしい (tanoshii)", "愉快な気持ち", "fun / enjoyable",
                  "友達と一緒に過ごす時間は本当に楽しいです。", "ともだちといっしょにすごすじかんはほんとうにたのしいです。", "Time spent together with friends is genuinely enjoyable.", "music"),
        create_kj("kj_think_ponder", "考", "コウ (kō)", "かんが-える (kanga-eru)", "かんがえる", "think / consider", 6, 0, None, ["耂", "丂"],
                  "思考", "しこう (shikō)", "深く考えること", "thought / reflection",
                  "未来のために何ができるかじっくり考えました。", "みらいのためになにができるかじっくりかんがえました。", "I carefully thought about what can be done for the future.", "think"),
        create_kj("kj_know", "知", "チ (chi)", "し-る (shi-ru)", "しる", "know / knowledge", 8, 0, None, ["矢", "口"],
                  "知識", "ちしき (chishiki)", "知っている事柄", "knowledge",
                  "知らなかった新しい世界を知るのは面白いです。", "しらなかったあたらしいせかいをしるのはおもしろいです。", "Discovering new unknown worlds is endlessly exciting.", "wisdom"),
        create_kj("kj_friend", "友", "ユウ (yū)", "とも (tomo)", "ともだち", "friend", 4, 0, None, ["𠂇", "又"],
                  "友達", "ともだち (tomodachi)", "親しい友人", "friend",
                  "大切な友達といつまでも仲良くしていきたいです。", "たいせつなともだちといつまでもなかよくしていきたいです。", "I wish to always remain on good terms with precious friends.", "friend"),
        create_kj("kj_brush", "筆", "ヒツ (hitsu)", "ふで (fude)", "ふで", "writing brush", 12, 2, "kj_book_origin", ["竹", "聿"],
                  "鉛筆", "えんぴつ (enpitsu)", "黒鉛の芯の筆記具", "pencil",
                  "筆に墨をつけて美しい文字をしたためました。", "ふでにすみをつけてうつくしいもじをしたためました。", "Dipping brush in sumi ink I composed beautiful characters.", "writing"),
        create_kj("kj_poem", "詩", "シ (shi)", "", "し", "poem / poetry", 13, 2, "kj_speak", ["言", "寺"],
                  "詩人", "しじん (shijin)", "詩を作る人", "poet",
                  "春の情景を描いた美しい詩を朗読しました。", "はるのじょうけいをえがいたうつくしいしをろうどくしました。", "I recited a lovely poem portraying the spring scenery.", "poem"),
        create_kj("kj_question", "問", "モン (mon)", "と-う / と-い (to-u/to-i)", "とう / とい", "question / inquire", 11, 2, "kj_gate", ["門", "口"],
                  "質問", "しつもん (shitsumon)", "疑問を尋ねること", "question",
                  "わからないところを先生に優しく質問しました。", "わからないところをせんせいにやさしくしつもんしました。", "I politely asked the teacher about parts I didn't understand.", "ask"),
        create_kj("kj_answer", "答", "トウ (tō)", "こた-える / こた-え (kota-eru/kota-e)", "こたえる", "answer / reply", 12, 2, "kj_question", ["竹", "合"],
                  "返答", "へんとう (hentō)", "問いへの答え", "reply / response",
                  "質問に対して笑顔で明るく答えました。", "しつもんにたいしてえがおであかるくこたえました。", "I responded brightly with a smile to the question.", "answer")
    ]
}
kanji_branches.append(b_knowledge_kj)

# -------------------------------------------------------------
# 9. ANIMALS & LIVING THINGS (16 chars)
# -------------------------------------------------------------
b_animals_kj = {
    "id": "animals_kj",
    "name_ja": "生き物と命",
    "name_en": "Animals & Life",
    "icon": "🐾",
    "characters": [
        create_kj("kj_life_birth", "生", "セイ / ショウ (sei/shō)", "い-きる / う-まれる / なま (i-kiru/u-mareru)", "いきる / うまれる", "life / birth / raw", 5, 0, None, [],
                  "生活", "せいかつ (seikatsu)", "日々の暮らし", "daily life",
                  "自然の中でたくさんの新しい命が生まれます。", "しぜんのなかでたくさんのあたらしいいのちがうまれます。", "In nature a great many new lives are born.", "life"),
        create_kj("kj_death", "死", "シ (shi)", "し-ぬ (shi-nu)", "しぬ", "death / to die", 6, 1, "kj_life_birth", ["歹", "匕"],
                  "必死", "ひっし (hisshi)", "全力を尽くすこと", "desperate / all-out",
                  "命の尊さを心から実感しました。", "いのちのとうとさをこころからじっかんしました。", "I truly felt the precious sanctity of life.", "death"),
        create_kj("kj_horse", "馬", "バ (ba)", "うま / ま (uma/ma)", "うま", "horse", 10, 0, None, [],
                  "乗馬", "じょうば (jōba)", "馬に乗ること", "horseback riding",
                  "緑の牧場で美しい馬が颯爽と駆けていきました。", "みどりのぼくじょうでうつくしいうまがさっそうとかけていきました。", "On green pastures lovely horses galloped dashingly.", "horse"),
        create_kj("kj_cow_ox", "牛", "ギュウ (gyū)", "うし (ushi)", "うし", "cow / ox", 4, 0, None, [],
                  "牛乳", "ぎゅうにゅう (gyūnyū)", "牛のお乳", "cow's milk",
                  "朝ごはんに新鮮で冷たい牛乳を飲みました。", "あさごはんにしんせんでつめたいぎゅうにゅうをのみました。", "I drank fresh cold milk with my morning breakfast.", "cow"),
        create_kj("kj_fish", "魚", "ギョ (gyo)", "さかな / うお (sakana/uo)", "さかな", "fish", 11, 0, None, [],
                  "金魚", "きんぎょ (kingyo)", "観賞用の魚", "goldfish",
                  "透き通った小川で小さな魚が群れて泳いでいます。", "すきとおったおがわでちいさなさかながむれておよいでいます。", "Small fish swim in schools in the translucent stream.", "fish"),
        create_kj("kj_bird", "鳥", "チョウ (chō)", "とり (tori)", "とり", "bird", 11, 0, None, [],
                  "小鳥", "ことり (kotori)", "小さなかわいい鳥", "small bird",
                  "朝の庭で小鳥たちが楽しそうにさえずっています。", "あさのにわでことりたちがたのしそうにさえずっています。", "Small birds chirp merrily in the morning garden.", "bird"),
        create_kj("kj_dog", "犬", "ケン (ken)", "いぬ (inu)", "いぬ", "dog", 4, 0, None, [],
                  "愛犬", "あいけん (aiken)", "かわいがっている飼い犬", "pet dog",
                  "夕方に愛犬と近所の河原をのんびり散歩しました。", "ゆうがたにあいけんときんじょのかわらをのんびりさんぽしました。", "In the evening I strolled leisurely on the riverbank with my dog.", "dog"),
        create_kj("kj_sheep", "羊", "ヨウ (yō)", "ひつじ (hitsuji)", "ひつじ", "sheep", 6, 0, None, [],
                  "羊毛", "ようもう (yōmō)", "羊の毛", "wool",
                  "広々とした牧場でふわふわの羊を見ました。", "ひろびろとしたぼくじょうでふわふわのひつじをみました。", "On the spacious ranch I watched fluffy soft sheep.", "sheep"),
        create_kj("kj_insect", "虫", "チュウ (chū)", "むし (mushi)", "むし", "insect / bug", 6, 0, None, [],
                  "昆虫", "こんちゅう (konchū)", "虫", "insect",
                  "夏の夜に草むらから秋の虫の声が聞こえます。", "なつのよるにくさむらからあきのむしのこえがきこえます。", "On summer nights insect voices chime from the grassy meadows.", "insect"),
        create_kj("kj_shell", "貝", "バイ (bai)", "かい (kai)", "かい", "shell / shellfish", 7, 0, None, ["目", "八"],
                  "貝殻", "かいがら (kaigara)", "貝の外殻", "seashell",
                  "砂浜で綺麗な桜貝を拾って持ち帰りました。", "すなはまできれいなさくらがいをひろってもちかえりました。", "I picked up pretty pink shells on the beach and took them home.", "shell"),
        create_kj("kj_cat", "猫", "ビョウ (byō)", "ねこ (neko)", "ねこ", "cat", 11, 0, None, ["犭", "苗"],
                  "愛猫", "あいびょう (aibyō)", "かわいがっている猫", "pet cat",
                  "日当たりの良い縁側で猫が気持ちよさそうに丸まっています。", "ひあたりのいいえんがわでねこがきもちよさそうにまるまっています。", "On the sunny porch a cat curls up pleasantly.", "cat"),
        create_kj("kj_elephant", "象", "ショウ / ゾウ (shō/zō)", "", "ぞう", "elephant / image", 12, 0, None, [],
                  "印象", "いんしょう (inshō)", "心に残る感じ", "impression",
                  "動物園で大きな象が優しく鼻を動かしていました。", "どうぶつえんでおおきなぞうがやさしくはなをうごかしていました。", "At the zoo a large elephant moved its trunk gently.", "elephant"),
        create_kj("kj_tiger", "虎", "コ (ko)", "とら (tora)", "とら", "tiger", 8, 0, None, ["虍", "儿"],
                  "虎穴", "こけつ (koketsu)", "危険な場所", "tiger's cave / danger",
                  "黄金色に輝く力強い虎の掛け軸を鑑賞しました。", "こがねいろにかがやきちからづよいとらのかけじくをかんしょうしました。", "I admired a hanging scroll depicting a golden powerful tiger.", "tiger"),
        create_kj("kj_dragon", "竜", "リュウ / リョウ (ryū/ryō)", "たつ (tatsu)", "たつ / りゅう", "dragon", 10, 0, None, ["立", "月"],
                  "竜巻", "たつまき (tatsumaki)", "激しい渦巻風", "tornado",
                  "昔話に出てくる優しい竜のお話を読みました。", "むかしばなしにでてくるやさしいりゅうのおはなしをよみました。", "I read a story of a gentle dragon in a folklore tale.", "dragon"),
        create_kj("kj_deer", "鹿", "ロク (roku)", "しか / か (shika/ka)", "しか", "deer", 11, 0, None, [],
                  "鹿の子", "かのこ (kanoko)", "斑点模様", "fawn dappled pattern",
                  "奈良公園で可愛い鹿におせんべいをあげました。", "ならこうえんでかわいいしかにおせんべいをあげました。", "In Nara Park I fed crackers to cute deer.", "deer"),
        create_kj("kj_feather", "羽", "ウ (u)", "は / はね (ha/hane)", "はね", "feather / wing", 6, 1, "kj_bird", [],
                  "羽毛", "うもう (umō)", "鳥の柔らかな羽", "down feather",
                  "鳥が大きく羽を広げて空へ飛び立ちました。", "とりがおおきくはねをひろげてそらへとびたちました。", "Spreading wide wings the bird took flight into the sky.", "feather")
    ]
}
kanji_branches.append(b_animals_kj)

# -------------------------------------------------------------
# 10. VIRTUES & HEART (18 chars)
# -------------------------------------------------------------
b_virtues_kj = {
    "id": "virtues_kj",
    "name_ja": "心と美徳",
    "name_en": "Heart & Virtues",
    "icon": "⚖️",
    "characters": [
        create_kj("kj_love", "愛", "アイ (ai)", "いと-しい (ito-shii)", "あい / いとおしい", "love / affection", 13, 0, None, ["爫", "冖", "心", "夂"],
                  "愛情", "あいじょう (aijō)", "愛する温かい気持ち", "love / affection",
                  "家族への愛をいつまでも大切に胸に抱きましょう。", "かぞくへのあいをいつまでもたいせつにむねにいだきましょう。", "Let's forever hold love for our family in our hearts.", "love"),
        create_kj("kj_goodness", "善", "ゼン (zen)", "よ-い (yo-i)", "よい", "goodness / virtue", 12, 0, None, ["羊", "口"],
                  "善行", "ぜんこう (zenkō)", "よい行い", "good deed",
                  "日々の小さな善行が温かい社会を築きます。", "ひびのちいさなぜんこうがあたたかいしゃかいをきずきます。", "Small daily good deeds build a warmer society.", "good"),
        create_kj("kj_evil", "悪", "アク / オ (aku/o)", "わる-い (waru-i)", "わるい", "bad / evil", 11, 1, "kj_heart_mind", ["亜", "心"],
                  "最悪", "さいあく (saiaku)", "もっとも悪い状態", "worst",
                  "他人の悪口を言わず誠実に接しましょう。", "たにんのわるくちをいわずせいじつにせっしましょう。", "Treat others sincerely without speaking ill behind them.", "evil"),
        create_kj("kj_correct", "正", "セイ / ショウ (sei/shō)", "ただ-しい / まさ (tada-shii/masa)", "ただしい", "correct / upright", 5, 0, None, ["一", "止"],
                  "正直", "しょうじき (shōjiki)", "嘘偽りのないこと", "honest",
                  "どんな時でも正しい道を選ぶ勇気を持ちたいです。", "どんなときでもただしいみちをえらぶゆうきをもちたいです。", "I wish to hold courage choosing the upright path in any situation.", "correct"),
        create_kj("kj_justice", "義", "ギ (gi)", "", "ぎ / 正義", "justice / righteousness", 13, 1, "kj_correct", ["羊", "我"],
                  "正義", "せいぎ (seigi)", "正しい道理", "justice",
                  "正義と思いやりの心は社会の礎です。", "せいぎとおもいやりのこころはしゃかいのいしずえです。", "Justice and consideration are cornerstones of society.", "righteousness"),
        create_kj("kj_propriety", "礼", "レイ / ライ (rei/rai)", "", "れい / おれい", "manners / bow / thanks", 5, 0, None, ["礻", "乚"],
                  "礼儀", "れいぎ (reigi)", "正しい立ち振る舞い", "etiquette / manners",
                  "人に会った時は笑顔で礼を尽くして挨拶します。", "ひとにあったときはえがおでれいをつくしてあいさつします。", "When meeting people greet politely with courtesy and smiles.", "propriety"),
        create_kj("kj_wisdom", "智", "チ (chi)", "", "ちえ", "wisdom / intellect", 12, 1, "kj_correct", ["矢", "口", "日"],
                  "知恵", "ちえ (chie)", "物事を判断する能力", "wisdom",
                  "困難な状況を智恵を絞って乗り越えました。", "こんなんなじょうきょうをちえをしぼってのりこえました。", "Gathering wisdom we overcame difficult conditions.", "wisdom"),
        create_kj("kj_trust", "信", "シン (shin)", "", "しんじる", "trust / faith", 9, 1, "kj_person", ["亻", "言"],
                  "信用", "しんよう (shin'yō)", "信じて頼りにすること", "trust / reliance",
                  "お互いの信頼関係がすべての友情の基本です。", "おたがいのしんらいかんけいがすべてのゆうじょうのきほんです。", "Mutual trust is the basis of all friendships.", "trust"),
        create_kj("kj_loyalty", "忠", "チュウ (chū)", "", "ちゅうせい", "loyalty / fidelity", 8, 1, "kj_heart_mind", ["中", "心"],
                  "忠実", "ちゅうじつ (chūjitsu)", "真面目で誠実なこと", "faithful / loyal",
                  "与えられた役割を忠実にやり遂げました。", "あたえられたやくわりをちゅうじつにやりとげました。", "I faithfully carried out the assigned responsibilities.", "loyalty"),
        create_kj("kj_filial", "孝", "コウ (kō)", "", "こう / 親孝行", "filial piety", 7, 1, "kj_child", ["耂", "子"],
                  "親孝行", "おやこうこう (oyakōkō)", "親を大切にすること", "filial devotion",
                  "初任給で両親に贈り物をし、親孝行をしました。", "しょにんきゅうでりょうしんにおくりものをし、おやこうこうをしました。", "With my first salary I gifted parents showing filial appreciation.", "filial"),
        create_kj("kj_courage", "勇", "ユウ (yū)", "いさ-む (isa-mu)", "いさむ / ゆうき", "courage / brave", 9, 1, "kj_power", ["マ", "男"],
                  "勇気", "ゆうき (yūki)", "物事を恐れない強い心", "courage",
                  "一歩を踏み出す勇気が未来を切り拓きます。", "いっぽをふみだすゆうきがみらいをきりひらきます。", "Courage to step forward opens up the future.", "power"),
        create_kj("kj_endure", "忍", "ニン (nin)", "しの-ぶ / しの-ばせる (shino-bu)", "しのぶ / がまん", "endure / ninja", 7, 1, "kj_heart_mind", ["刃", "心"],
                  "忍者", "にんじゃ (ninja)", "忍術を使う者", "ninja",
                  "どんな辛い試練もじっと忍んで前へ進みました。", "どんなつらいしれんもじっとしのんでまえへすすみました。", "Enduring trials patiently I continued forward.", "peace"),
        create_kj("kj_harmony", "和", "ワ / オ (wa/o)", "やわ-らぐ / なご-む (yawa-ragu/nago-mu)", "やわらぐ / なごむ / わ", "peace / harmony / Japanese", 8, 0, None, ["禾", "口"],
                  "平和", "へいわ (heiwa)", "争いのない穏やかな世界", "peace",
                  "和やかな雰囲気の中でお茶会を楽しみました。", "なごやかなふんいきのなかでおちゃかいをたのしみました。", "I enjoyed the tea gathering in a peaceful gentle atmosphere.", "peace"),
        create_kj("kj_happiness", "幸", "コウ (kō)", "さいわ-い / しあわ-せ (shiawa-se)", "しあわせ", "happiness / fortune", 8, 0, None, ["土", "干"],
                  "幸せ", "しあわせ (shiawase)", "心が満ち足りた状態", "happiness",
                  "日々のささやかな出来事に幸せを感じます。", "ひびのささやかなできごとにしあわせをかんじます。", "I feel happiness in small daily occurrences.", "gift"),
        create_kj("kj_blessing", "福", "フク (fuku)", "", "ふく / しあわせ", "fortune / blessing", 13, 1, "kj_happiness", ["礻", "畐"],
                  "幸福", "こうふく (kōfuku)", "恵まれて満ち足りること", "happiness / bliss",
                  "新年を迎えて皆様の幸福を心より祈ります。", "しんねんをむかえてみなさまのこうふくをこころよりいのります。", "Welcoming the New Year I pray for everyone's blessing.", "gift"),
        create_kj("kj_sincerity", "誠", "セイ (sei)", "まこと (makoto)", "まこと", "sincerity / truth", 13, 2, "kj_speak", ["言", "成"],
                  "誠実", "せいじつ (seijitsu)", "嘘や偽りのないこと", "sincere / honest",
                  "誰に対しても誠実な姿勢で接することを心がけています。", "だれにたいしてもせいじつなしせいでせっすることをこころがけています。", "I make it a point to interact sincerely towards everyone.", "truth"),
        create_kj("kj_respect", "敬", "ケイ / キョウ (kei/kyō)", "うやま-う (uyama-u)", "うやまう", "respect / honor", 12, 1, "kj_propriety", ["苟", "攵"],
                  "敬意", "けいい (keii)", "尊敬する気持ち", "respect",
                  "先輩たちの築いた成果に深い敬意を払います。", "せんぱいたちのきずいたせいかにふかいけいいをはらいます。", "I pay deep respect to the accomplishments built by seniors.", "respect"),
        create_kj("kj_virtue", "徳", "トク (toku)", "", "とく / 人徳", "virtue / morality", 14, 0, None, ["彳", "心"],
                  "道徳", "どうとく (dōtoku)", "社会の規範", "morality / ethics",
                  "徳の高い人々の教えに耳を傾けましょう。", "とくのたかいひとびとのおしえにみみをかたむけましょう。", "Let's listen to the teachings of persons of high virtue.", "virtue")
    ]
}
kanji_branches.append(b_virtues_kj)

# -------------------------------------------------------------
# 11. COLORS & QUALITIES (18 chars)
# -------------------------------------------------------------
b_qualities_kj = {
    "id": "qualities_kj",
    "name_ja": "色彩と状態",
    "name_en": "Colors & Qualities",
    "icon": "🎨",
    "characters": [
        create_kj("kj_white", "白", "ハク / ビャク (haku/byaku)", "しろ / しろ-い (shiro/shiro-i)", "しろ", "white", 5, 0, None, [],
                  "白雪", "しらゆき (shirayuki)", "白く美しい雪", "white snow",
                  "一面に広がる真っ白な銀世界に感動しました。", "いちめんにひろがるまっしろなぎんせかいにかんどうしました。", "I was moved by the pure white snowy expanse.", "white"),
        create_kj("kj_black", "黒", "コク (koku)", "くろ / くろ-い (kuro/kuro-i)", "くろ", "black", 11, 0, None, ["里", "灬"],
                  "黒板", "こくばん (kokuban)", "字を書く板", "blackboard",
                  "夜空に黒い猫のシルエットが綺麗に浮かびました。", "よぞらにくろいねこのしるえっとがきれいにうかびました。", "A black cat's silhouette stood out against the night sky.", "black"),
        create_kj("kj_red", "赤", "セキ / シャク (seki/shaku)", "あか / あか-い (aka/aka-i)", "あか", "red", 7, 0, None, ["土", "灬"],
                  "赤ちゃん", "あかちゃん (akachan)", "生まれたばかりの乳児", "baby",
                  "秋になると真っ赤な紅葉が山を包み込みます。", "あきになるとまっかなこうようがやまをつつみこみます。", "In autumn bright red maples envelop the mountains.", "red"),
        create_kj("kj_blue", "青", "セイ / ショウ (sei/shō)", "あお / あお-い (ao/ao-i)", "あお", "blue / green", 8, 0, None, [],
                  "青空", "あおぞら (aozora)", "晴れわたった空", "blue sky",
                  "晴れた日の青い海を眺めて心が洗われました。", "はれたひのあおうみをながめてこころがあらわれました。", "Gazing at the blue sea on a fine day refreshed my spirit.", "blue"),
        create_kj("kj_yellow", "黄", "コウ / オウ (kō/ō)", "き / こ (ki/ko)", "きいろ", "yellow", 11, 0, None, [],
                  "黄金", "おうごん (ōgon)", "金色に輝くこと", "gold / golden",
                  "秋の並木道が黄色いイチョウの葉で染まりました。", "あきのなみきみちがきいろいいちょうのはでそまりました。", "The autumn roadside was dyed with yellow ginkgo leaves.", "yellow"),
        create_kj("kj_green", "緑", "リョク / ロク (ryoku/roku)", "みどり (midori)", "みどり", "green", 14, 1, "kj_blue", ["糸", "彔"],
                  "新緑", "しんりょく (shinryoku)", "初夏の新しい緑の葉", "fresh green leaves",
                  "初夏の山々に瑞々しい緑が広がっています。", "しょかのやまやまにみずみずしいみどりがひろがっています。", "Fresh lush green expands across the early summer hills.", "green"),
        create_kj("kj_big", "大", "ダイ / タイ (dai/tai)", "おお / おお-きい (ō/ō-kii)", "おおきい", "big / large", 3, 0, None, [],
                  "大学", "だいがく (daigaku)", "高等教育機関", "university",
                  "広い公園に大きなクスノキが枝を広げています。", "ひろいこうえんにおおきなくすのきがえだをひろげています。", "A huge camphor tree spreads branches in the wide park.", "big"),
        create_kj("kj_small", "小", "ショウ (shō)", "ちい-さい / こ / お (chii-sai)", "ちいさい", "small / little", 3, 0, None, [],
                  "小鳥", "ことり (kotori)", "小さな鳥", "small bird",
                  "掌に小さな可愛いどんぐりを乗せました。", "てのひらにちいさなかわいいどんぐりをのせました。", "I placed a tiny cute acorn in the palm of my hand.", "small"),
        create_kj("kj_long", "長", "チョウ (chō)", "なが-い (naga-i)", "ながい", "long / leader", 8, 0, None, [],
                  "市長", "しちょう (shichō)", "市の代表", "mayor",
                  "長い散歩路をゆっくり時間をかけて歩きました。", "ながいさんぽろをゆっくりじかんをかけてあるきました。", "I walked along the long trail taking my time leisurely.", "long"),
        create_kj("kj_short", "短", "タン (tan)", "みじか-い (mijika-i)", "みじかい", "short", 12, 1, "kj_long", ["矢", "豆"],
                  "短歌", "たんか (tanka)", "五七五七七の日本の伝統詩歌", "tanka poem",
                  "春の日は短く、あっという間に夕暮れになります。", "はるのひはみじかく、あっというまにゆうぐれになります。", "Spring days are short and dusk arrives quickly.", "short"),
        create_kj("kj_high", "高", "コウ (kō)", "たか-い (taka-i)", "たかい", "high / expensive", 10, 0, None, [],
                  "高校", "こうこう (kōkō)", "高等学校", "high school",
                  "高いビルの展望デッキから街を一望しました。", "たかいびるのてんぼうでっきからまちをいちぼうしました。", "I looked out over the town from the tall building's observation deck.", "high"),
        create_kj("kj_low", "低", "テイ (tei)", "ひく-い (hiku-i)", "ひくい", "low", 7, 1, "kj_high", ["亻", "氐"],
                  "低気圧", "ていきあつ (teikiatsu)", "気圧の低い状態", "low pressure",
                  "気温が低くなってきたので暖かい服を着ました。", "きおんがひくくなってきたのであたたかいふくをきました。", "Because temperature became low I put on warm clothes.", "low"),
        create_kj("kj_many", "多", "タ (ta)", "おお-い (ō-i)", "おおい", "many / much", 6, 0, None, ["夕", "夕"],
                  "多少", "たしょう (tashō)", "多いことと少ないこと", "more or less",
                  "図書館には多くの興味深い本が並んでいます。", "としょかんにはおおくのきょうみぶかいほんがならんでいます。", "Many fascinating books line the shelves in the library.", "big"),
        create_kj("kj_few", "少", "ショウ (shō)", "すく-ない / すこ-し (suku-nai/suko-shi)", "すくない / すこし", "few / little", 4, 1, "kj_small", ["小", "丿"],
                  "少女", "しょうじょ (shōjo)", "若い女の子", "young girl",
                  "少し休んでから再び元気に歩き始めました。", "すこしやすんでからふたたびげんきにあるきはじめました。", "After resting a little I began walking cheerfully again.", "small"),
        create_kj("kj_new", "新", "シン (shin)", "あたら-しい / あら-た (atara-shii)", "あたらしい", "new", 13, 0, None, ["親", "斤"],
                  "新幹線", "しんかんせん (shinkansen)", "日本の高速鉄道", "bullet train / Shinkansen",
                  "新年に新しい目標を日記帳に書き留めました。", "しんねんにあたらしいもくひょうをにっきちょうにかきとめました。", "In the New Year I wrote down new goals in my diary.", "new"),
        create_kj("kj_old", "古", "コ (ko)", "ふる-い (furu-i)", "ふるい", "old / antique", 5, 0, None, ["十", "口"],
                  "古都", "こと (koto)", "歴史ある古い都", "ancient capital",
                  "古都京都の古い町家カフェで落ち着きました。", "こときょうとのふるいまちやかふぇでおちつきました。", "I settled down in an old machiya townhouse cafe in ancient Kyoto.", "old"),
        create_kj("kj_heavy", "重", "ジュウ / チョウ (jū/chō)", "おも-い / かさ-なる (omo-i)", "おもい / かさなる", "heavy / serious / overlap", 9, 0, None, ["千", "里"],
                  "貴重", "きちょう (kichō)", "非常に尊いこと", "precious / valuable",
                  "両手でずっしりと重い陶器の花瓶を持ちました。", "りょうてでずっしりとおもいとうきのかびんをもちました。", "I held a reassuringly heavy ceramic vase with both hands.", "heavy"),
        create_kj("kj_light", "軽", "ケイ (kei)", "かる-い (karu-i)", "かるい", "light (weight)", 12, 1, "kj_heavy", ["車", "圣"],
                  "軽食", "けいしょく (keishoku)", "軽い食事", "light meal / snack",
                  "軽やかな音楽を聴きながら散歩を楽しみました。", "かろやかなおんがくをききながらさんぽをたのしみました。", "I enjoyed the stroll listening to light-hearted music.", "light")
    ]
}
kanji_branches.append(b_qualities_kj)

# -------------------------------------------------------------
# 12. FOOD & CUISINE (18 chars)
# -------------------------------------------------------------
b_food_kj = {
    "id": "food_kj",
    "name_ja": "和食と暮らし",
    "name_en": "Food & Daily Life",
    "icon": "🍵",
    "characters": [
        create_kj("kj_rice_grain", "米", "ベイ / マイ (bei/mai)", "こめ (kome)", "こめ", "rice / America", 6, 0, None, [],
                  "新米", "しんまい (shinmai)", "その年に収穫された米", "new-crop rice",
                  "炊きたての真っ白い新米はおかずなしでも美味しいです。", "たきたてのまっしろなしんまいはおかずなしでもおいしいです。", "Freshly cooked pure white new rice is tasty even without side dishes.", "rice"),
        create_kj("kj_tea", "茶", "チャ / サ (cha/sa)", "", "おちゃ", "tea", 9, 1, "kj_rice_grain", ["艹", "人", "木"],
                  "抹茶", "まっちゃ (matcha)", "伝統の粉末緑茶", "matcha green tea",
                  "和菓子と一緒に香り高い温かいお茶をいただきました。", "わがしといっしょにかおりたかいあたたかいおちゃをいただきました。", "I enjoyed fragrant warm tea together with traditional sweets.", "tea"),
        create_kj("kj_alcohol_sake", "酒", "シュ (shu)", "さけ / さか (sake)", "おさけ", "sake / alcohol", 10, 1, "kj_water", ["氵", "酉"],
                  "日本酒", "にほんしゅ (nihonshu)", "伝統の清酒", "Japanese sake",
                  "美味しい郷土料理とともに地酒を嗜みました。", "おいしいきょうどりょうりとともにじざけをたしなみました。", "I savored local sake paired with delicious regional cuisine.", "drink"),
        create_kj("kj_meat", "肉", "ニク (niku)", "", "にく", "meat", 6, 0, None, [],
                  "牛肉", "ぎゅうにく (gyūniku)", "牛の肉", "beef",
                  "野菜とお肉をたっぷり使った鍋を作りました。", "やさいとおにくをたっぷりのつかったなべをつくりました。", "I made a hot pot using plenty of vegetables and meat.", "meat"),
        create_kj("kj_vegetable", "菜", "サイ (sai)", "な (na)", "やさい / な", "vegetable / greens", 11, 1, "kj_grass", ["艹", "采"],
                  "野菜", "やさい (yasai)", "畑で栽培される植物", "vegetables",
                  "毎日の食事に新鮮な緑黄色野菜を取り入れています。", "まいにちのしょくじにしんせんなりょくおうしょくやさいをとりいれています。", "I incorporate fresh colorful vegetables into daily meals.", "grass"),
        create_kj("kj_boiled_rice", "飯", "ハン (han)", "めし (meshi)", "ごはん", "cooked rice / meal", 12, 1, "kj_eat", ["飠", "反"],
                  "朝飯", "あさごはん (asagohan)", "朝の食事", "breakfast",
                  "家族みんなで揃って夕飯のテーブルを囲みました。", "かぞくみんなでそろってゆうはんのてーぶるをかこみました。", "The whole family sat gathered around the dinner table.", "rice"),
        create_kj("kj_hot_water", "湯", "トウ (tō)", "ゆ (yu)", "おゆ", "hot water / hot spring", 12, 1, "kj_water", ["氵", "昜"],
                  "温泉", "おんせん (onsen)", "地熱で湧く温かい泉", "hot spring",
                  "旅先でゆっくりと温かい温泉のお湯に浸かりました。", "たびさきでゆっくりとあたたかいおんせんのおゆにつかりました。", "At my travel destination I soaked leisurely in warm hot spring waters.", "water"),
        create_kj("kj_plate_dish", "皿", "ベイ (bei)", "さら (sara)", "さら", "plate / dish", 5, 0, None, [],
                  "小皿", "こざら (kozara)", "小さな取り皿", "small plate",
                  "綺麗な陶器の皿に季節の和菓子を盛り付けました。", "きれいなとうきのさらにきせつのわがしをもりつけました。", "I arranged seasonal sweets on a lovely ceramic plate.", "food"),
        create_kj("kj_clothes", "衣", "イ / エ (i/e)", "ころも / きぬ (koromo)", "ころも / ふく", "clothes / garment", 6, 0, None, [],
                  "衣服", "いふく (ifuku)", "着物や洋服", "clothes",
                  "伝統的な浴衣を着て夏の夜のお祭りに出かけました。", "でんとうてきなゆかたをきてなつのよるのおまつりにでかけました。", "Dressed in a traditional yukata I went out to the summer night festival.", "clothes"),
        create_kj("kj_medicine", "薬", "ヤク (yaku)", "くすり (kusuri)", "くすり", "medicine", 16, 2, "kj_tea", ["艹", "楽"],
                  "薬局", "やっきょく (yakkyoku)", "調剤する店", "pharmacy",
                  "風邪をひいたので温かい白湯と一緒に薬を飲みました。", "かぜをひいたのであたたかいさゆといっしょにくすりをのみました。", "Having a cold I took medicine with warm plain water.", "medicine"),
        create_kj("kj_sleep", "眠", "ミン (min)", "ねむ-る / ねむ-い (nemu-ru/nemu-i)", "ねむる", "sleep", 10, 1, "kj_eye", ["目", "民"],
                  "睡眠", "すいみん (suimin)", "眠ること", "sleep",
                  "心地よいアロマの香りに包まれて深く眠りました。", "ここちよいあろまのかおりにつつまれてふかくねむりました。", "Wrapped in pleasant aroma scents I slept soundly.", "sleep"),
        create_kj("kj_bath", "浴", "ヨク (yoku)", "あ-びる (a-biru)", "あびる", "bathe / shower", 10, 2, "kj_water", ["氵", "谷"],
                  "入浴", "にゅうよく (nyūyoku)", "風呂に入ること", "taking a bath",
                  "一日の終わりに温かいお風呂に入って入浴を楽しみました。", "いちにちのおわりにあたたかいおふろにはいってにゅうよくをたのしみました。", "At the end of the day I relaxed taking a warm bath.", "water"),
        create_kj("kj_oil", "油", "ユ (yu)", "あぶら (abura)", "あぶら", "oil", 8, 1, "kj_water", ["氵", "由"],
                  "醤油", "しょうゆ (shōyu)", "大豆から造る日本の伝統調味料", "soy sauce",
                  "お刺身に少しの醤油とわさびをつけて味わいました。", "おさしみにすこしのしょうゆとわさびをつけてあじわいました。", "I enjoyed sashimi dipping with a touch of soy sauce and wasabi.", "food"),
        create_kj("kj_taste", "味", "ミ (mi)", "あじ / あじ-わう (aji/aji-wau)", "あじ", "taste / flavor", 8, 1, "kj_mouth", ["口", "未"],
                  "意味", "いみ (imi)", "言葉の表す内容", "meaning",
                  "出汁の効いた優しい味の味噌汁をいただきました。", "だしのきいたやさしいあじのみそしるをいただきました。", "I savored gentle-flavored miso soup rich in dashi broth.", "food"),
        create_kj("kj_tool_vessel", "具", "グ (gu)", "", "そなえる / どうぐ", "tool / ingredient", 8, 1, "kj_eye", ["目", "廾"],
                  "道具", "どうぐ (dōgu)", "作業に使う器具", "tool",
                  "お味噌汁に豆腐とわかめの具をたっぷり入れました。", "おみそしるにとうふとわかめのぐをたっぷりいれました。", "I added plenty of tofu and seaweed ingredients to the miso soup.", "food"),
        create_kj("kj_vessel", "器", "キ (ki)", "うつわ (utsuwa)", "うつわ", "vessel / container", 15, 2, "kj_plate_dish", ["口", "犬"],
                  "食器", "しょっき (shokki)", "食事用の器", "tableware",
                  "職人が丹精込めて焼き上げた美しい器を大切に使っています。", "しょくにんがたんせいこめてやきあげたうつくしいうつわをたいせつにつかっています。", "I lovingly use lovely vessels fired with utmost devotion by craftsmen.", "food"),
        create_kj("kj_silver", "銀", "ギン (gin)", "", "しろがね / ぎん", "silver / bank", 14, 2, "kj_gold_metal", ["金", "艮"],
                  "銀行", "ぎんこう (ginkō)", "お金を預かる金融機関", "bank",
                  "窓から銀色に輝く夜の川面を静かに眺めました。", "まどからぎんいろにかがやくよるのかわもをしずかにながめました。", "From the window I quietly watched the silver-glittering river surface.", "bank"),
        create_kj("kj_ship", "船", "セン (sen)", "ふね / ふな (fune/funa)", "ふね", "ship / boat", 11, 1, "kj_water", ["舟", "㕣"],
                  "客船", "きゃくせん (kyakusen)", "乗客を乗せる船", "passenger ship",
                  "湖で遊覧船に乗って心地よい風を感じました。", "みずうみでゆうらんせんにのってここちよいかぜをかんじました。", "Riding a cruise boat on the lake I felt the soothing breeze.", "boat")
    ]
}
kanji_branches.append(b_food_kj)

# -------------------------------------------------------------
# 13. CULTURE & TRAVEL (16 chars)
# -------------------------------------------------------------
b_travel_kj = {
    "id": "travel_kj",
    "name_ja": "旅と名所",
    "name_en": "Travel & Sights",
    "icon": "⛩️",
    "characters": [
        create_kj("kj_trip", "旅", "リョ (ryo)", "たび (tabi)", "たび", "trip / travel", 10, 0, None, ["方", "氏"],
                  "旅行", "りょこう (ryokō)", "旅", "travel / trip",
                  "歴史ある古都を巡る一人旅に出かけました。", "れきしあることのめぐるひとりたびにでかけました。", "I set off on a solo journey visiting historical ancient capitals.", "walk"),
        create_kj("kj_scenery", "景", "ケイ (kei)", "", "けしき", "scenery / view", 12, 1, "kj_day", ["日", "京"],
                  "景色", "けしき (keshiki)", "眺め", "scenery / view",
                  "山頂からの雄大な景色に息を呑みました。", "さんちょうからのゆうだいなけしきにいきをのみました。", "I was breathless at the magnificent scenery from the mountain summit.", "sky"),
        create_kj("kj_color", "色", "ショク / シキ (shoku/shiki)", "いろ (iro)", "いろ", "color", 6, 0, None, [],
                  "景色", "けしき (keshiki)", "風景", "landscape / color",
                  "四季折々の豊かな自然の色を楽しんでいます。", "しきおりおりのゆたかなしぜんのいろをたのしんでいます。", "I delight in the abundant natural colors across the four seasons.", "art"),
        create_kj("kj_capital", "京", "キョウ / ケイ (kyō/kei)", "みやこ (miyako)", "みやこ", "capital", 8, 1, "kj_city", ["亠", "口", "小"],
                  "京都", "きょうと (kyōto)", "千年の古都", "Kyoto",
                  "秋の京都でお寺巡りを楽しみました。", "あきのきょうとでおてらめぐりをたのしみました。", "I enjoyed temple-hopping in autumn Kyoto.", "palace"),
        create_kj("kj_metropolis", "都", "ト / ツ (to/tsu)", "みやこ (miyako)", "みやこ / とかい", "metropolis / capital", 11, 1, "kj_capital", ["者", "阝"],
                  "首都", "しゅと (shuto)", "国の中心都市", "capital",
                  "大都会の夜景は星空のように輝いています。", "だいとかいのやけいはほしぞらのようにかがやいています。", "The metropolis night view sparkles like a starry sky.", "city"),
        create_kj("kj_shrine_holy", "宮", "キュウ / グウ (kyū/gū)", "みや (miya)", "みや / お宮", "palace / shrine", 10, 1, "kj_house", ["宀", "吕"],
                  "お宮参り", "おみやまいり (omiyamairi)", "神社の参拝", "shrine visit",
                  "木々に囲まれた厳かな宮で静かに祈りを捧げました。", "きぎにかこまれたおごそかなみやでしずかにいのりをささげました。", "Surrounded by trees in a solemn shrine I offered quiet prayers.", "palace"),
        create_kj("kj_castle", "城", "ジョウ (jō)", "しろ (shiro)", "おしろ", "castle", 9, 1, "kj_ground", ["土", "成"],
                  "城下町", "じょうかまち (jōkamachi)", "城の周りの街", "castle town",
                  "青空を背景に白鷺城の美しい天守閣がそびえ立っています。", "あおぞらをはいけいにしらさぎじょうのうつくしいてんしゅかくがそびえたっています。", "Against the blue sky the beautiful castle keep towers proudly.", "castle"),
        create_kj("kj_god_spirit", "神", "シン / ジン (shin/jin)", "かみ / かん (kami)", "かみ", "god / spirit", 9, 0, None, ["礻", "申"],
                  "神社", "じんじゃ (jinja)", "神道の社", "Shinto shrine",
                  "早朝の静かな森に神聖な空気が漂っています。", "そうちょうのしずかなもりにもしんせいなくうきがただよっています。", "In the early morning quiet forest sacred air drifts gently.", "spirit"),
        create_kj("kj_buddha", "仏", "ブツ / フツ (butsu/futsu)", "ほとけ (hotoke)", "ほとけ", "Buddha", 4, 1, "kj_person", ["亻", "厶"],
                  "大仏", "だいぶつ (daibutsu)", "巨大な仏像", "Great Buddha",
                  "奈良の大仏の穏やかなお顔を仰ぎ見ました。", "ならのだいぶつのおだやかなおかおをあおぎみました。", "I looked up at the gentle face of Nara's Great Buddha.", "peace"),
        create_kj("kj_quiet", "静", "セイ / ジョウ (sei/jō)", "しず-か / しず-まる (shizu-ka)", "しずか", "quiet / calm", 14, 2, "kj_blue", ["青", "争"],
                  "静寂", "せいじゃく (seijaku)", "物音ひとつないこと", "tranquility / silence",
                  "森の奥の静かな湖畔で心洗われる時間を過ごしました。", "もりのおくのしずかなこはんでこころあらわれるじかんをすごしました。", "Deep in the woods by a quiet lakeside I spent soul-cleansing time.", "peace"),
        create_kj("kj_hot_spring", "泉", "セン (sen)", "いずみ (izumi)", "いずみ / おんせん", "spring / fountain", 9, 1, "kj_water", ["白", "水"],
                  "源泉", "げんせん (gensen)", "湧き出る泉の元", "source spring",
                  "岩の間からこんこんと清らかな泉が湧き出ています。", "いわのあいだからこんこんときよらかないずみがわきでています。", "From between rocks a pure fresh spring wells up crystal-clear.", "water"),
        create_kj("kj_island", "島", "トウ (tō)", "しま (shima)", "しま", "island", 10, 2, "kj_mountain", ["鳥", "山"],
                  "島国", "しまぐに (shimaguni)", "四方を海に囲まれた国", "island nation",
                  "瀬戸内海の美しい島々を船から眺めました。", "せとないかいのうつくしいしまじまをふねからながめました。", "From the boat I looked out upon lovely islands in Seto Inland Sea.", "island"),
        create_kj("kj_bell", "鐘", "ショウ (shō)", "かね (kane)", "かね / つりがね", "bell / chime", 20, 2, "kj_gold_metal", ["金", "童"],
                  "梵鐘", "ぼんしょう (bonshō)", "寺院の吊り鐘", "temple bell",
                  "夕暮れの古寺から響く除夜の鐘の音に耳を澄ましました。", "ゆうぐれのこじからひびくじょやのかねのねにみみをすましました。", "I listened to the resonant chime of the temple bell at dusk.", "temple"),
        create_kj("kj_sea_bay", "湾", "ワン (wan)", "いりえ (irie)", "わん / いりえ", "bay / gulf", 12, 2, "kj_water", ["氵", "弯"],
                  "東京湾", "とうきょうわん (tōkyōwan)", "東京の湾", "Tokyo Bay",
                  "穏やかな湾を船がゆっくりと進んでいきます。", "おだやかなわんをふねがゆっくりとすすんでいきます。", "A ship moves leisurely across the tranquil bay.", "sea"),
        create_kj("kj_light_glow", "光", "コウ (kō)", "ひかり / ひか-る (hikari/hika-ru)", "ひかり", "light / shine", 6, 0, None, ["⺌", "兀"],
                  "日光", "にっこう (nikkō)", "太陽の光 / 栃木県の名所", "sunlight / Nikko",
                  "木漏れ日の柔らかな光が足元を照らしています。", "こもれびのやわらかなひかりがあしもとをてらしています。", "Gentle sunlight filtering through trees illuminates my footsteps.", "bright"),
        create_kj("kj_wind_style", "風", "フウ (fū)", "かぜ / ふう (kaze/fū)", "ふうけい / ふう", "wind / style / manner", 9, 0, None, [],
                  "風情", "ふぜい (fuzei)", "独特の味わい・趣き", "tasteful atmosphere",
                  "石畳の小道に古都の風情が色濃く漂っています。", "いしだたみのこみちにことのふぜいがいろこくただよっています。", "The cobblestone alley richly evokes the atmospheric charm of the ancient city.", "wind")
    ]
}
kanji_branches.append(b_travel_kj)

# -------------------------------------------------------------
# 14. COMPOUND FORMATIONS (20 chars)
# -------------------------------------------------------------
b_compounds_kj = {
    "id": "compounds_kj",
    "name_ja": "会意と形声",
    "name_en": "Compound Formations",
    "icon": "🔗",
    "characters": [
        create_kj("kj_bright", "明", "メイ / ミョウ (mei/myō)", "あか-るい / あ-ける (aka-rui/a-keru)", "あかるい", "bright / dawn", 8, 2, "kj_day", ["日", "月"],
                  "明日", "あした / あす (ashita/asu)", "次の日", "tomorrow",
                  "窓から差し込む朝の光がとても明るいです。", "まどからさしこむあさのひかりがとてもあかるいです。", "The morning light pouring through the window is wonderfully bright.", "bright"),
        create_kj("kj_dark", "暗", "アン (an)", "くら-い (kura-i)", "くらい", "dark", 13, 2, "kj_day", ["日", "音"],
                  "暗記", "あんき (anki)", "記憶すること", "memorization",
                  "日が暮れて周りが少しずつ暗くなってきました。", "ひがくれてまわりがすこしずつくらくなってきました。", "The sun set and the surroundings gradually grew dark.", "dark"),
        create_kj("kj_peace_safe", "安", "アン (an)", "やす-い (yasu-i)", "やすい / あんしん", "peace / safe / inexpensive", 6, 2, "kj_house", ["宀", "女"],
                  "安全", "あんぜん (anzen)", "危険がないこと", "safety",
                  "家族みんなが元気で無事に暮らせるのが一番の安心です。", "かぞくみんながげんきでぶじにくらせるのがいちばんのあんしんです。", "Living safely with the whole family in good health is the best peace of mind.", "peace"),
        create_kj("kj_think_field", "思", "シ (shi)", "おも-う (omo-u)", "おもう", "think / feel", 9, 2, "kj_heart_mind", ["田", "心"],
                  "思い出", "おもいで (omoide)", "心に残る記憶", "memories",
                  "大切な人への感謝の思いを胸に抱いています。", "たいせつなひとへのかんしゃのおもいをむねにいだいています。", "I hold thoughts of gratitude towards cherished people in my heart.", "think"),
        create_kj("kj_imagine", "想", "ソウ / ショウ (sō/shō)", "", "そう / おもい", "idea / thought / imagine", 13, 3, "kj_think_field", ["相", "心"],
                  "理想", "りそう (risō)", "もっとも望ましい状態", "ideal",
                  "幼い頃に思い描いた夢を胸に歩み続けます。", "おさないころにおもいえがいたゆめをむねにあゆみつづけます。", "I keep walking with the dreams I envisioned in my youth.", "dream"),
        create_kj("kj_goods_quality", "品", "ヒン (hin)", "しな (shina)", "しな / ひん", "goods / refinement", 9, 2, "kj_mouth", ["口", "口", "口"],
                  "品質", "ひんしつ (hinshitsu)", "品物の質", "quality",
                  "手作りの伝統工芸品はとても上品な美しさがあります。", "てづくりのでんとうこうげいひんはとてもじょうひんなうつくしさがあります。", "Handmade traditional craft goods carry a very refined elegance.", "gift"),
        create_kj("kj_cry_ring", "鳴", "メイ (mei)", "な-く / な-る (na-ku/na-ru)", "なく / なる", "ring / bird chirping", 14, 2, "kj_bird", ["口", "鳥"],
                  "悲鳴", "ひめい (himei)", "驚きの声", "cry / scream",
                  "朝の庭で鈴虫が涼やかに鳴いていました。", "あさのにわですずむしがすずやかになっていました。", "Bell-ring crickets were chirping coolly in the morning garden.", "sing"),
        create_kj("kj_protect", "保", "ホ / ホウ (ho/hō)", "たも-つ (tamo-tsu)", "たもつ", "protect / preserve", 9, 2, "kj_person", ["亻", "呆"],
                  "保存", "ほぞん (hozon)", "そのまま残すこと", "preservation",
                  "豊かな自然環境を次の世代へ大切に保護しましょう。", "ゆたかなしぜんかんきょうをつぎのせだいへたいせつにほごしましょう。", "Let's carefully preserve the rich environment for the next generation.", "peace"),
        create_kj("kj_mutual", "相", "ソウ / ショウ (sō/shō)", "あい (ai)", "あい / そうだん", "mutual / minister", 9, 2, "kj_tree", ["木", "目"],
                  "相談", "そうだん (sōdan)", "話し合って決めること", "consultation",
                  "お互いに助け合って支え合う社会が理想です。", "おたがいにたすけあってささえあうしゃかいがりそうです。", "A society where people mutually help and support each other is ideal.", "friend"),
        create_kj("kj_clear_pure", "清", "セイ / ショウ (sei/shō)", "きよ-い / きよ-まる (kiyo-i)", "きよい", "pure / clean", 11, 2, "kj_water", ["氵", "青"],
                  "清流", "せいりゅう (seiryū)", "澄んだ綺麗な流れ", "clear stream",
                  "山の奥深くの清らかな湧き水で喉を潤しました。", "やまのおくふかくのきよらかなわきみずでのどをうるおしました。", "I refreshed my throat with pure spring water deep in the mountains.", "water"),
        create_kj("kj_warm_gentle", "温", "オン (on)", "あたた-かい / あたた-まる (atata-kai)", "あたたかい", "warm", 12, 2, "kj_water", ["氵", "昷"],
                  "温度", "おんど (ondo)", "温かさの度合い", "temperature",
                  "寒い冬の日に飲む温かいスープは心まで温めます。", "さむいふゆのひにのむあたたかいすーぷはこころまであたためます。", "Warm soup on a cold winter day warms even the spirit.", "tea"),
        create_kj("kj_cold_chilly", "冷", "レイ (rei)", "つめ-たい / ひ-える (tsume-tai/hi-eru)", "つめたい", "cold / chilly", 7, 2, "kj_water", ["冫", "令"],
                  "冷蔵庫", "れいぞうこ (reizōko)", "食材を冷やす家電", "refrigerator",
                  "夏の暑い日に冷たい湧き水を一口飲みました。", "なつのあついひにつめたいわきみずをひとくちのみました。", "On a hot summer day I drank a sip of chilled spring water.", "snow"),
        create_kj("kj_open_gate", "開", "カイ (kai)", "ひら-く / あ-く (hira-ku/a-ku)", "ひらく / あく", "open", 12, 1, "kj_gate", ["門", "开"],
                  "開店", "かいてん (kaiten)", "店を開くこと", "opening a shop",
                  "窓を開けると心地よい朝風が部屋に入ってきました。", "まどをひらけるとここちよいあさかぜがへやにはいってきました。", "Opening the window a pleasant morning breeze flowed into the room.", "open"),
        create_kj("kj_close_gate", "閉", "ヘイ (hei)", "と-じる / し-める (to-jiru/shi-meru)", "とじる / しまる", "close / shut", 11, 1, "kj_gate", ["門", "才"],
                  "閉館", "へいかん (heikan)", "館を閉めること", "closing the building",
                  "本を静かに閉じて一日の充実を振り返りました。", "ほんをしずかにとじていちにちのじゅうじつをふりかえりました。", "Closing the book quietly I reflected on the day's fulfillment.", "close"),
        create_kj("kj_begin", "始", "シ (shi)", "はじ-まる / はじ-める (haji-maru/haji-meru)", "はじまる", "begin / start", 8, 2, "kj_woman", ["女", "台"],
                  "開始", "かいし (kaishi)", "物事を始めること", "start / begin",
                  "新しい学期が始まってワクワクしています。", "あたらしいがっきがはじまってわくわくしています。", "The new semester has begun and I am thoroughly excited.", "begin"),
        create_kj("kj_finish", "終", "シュウ (shū)", "お-わる / お-える (o-waru/o-eru)", "おわる", "end / finish", 11, 2, "kj_winter", ["糸", "冬"],
                  "終了", "しゅうりょう (shūryō)", "終わること", "finish / end",
                  "仕事が無事に終了してほっと息をつきました。", "しごとがぶじにしゅうりょうしてほっといきをつきました。", "Work finished safely and I took a deep sigh of relief.", "end"),
        create_kj("kj_flame", "炎", "エン (en)", "ほのお (honō)", "ほのお", "flame / blaze", 8, 2, "kj_fire", ["火", "火"],
                  "炎天下", "えんてんか (entenka)", "真夏の強い日差しの下", "under the blazing sun",
                  "暖炉の赤い炎を見つめながら夜の静けさを楽しみました。", "だんろのあかいほのおをみつめながらよるのしずけさをたのしみました。", "Watching the red flames of the fireplace I enjoyed the night's quiet.", "fire"),
        create_kj("kj_rock_cliff", "岩", "ガン (gan)", "いわ (iwa)", "いわ", "rock / boulder", 8, 2, "kj_mountain", ["山", "石"],
                  "岩石", "がんせき (ganseki)", "岩と石", "rock / boulder",
                  "海辺の大きな岩の上にカモメがとまっています。", "うみべのおおきなわのうえにかもめがとまっています。", "On a large coastal rock a seagull rests comfortably.", "stone"),
        create_kj("kj_shine_glory", "栄", "エイ (ei)", "さか-える / は-え (saka-eru/ha-e)", "さかえる", "glory / flourish", 9, 2, "kj_tree", ["冖", "木"],
                  "繁栄", "はんえい (han'ei)", "豊かに栄えること", "prosperity",
                  "古い街並みが今も温かく栄えています。", "ふるいまちなみがいまもあたたかくさかえています。", "The old streetscape still flourishes warmly today.", "flower"),
        create_kj("kj_flourish", "華", "カ / ケ (ka/ke)", "はな (hana)", "はなやか", "splendor / flower", 10, 2, "kj_flower", ["艹", "十"],
                  "華やか", "はなやか (hanayaka)", "美しくきらびやかな様子", "splendid / gorgeous",
                  "春の訪れとともに庭が一層華やかになりました。", "はるのおとづれとともににわがいっそうはなやかになりました。", "With the coming of spring the garden became all the more gorgeous.", "flower")
    ]
}
kanji_branches.append(b_compounds_kj)

total_kanji = sum(len(b["characters"]) for b in kanji_branches)
print(f"Total Kanji branches: {len(kanji_branches)}, characters: {total_kanji}")

with open(os.path.join(data_dir, "kanji.json"), "w", encoding="utf-8") as f:
    json.dump({"branches": kanji_branches}, f, ensure_ascii=False, indent=2)

print(f"GRAND TOTAL CHARACTERS: {total_hanja} (Hanja) + {total_kanji} (Kanji) = {total_hanja + total_kanji} characters!")
