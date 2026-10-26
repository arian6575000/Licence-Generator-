# License Generator: Guide

Yeh offline license generator RetailX License Hub ke **wahi license format** par chalta hai (`MPOS-LIC-...`, Ed25519).
Farq sirf yeh hai ke yahan server, heartbeat ya killswitch nahi: sirf license banta hai, aur sab kuch offline hai.

## 1. License kya hota hai

```
MPOS-LIC-<base64url(payload JSON)>.<base64url(Ed25519 signature)>
```

Payload (RetailX jaisa):

| Field | Matlab |
|---|---|
| `machine_id` | Client ke device / hardware ki ID |
| `client_name` | Client ka naam |
| `plan_name`, `max_users` | Plan aur users ki had |
| `created_at`, `expiry_date`, `is_lifetime` | Muddat (lifetime ke liye `2099-12-31`) |
| `features` | Feature toggles, jaise `"pos.billing": true` |
| `project_code`, `license_id` | Sirf apne projects (DarziHub waghera) ke licenses mein |

RetailX ke 4 projects ke licenses mein `project_code` nahi hota, taake unka purana code bina badlaav ke chale.
Is baat ko RetailX ke apne Python code (`CryptoService.verify_license`) se dono taraf test kiya gaya hai:
generator ka license wahan verify hota hai, aur wahan ka license generator verify karta hai.

## 2. Pehla setup (ek dafa)

1. App kholein, **Keys** tab par jayen.
2. Do raaste hain:
   - **Naye projects ke liye (tajweez):** "Key pair banayen" dabayen.
   - **Purane RetailX clients ke liye:** un ki public key jis private key se bani thi, wohi **Import** karein (64 hex characters). Warna purane clients naye licenses ko reject kar denge.
3. **Public key (hex)** copy karein. Yeh har client app mein lagani hai.
4. **Private key export** se backup lein, kisi password manager mein rakhein.
   Private key kabhi README, repo, chat ya client app mein na likhein.

## 3. Roz ka kaam

1. **Generate** tab: Project chunein (RetailX 360 Web, RetailX APK, D POS, Pharmacy, DarziHub, BP Journey, ContractHub).
2. RetailX 360 Web ke liye plan chunein (Starter, Standard, Enterprise ERP). Features automatically bhar jate hain.
3. Client ka naam, phone (sirf aap ke record ke liye), aur client ki Machine / Device ID likhein.
4. Muddat chunein (7/30/90/180 din, 1 saal, lifetime ya custom date).
5. Zarurat ho to **Features badlein** se module-wise toggles on/off karein, ya apna custom feature key add karein.
6. **License generate karein**, phir Copy / Share. Client ko bhej dein.
7. **History** tab mein har license ka record, search, project filter aur CSV export hai.

**Projects** tab mein naya project add ho sakta hai, ya purane ke default features aur max users badal sakte hain.

## 4. Client apps mein license check lagana

Sab clients ek hi kaam karte hain: `MPOS-LIC-` license ko public key se verify karte hain, phir machine ID, project code, muddat aur clock check karte hain.

### 4.1 Expo / React Native (APK)

Files `client-sdk/expo/` mein hain.

1. `npx expo install expo-secure-store expo-application expo-device expo-crypto` aur `npm i tweetnacl tweetnacl-util`
2. Chaaron files apni app ke `src/license/` mein copy karein.
3. `licenseClient.ts` mein badlein:
   ```ts
   export const PROJECT_CODE = "darzihub";                    // Projects tab wala code
   export const PUBLIC_KEY_HEX = "....";                      // Keys tab ki public key
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

### 4.2 Electron / Node exe

Files `client-sdk/node/`: `deviceId.js`, `license.js`. `npm i tweetnacl`, phir `PROJECT_CODE` aur `PUBLIC_KEY_HEX` badlein.

```js
const { makeLicense } = require("./license/license");
const lic = makeLicense(app.getPath("userData"));
const r = lic.checkSaved();
if (!r.ok) { /* activation window: lic.deviceId() dikhayen, lic.activate(text) se check karein */ }
else if (r.can("accounting")) { /* feature check */ }
```

### 4.3 .NET exe

File `client-sdk/dotnet/LicenseCheck.cs`, NuGet `BouncyCastle.Cryptography`.

```csharp
var r = LicenseCheck.CheckSaved();
if (!r.Ok) { /* ActivationForm: LicenseCheck.GetMachineId() dikhayen, LicenseCheck.Activate(text) */ }
bool acc = LicenseCheck.Can(r, "accounting");
```

### 4.4 RetailX ke purane projects

Un ka verify code pehle se maujood hai (RetailX ki `CryptoService.verify_license`). Sirf unki public key wohi rehni chahiye jis private key se aap ab generate karte hain.
Machine ID wahi likhein jo RetailX software khud dikhata hai (hardware hash wali ID).

## 5. Build

**Local:** `npm install`, `npm test`, `npm run web` (browser mein test).

**GitHub (zip se):**
1. Repo ke root mein sirf `license-generator.zip` rakhein. Zip ke andar files seedhi root par honi chahiyen (koi upar wala folder nahi).
2. Actions > **Extract ZIP in Repository Root** > Run workflow. Yeh purani files hata kar zip khol deti hai aur phir `android-apk.yml` chalati hai.
3. `.github/workflows/android-apk.yml` APK aur Windows exe banati hai (Artifacts aur Releases mein milti hain).
4. Repo ke purane `main.yml`, `build.yml`, `build-1.yml` delete kar dein, warna har push par woh bhi chalti hain.

## 6. Hadood aur ehtiyat

- **Offline hone ki wajah se live control nahi:** killswitch, license ko door se block karna, ya expiry badhana mumkin nahi. Muddat badhani ho to naya license generate karein. Yeh sab RetailX Hub (online server) ka kaam hai.
- Date peeche karne se bachne ke liye client "last seen" yaad rakhta hai.
- Offline license casual copying rokta hai, code patch karne wale se 100% nahi bachata (obfuscation madadgar hai).
- Private key ka backup lein. Kho gayi to us key ke naye licenses nahi ban sakenge.
- Android ID factory reset par badal jati hai, is liye reset ke baad naya license dena parta hai.
