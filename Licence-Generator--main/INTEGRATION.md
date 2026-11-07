# License Generator v2: Guide

Android app jo **sirf do kaam** karti hai: **clients banana** aur un ke liye **licenses generate karna**.
Projects, plans, features aur releases Hub se aate hain aur app mein sirf dekhne ke liye hain.
License format wahi hai (`MPOS-LIC-<payload>.<Ed25519 signature>`), isliye purani RetailX apps ke liye kuch nahi badalta.

## 1. Pehla setup (ek dafa, internet chahiye)

1. App kholein, **Hub URL**, username, password likhein, **Login**. (Is phone ko Hub mein "device" ke taur par register karta hai.)
2. **PIN** banayen (4-8 digits). Keys is phone par hain, isliye app PIN ke peeche rehti hai. Fingerprint/face Settings mein on kar sakte hain.
3. App khud sync karti hai: Hub se signing keys (Android Keystore mein), projects, plans, releases aati hain.

## 2. Roz ka kaam (offline bhi)

1. **Clients** tab: "+ Naya", naam aur phone zaroori, baaqi optional. Edit ho sakta hai, delete sirf Hub se.
2. **Generate** tab: client chunein (ya wahin naya banayen), project, plan, client ki Device/Machine ID, muddat, zarurat ho to features badlein, **License generate karein**, phir Copy / Share.
3. **Licenses** tab: har license ka status, search, filters, CSV. **Renew** naya key banata hai (wohi license, nayi muddat).
4. Block / unblock / delete sirf Hub dashboard se hota hai. App sirf unka status dikhati hai.

Ek device par ek project ka ek hi license chal sakta hai; dobara banane ke bajaye Renew use karein.

## 3. Sync

- Upar kone mein button: **Synced**, **N baaqi** (Hub par bhejna baaqi), **Sync zaroori**.
- Offline kiya hua sab kuch "pending" rehta hai aur internet milte hi apne aap Hub par jata hai (app kholne par, net wapas aane par, ya button dabane par). Dobara bhejne se duplicate nahi banta.
- Hub par jo badalta hai (block, extend, naye clients) wo bhi aa jata hai.
- **Masail** (Settings > Sync masail, ya Licenses > "Sync masail"): agar Hub kisi record ko radd kare (jaise is device ka license pehle se maujood, ya Hub par blocked), wajah likhi hoti hai. **Dobara bhejein** ya **Hata dein** (sirf wo jo Hub ne kabhi qabool nahi kiya).
- Phone mein agar client ka phone Hub ke kisi purane client se milta ho to wo usi se jod diya jata hai.

## 4. Security aur hadden

- Keys sirf Keystore-backed secure storage mein, kabhi file ya screenshot mein nahi (screenshots band hain).
- App 1 minute background mein rahe to dobara PIN mangti hai. 5 ghalat PIN ke baad intezar barhta jata hai.
- **Offline hadd: 14 din.** Is se zyada sync na ho to Generate/Renew band ho jata hai, jab tak internet par sync na karein. (Offline signing ki wajah se kisi phone ko door se roka nahi ja sakta; Hub se "revoke" karne par agli sync par lock ho jata hai.)
- Phone ki date peeche karne ki koshish par bhi lock; Hub ka time (sync par) expiry ke hisaab mein use hota hai.
- Logout par signing keys phone se hat jati hain; clients/licenses data rehta hai.
- Purani app ka data (licenses_v2) pehli dafa khulne par apne aap import hota hai ("Purani record"). Hub par bhejna **Settings > Purani app ke licenses** se aap ke control mein hai.

## 5. Developers ke liye

- `npm test` : unit tests (licenseCore + core logic).
- `HUB_URL=... HUB_USER=... HUB_PASS=... npm run test:e2e` : asli Hub ke khilaf end-to-end sync test. **Sirf local/test Hub par chalayen**, yeh khud ka project/data banata hai.
- Hub URL ka default `src/lib/config.ts` mein hai. Offline hadd bhi wahin (`OFFLINE_GRACE_DAYS`).
- Code: `src/lib/` (pure logic: sync, generate, safety, hub client), `src/native/` (SQLite, SecureStore), `src/screens` aur `app/` (UI).

## 5. Client apps mein license check lagana

Sab clients ek hi kaam karte hain: `MPOS-LIC-` license ko public key se verify karte hain, phir machine ID, project code, muddat aur clock check karte hain.

### 5.1 Expo / React Native (APK)

Files `client-sdk/expo/` mein hain.

1. `npx expo install expo-secure-store expo-application expo-device expo-crypto` aur `npm i tweetnacl tweetnacl-util`
2. Chaaron files apni app ke `src/license/` mein copy karein.
3. `licenseClient.ts` mein badlein:
   ```ts
   export const PROJECT_CODE = "darzihub";                    // Hub Info tab mein project ka code
   export const PUBLIC_KEY_HEX = "....";                      // Hub Info tab mein project ki public key (copy karein)
   ```
4. Root layout mein:
   ```tsx
   import LicenseGate from "../src/license/LicenseGate";
   export default function Layout() {
     return <LicenseGate><Stack /></LicenseGate>;
   }
   ```
5. App ke andar plan aur features: `const lic = useLicense(); lic?.payload.features["premium"]`
6. Muddat khatam hone se 3 din pehle app khud warning dikhati hai.

## 6. Build

**Local:** `npm install`, `npm test`, `npx tsc --noEmit`.

**GitHub (zip se):** repo mein `license-generator.zip` rakhein (push karein), unzip wali workflow (New Unzip / Extract ZIP / main.yml) usay khol kar project files replace karti hai, phir build workflow **APK** banati hai (Artifacts aur Releases mein). Ab sirf Android APK banta hai (exe/Electron hata diya gaya hai). Package name wahi hai (`com.arian6575000.licensegenerator`), isliye naya APK purani app ke upar install hota hai aur purana data (licenses) import ho jata hai.

## 7. Hadood aur ehtiyat

- **Block / unblock / expiry ka live control Hub ka kaam hai.** Generator ke zariye offline sirf naya ya renew license ban sakta hai.
- Signing keys Hub se aati hain: unka asli backup Hub ke environment (Render/Vercel) mein hai. Client apps mein jo **public key** lagi hai wo us project ki Hub wali public key honi chahiye (Hub Info tab mein dekhein).
- Offline license casual copying rokta hai, code patch karne wale se 100% nahi bachata (obfuscation madadgar hai).
- Android ID factory reset par badal jati hai, is liye reset ke baad naya license dena parta hai.
