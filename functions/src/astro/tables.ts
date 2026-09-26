// Static Vedic astrology reference tables. Indices are 0-based throughout:
// rashi 0 = Mesha (Aries) … 11 = Meena (Pisces); nakshatra 0 = Ashwini … 26 = Revati.

export type Planet = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn";
export type Gana = "Deva" | "Manushya" | "Rakshasa";
export type Nadi = "Adi" | "Madhya" | "Antya";
export type Varna = "Brahmin" | "Kshatriya" | "Vaishya" | "Shudra";
export type VashyaGroup = "Chatushpada" | "Manava" | "Jalachara" | "Vanachara" | "Keeta";
export type Yoni =
  | "Horse" | "Elephant" | "Sheep" | "Serpent" | "Dog" | "Cat" | "Rat"
  | "Cow" | "Buffalo" | "Tiger" | "Deer" | "Monkey" | "Mongoose" | "Lion";

export interface RashiInfo {
  name: string;
  english: string;
  hindi: string;
  lord: Planet;
  varna: Varna;
}

export const RASHIS: readonly RashiInfo[] = [
  { name: "Mesha", english: "Aries", hindi: "मेष", lord: "Mars", varna: "Kshatriya" },
  { name: "Vrishabha", english: "Taurus", hindi: "वृषभ", lord: "Venus", varna: "Vaishya" },
  { name: "Mithuna", english: "Gemini", hindi: "मिथुन", lord: "Mercury", varna: "Shudra" },
  { name: "Karka", english: "Cancer", hindi: "कर्क", lord: "Moon", varna: "Brahmin" },
  { name: "Simha", english: "Leo", hindi: "सिंह", lord: "Sun", varna: "Kshatriya" },
  { name: "Kanya", english: "Virgo", hindi: "कन्या", lord: "Mercury", varna: "Vaishya" },
  { name: "Tula", english: "Libra", hindi: "तुला", lord: "Venus", varna: "Shudra" },
  { name: "Vrishchika", english: "Scorpio", hindi: "वृश्चिक", lord: "Mars", varna: "Brahmin" },
  { name: "Dhanu", english: "Sagittarius", hindi: "धनु", lord: "Jupiter", varna: "Kshatriya" },
  { name: "Makara", english: "Capricorn", hindi: "मकर", lord: "Saturn", varna: "Vaishya" },
  { name: "Kumbha", english: "Aquarius", hindi: "कुंभ", lord: "Saturn", varna: "Shudra" },
  { name: "Meena", english: "Pisces", hindi: "मीन", lord: "Jupiter", varna: "Brahmin" },
];

export interface NakshatraInfo {
  name: string;
  hindi: string;
  lord: string;
  gana: Gana;
  yoni: Yoni;
  nadi: Nadi;
}

export const NAKSHATRAS: readonly NakshatraInfo[] = [
  { name: "Ashwini", hindi: "अश्विनी", lord: "Ketu", gana: "Deva", yoni: "Horse", nadi: "Adi" },
  { name: "Bharani", hindi: "भरणी", lord: "Venus", gana: "Manushya", yoni: "Elephant", nadi: "Madhya" },
  { name: "Krittika", hindi: "कृत्तिका", lord: "Sun", gana: "Rakshasa", yoni: "Sheep", nadi: "Antya" },
  { name: "Rohini", hindi: "रोहिणी", lord: "Moon", gana: "Manushya", yoni: "Serpent", nadi: "Antya" },
  { name: "Mrigashira", hindi: "मृगशिरा", lord: "Mars", gana: "Deva", yoni: "Serpent", nadi: "Madhya" },
  { name: "Ardra", hindi: "आर्द्रा", lord: "Rahu", gana: "Manushya", yoni: "Dog", nadi: "Adi" },
  { name: "Punarvasu", hindi: "पुनर्वसु", lord: "Jupiter", gana: "Deva", yoni: "Cat", nadi: "Adi" },
  { name: "Pushya", hindi: "पुष्य", lord: "Saturn", gana: "Deva", yoni: "Sheep", nadi: "Madhya" },
  { name: "Ashlesha", hindi: "आश्लेषा", lord: "Mercury", gana: "Rakshasa", yoni: "Cat", nadi: "Antya" },
  { name: "Magha", hindi: "मघा", lord: "Ketu", gana: "Rakshasa", yoni: "Rat", nadi: "Antya" },
  { name: "Purva Phalguni", hindi: "पूर्वा फाल्गुनी", lord: "Venus", gana: "Manushya", yoni: "Rat", nadi: "Madhya" },
  { name: "Uttara Phalguni", hindi: "उत्तरा फाल्गुनी", lord: "Sun", gana: "Manushya", yoni: "Cow", nadi: "Adi" },
  { name: "Hasta", hindi: "हस्त", lord: "Moon", gana: "Deva", yoni: "Buffalo", nadi: "Adi" },
  { name: "Chitra", hindi: "चित्रा", lord: "Mars", gana: "Rakshasa", yoni: "Tiger", nadi: "Madhya" },
  { name: "Swati", hindi: "स्वाति", lord: "Rahu", gana: "Deva", yoni: "Buffalo", nadi: "Antya" },
  { name: "Vishakha", hindi: "विशाखा", lord: "Jupiter", gana: "Rakshasa", yoni: "Tiger", nadi: "Antya" },
  { name: "Anuradha", hindi: "अनुराधा", lord: "Saturn", gana: "Deva", yoni: "Deer", nadi: "Madhya" },
  { name: "Jyeshtha", hindi: "ज्येष्ठा", lord: "Mercury", gana: "Rakshasa", yoni: "Deer", nadi: "Adi" },
  { name: "Mula", hindi: "मूल", lord: "Ketu", gana: "Rakshasa", yoni: "Dog", nadi: "Adi" },
  { name: "Purva Ashadha", hindi: "पूर्वाषाढ़ा", lord: "Venus", gana: "Manushya", yoni: "Monkey", nadi: "Madhya" },
  { name: "Uttara Ashadha", hindi: "उत्तराषाढ़ा", lord: "Sun", gana: "Manushya", yoni: "Mongoose", nadi: "Antya" },
  { name: "Shravana", hindi: "श्रवण", lord: "Moon", gana: "Deva", yoni: "Monkey", nadi: "Antya" },
  { name: "Dhanishta", hindi: "धनिष्ठा", lord: "Mars", gana: "Rakshasa", yoni: "Lion", nadi: "Madhya" },
  { name: "Shatabhisha", hindi: "शतभिषा", lord: "Rahu", gana: "Rakshasa", yoni: "Horse", nadi: "Adi" },
  { name: "Purva Bhadrapada", hindi: "पूर्वा भाद्रपद", lord: "Jupiter", gana: "Manushya", yoni: "Lion", nadi: "Adi" },
  { name: "Uttara Bhadrapada", hindi: "उत्तरा भाद्रपद", lord: "Saturn", gana: "Manushya", yoni: "Cow", nadi: "Madhya" },
  { name: "Revati", hindi: "रेवती", lord: "Mercury", gana: "Deva", yoni: "Elephant", nadi: "Antya" },
];

export const VARNA_RANK: Record<Varna, number> = { Brahmin: 4, Kshatriya: 3, Vaishya: 2, Shudra: 1 };

export const YONI_ORDER: readonly Yoni[] = [
  "Horse", "Elephant", "Sheep", "Serpent", "Dog", "Cat", "Rat",
  "Cow", "Buffalo", "Tiger", "Deer", "Monkey", "Mongoose", "Lion",
];

// Symmetric yoni compatibility matrix (0–4), rows/cols in YONI_ORDER.
export const YONI_MATRIX: readonly (readonly number[])[] = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4],
];

export const VASHYA_ORDER: readonly VashyaGroup[] = ["Chatushpada", "Manava", "Jalachara", "Vanachara", "Keeta"];

// Vashya points (0–2), row = groom's group, column = bride's group.
export const VASHYA_MATRIX: readonly (readonly number[])[] = [
  [2, 1, 1, 0.5, 1],
  [0, 2, 0.5, 0, 1],
  [1, 0.5, 2, 1, 1],
  [0.5, 0, 1, 2, 0],
  [1, 1, 1, 0, 2],
];

type Relation = "friend" | "neutral" | "enemy";

// Naisargika (natural) planetary relationships.
export const PLANET_RELATIONS: Record<Planet, Record<Planet, Relation>> = {
  Sun: { Sun: "friend", Moon: "friend", Mars: "friend", Mercury: "neutral", Jupiter: "friend", Venus: "enemy", Saturn: "enemy" },
  Moon: { Sun: "friend", Moon: "friend", Mars: "neutral", Mercury: "friend", Jupiter: "neutral", Venus: "neutral", Saturn: "neutral" },
  Mars: { Sun: "friend", Moon: "friend", Mars: "friend", Mercury: "enemy", Jupiter: "friend", Venus: "neutral", Saturn: "neutral" },
  Mercury: { Sun: "friend", Moon: "enemy", Mars: "neutral", Mercury: "friend", Jupiter: "neutral", Venus: "friend", Saturn: "neutral" },
  Jupiter: { Sun: "friend", Moon: "friend", Mars: "friend", Mercury: "enemy", Jupiter: "friend", Venus: "enemy", Saturn: "neutral" },
  Venus: { Sun: "enemy", Moon: "enemy", Mars: "neutral", Mercury: "friend", Jupiter: "neutral", Venus: "friend", Saturn: "friend" },
  Saturn: { Sun: "enemy", Moon: "enemy", Mars: "enemy", Mercury: "friend", Jupiter: "neutral", Venus: "friend", Saturn: "friend" },
};

export const GANA_ORDER: readonly Gana[] = ["Deva", "Manushya", "Rakshasa"];

// Gana points (0–6), row = groom's gana, column = bride's gana.
export const GANA_MATRIX: readonly (readonly number[])[] = [
  [6, 6, 0],
  [5, 6, 0],
  [1, 0, 6],
];
