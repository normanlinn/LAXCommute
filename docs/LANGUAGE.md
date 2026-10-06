# English and Myanmar

The development branch is `develop/english-myanmar`. The header offers **English / မြန်မာ** buttons on every screen. English is the default. Selecting a language updates the interface immediately and saves the preference on that browser or installed PWA; no account is required. If browser storage is blocked, switching still works for the current session.

Language changes preserve the selected shuttle route, temporary boarding stop, saved commute, and account form input. Stop names, parking lot names, terminal names, route letters, and bus IDs keep their original feed labels so employees can match the screen to physical signs. Arrival numbers remain Latin digits in both languages.

## Review this branch locally

```bash
git fetch origin
git switch develop/english-myanmar
npm ci
npm run dev
```

Open the address printed by Vite. Check both languages at phone and desktop sizes, particularly the boarding selector, arrival advice, account confirmation/recovery screens, installation help, and map controls. Switch languages after selecting a South Lot stop on the East/West route and after typing into an account form.

Have a Burmese-speaking employee review the wording before merging. The translations are an initial draft, use Unicode Myanmar text, and have not received a native-speaker editorial review. The development branch is not automatically a published preview; the production release still uses `main`.

## Translation files

- `src/i18n/my.json` maps English interface messages to Myanmar text. Preserve interpolation names such as `{minutes}`, `{lot}`, and `{seconds}`.
- `src/i18n/guide.ts` contains both versions of the boarding guide.
- `src/i18n/LanguageProvider.tsx` owns the language preference and updates the document language and title. Unexpected server messages fall back to their English text instead of becoming blank.

The initial HTML retains the English guide for crawlers and visitors without JavaScript. Once the app loads, the guide follows the selected language. The switch does not create separate Myanmar URLs or promise separate-language search rankings.

## Typography and licenses

**Pally** gives the English logo and headings a friendly tone. The uploaded Pally Variable font contains no Myanmar glyphs. **Inter** is used for body copy, buttons, forms, and arrival numbers. It loads from the official Google Fonts stylesheet with weights 400–800 and a system sans-serif fallback. See [Inter's source and SIL Open Font License](https://github.com/google/fonts/tree/main/ofl/inter).

Pally is supplied by Indian Type Foundry through [Fontshare's official stylesheet](https://api.fontshare.com/v2/css?f[]=pally@400,500,700&display=swap). The uploaded TTF is not committed, modified, or redistributed in this public repository. See the [Fontshare license](https://www.fontshare.com/licenses/itf-ffl). If the font service is unavailable, system sans-serif fallbacks remain readable.

**Walone** handles Myanmar text. The user supplied Z06-Walone Regular and Bold TTF files are converted without subsetting to WOFF for the PWA. Regular serves weights 100–599 and Bold serves 600–900. Their Unicode coverage includes every Myanmar character currently used in the translation file. Original names and copyright metadata are retained. The uploads identify “Copyright (c) 2022 by ZinBo. All rights reserved.” No redistribution/commercial license was included: obtain the designer’s license before including these fonts in a commercial agreement. The interface no longer selects the previous Noto font.

The service worker precaches the local Myanmar fonts with the app shell. Fontshare and Google Fonts typography files are cached after loading successfully. Live arrivals, authentication, and map tiles still require an internet connection.

## Checks

```bash
npm test
npm run format:check
npm run build
```

Regression tests cover saved language preferences, blocked storage, boarding-stop preservation, account input/error translation, map labels without replacing the map, and the accessible boarding guide.
