/* Nerchuko — language registry. Each entry configures how a language's
   home-screen hero, script font, and text-to-speech behave. Add a new
   language by: (1) writing a data-XX.js curriculum file in the same shape
   as the others, (2) including it in index.html, (3) adding an entry here. */

const LANGUAGES = {
  te: {
    code: "te",
    name: "Telugu",
    heroGlyph: "నేర్చుకో",
    heroSub: "nerchuko — \"learn!\"",
    ttsLocale: "te-IN",
    scriptFont: "'Noto Sans Telugu', 'Nirmala UI', 'Gautami', sans-serif",
    weeks: WEEKS_TE,
  },
  kn: {
    code: "kn",
    name: "Kannada",
    heroGlyph: "ಕಲಿ",
    heroSub: "kali — \"learn!\"",
    ttsLocale: "kn-IN",
    scriptFont: "'Noto Sans Kannada', 'Nirmala UI', 'Tunga', sans-serif",
    weeks: WEEKS_KN,
  },
  de: {
    code: "de",
    name: "German",
    heroGlyph: "Lerne!",
    heroSub: "\"learn!\"",
    ttsLocale: "de-DE",
    scriptFont: "inherit",
    weeks: WEEKS_DE,
  },
  ja: {
    code: "ja",
    name: "Japanese",
    heroGlyph: "学ぼう",
    heroSub: "manabou — \"let's learn!\"",
    ttsLocale: "ja-JP",
    scriptFont: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif",
    weeks: WEEKS_JA,
  },
};

const LANGUAGE_ORDER = ["te", "kn", "de", "ja"];
