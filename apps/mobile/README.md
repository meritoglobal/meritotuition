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

## Play Store
1. Google Play Console account ($25 one time): https://play.google.com/console
2. Create app "মাস্টারমশাই", default language Bangla.
3. expo.dev → New build → Android, profile **production** → download the `.aab`.
4. Upload the `.aab` to Internal testing first, then Production.
5. Privacy policy URL: https://mastermoshai.netlify.app/privacy
6. Data safety: collects name, email, phone (account), audio/video (live class, not shared),
   files uploaded by teachers. Data encrypted in transit; users can ask for deletion.

## Change the site URL
`app.json` → `expo.extra.siteUrl` (e.g. https://mastermoshai.net once the domain is bought).
