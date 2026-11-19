# Mastermoshai app (Android / iOS)

The app is a native shell around the website (https://mastermoshai.netlify.app).
Every web update shows up in the app instantly, no store update needed.
Native bits: camera/mic for live class, screen stays awake in class, hardware
back button, offline screen, files (PDF/PPT/video) open in the phone's own apps.

## One-time setup (owner)
1. Make an account at https://expo.dev (sign in with GitHub is fine).
2. Create a project named `mastermoshai`, copy its **Project ID** and send it to Claude
   (it is not a secret). Claude adds it to `app.json` → `extra.eas.projectId`.
3. In expo.dev → project → GitHub: link `meritoglobal/meritotuition`, base directory `apps/mobile`.

## Test APK (free)
expo.dev → Builds → New build → Android, profile **preview**. In ~15 min you get an
APK link; open it on an Android phone and install.

## Play Store and App Store
See [STORE-RELEASE.md](STORE-RELEASE.md) (Bangla): accounts, costs, store rules, listing text, and the
"Store build" GitHub workflow that builds the .aab/.ipa on EAS.

## Change the site URL
`app.json` → `expo.extra.siteUrl` (e.g. https://mastermoshai.net once the domain is bought).
