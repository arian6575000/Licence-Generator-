# License System: Integration Guide

Is guide mein likha hai ke License Generator app ko kaise chalana hai aur apni client apps (APK aur exe) mein license check kaise lagana hai.

## 1. Poora nizam ek nazar mein

```
Client app                        Generator app (sirf aap ke paas)
-----------                       --------------------------------
Device ID banati hai   ------->    Device ID + App code + Name + Muddat
(hardware hash)                    Private key se sign karta hai
                       <-------    License string  (GLN1.xxxx.yyyy)
Public key se verify:
 - signature theek?
 - app code match?
 - device ID match?
 - muddat khatam to nahi?
```

- **Private key** sirf generator mein rehti hai. Isse license banta hai.
- **Public key** client apps mein lagti hai. Isse sirf verify hota hai, license nahi ban sakta.
- Sab kuch **offline** hai, internet ki zaroorat nahi.
- License ek hi device aur ek hi app ke liye valid hota hai.

License string ka format: `GLN1.<payload base64url>.<signature base64url>`

Payload mein: `id, app, did (device id), name, iat (issue time), exp (expiry, 0 = lifetime)`.

## 2. Generator app chalana aur build karna

Project folder mein (Node.js installed ho):

```bash
npm install
npm test            # license logic ke tests
npm run android     # Expo Go / phone par chalane ke liye
npm run web         # browser mein test ke liye
```

**APK banana (EAS):**

```bash
npm i -g eas-cli
eas login
eas build -p android --profile preview     # APK ban kar download link milta hai
```

**Windows exe banana** (Windows machine par):

```bash
npm install
npm run exe:build      # release/ folder mein portable .exe banta hai
```

Test ke liye bina build ke: `npm run web:export` phir `npm run exe:dev`.

Note: exe mein keys aur history Electron ke local storage mein save hoti hain (Windows user ke profile mein). Is liye exe mein bhi key ka **backup** zaroor lein.

## 3. Pehli baar ka setup (sirf ek dafa)

1. Generator kholein, **Keys** tab par jayen.
2. **Key pair banayen** dabayen.
3. **Public key** copy karein. Yeh har client app mein lagani hai.
4. **Private key export** se backup lein aur password manager ya kisi mehfooz jagah rakhein.
   Yeh kho gayi to nayi key banani paregi aur purane saare licenses kaam nahi karenge.
5. Agar dusre phone ya exe mein bhi generator chalana ho to wahan Keys tab ke **Import** mein wahi private key paste karein, taake dono jagah se same public key ke licenses banen.

**Ek hi key pair sab apps ke liye.** Har app ko alag *App code* (jaise `darzihub`, `bpjourney`, `contracthub`) milta hai, is liye ek app ka license dusri app mein nahi chalega.

## 4. Client app: Expo / React Native (APK)

Files `client-sdk/expo/` mein hain: `licenseCore.ts`, `deviceId.ts`, `licenseClient.ts`, `LicenseGate.tsx`.

**Steps:**

1. Packages:
   ```bash
   npx expo install expo-application expo-device expo-crypto expo-secure-store
   npm i tweetnacl tweetnacl-util
   ```
2. `client-sdk/expo/` ki chaaron files apni app ke `src/license/` mein copy karein.
3. `licenseClient.ts` mein do cheezein badlein:
   ```ts
   export const APP_CODE = "darzihub";      // generator mein bhi yehi app code likhna hai
   export const PUBLIC_KEY = "....";        // Keys tab se copy ki hui public key
   ```
4. Root layout (`app/_layout.tsx`) mein app ko gate mein lapetein:
   ```tsx
   import LicenseGate from "../src/license/LicenseGate";

   export default function Layout() {
     return (
       <LicenseGate>
         <Stack />   {/* aap ki purani layout */}
       </LicenseGate>
     );
   }
   ```
5. Build karein. App pehli dafa **Activation** screen dikhayegi jis par Device ID hogi.

Dhyan dein: `licenseCore.ts` mein signing ke functions bhi hain, lekin woh private key ke baghair kuch nahi kar sakte. Private key client app mein kabhi na rakhein.

## 5. Client app: Electron / Node exe

Files `client-sdk/node/` mein hain: `deviceId.js`, `license.js`.

1. `npm i tweetnacl tweetnacl-util`
2. Dono files apni app mein copy karein.
3. `license.js` mein `APP_CODE` aur `PUBLIC_KEY` badlein.
4. Electron main process mein:
   ```js
   const { app } = require("electron");
   const { makeLicense } = require("./license/license");

   app.whenReady().then(() => {
     const lic = makeLicense(app.getPath("userData"));
     const r = lic.checkSaved();
     if (!r.ok) {
       // Activation window dikhayen: lic.deviceId() dikhayen,
       // user ka paste kiya license lic.activate(text) se check karein.
       // Jab tak r.ok na ho, asal window na kholein.
     }
   });
   ```
5. Muddat ke dauran bhi check chalate rahein: app start par aur har kuch ghanton baad `lic.checkSaved()` dobara chalayen.

## 6. Client app: .NET exe (WinForms / WPF)

File: `client-sdk/dotnet/LicenseCheck.cs`

1. NuGet: `BouncyCastle.Cryptography`
2. File project mein add karein, `AppCode` aur `PublicKey` badlein.
3. Startup par:
   ```csharp
   var r = LicenseCheck.CheckSaved();
   if (!r.Ok)
   {
       // ActivationForm dikhayen: LicenseCheck.GetDeviceId() dikhayen,
       // textbox ka license LicenseCheck.Activate(text) se check karein.
       // Fail ho to application band kar dein.
   }
   ```

Device ID ka algorithm har platform par alag ho sakta hai, koi masla nahi. Zaroori sirf yeh hai ke ek app apni hi Device ID banaye aur apni hi verify kare. Format hamesha `XXXX-XXXX-XXXX-XXXX-XXXX` (20 hex characters) hona chahiye.

## 7. Customer ke saath roz ka tareeqa

1. Customer app kholta hai, activation screen par apni **Device ID** dekhta hai aur aap ko bhejta hai.
2. Aap generator mein **App code**, **Device ID**, **Customer name**, **Muddat** bharte hain.
3. **License generate karein** dabayen, phir **Copy / Share** se customer ko bhej dein.
4. Customer license paste kar ke **Activate** dabata hai.
5. History tab mein har license ka record rehta hai (search aur CSV export ke saath).
6. Muddat ke baad app khud lock ho jati hai. Dobara chalane ke liye naya license generate karein (naya record ban jayega).

## 8. Zaroori baatein aur hadood

- **Private key ka backup** sab se zaroori hai.
- Agar user phone ki date peeche kar de, to app pichla chalne ka waqt yaad rakhti hai aur "clock" error de kar lock kar deti hai. Is ke liye app kam az kam ek dafa valid license ke saath chal chuki ho.
- **Android ID** factory reset par badal jati hai, aur Android 8+ par har app ki signing key ke hisaab se alag hoti hai. Is liye reset ke baad naya license dena parega, aur har app ki Device ID alag hogi (license bhi app ke hisaab se hi bante hain, is liye yeh theek hai).
- Windows par Device ID motherboard reinstall ya Windows dobara install karne par badal sakti hai.
- Offline license 100% crack-proof nahi hota. Jo shakhs app ka code badal kar check hata de, woh bypass kar sakta hai. Rukawat barhane ke liye: release build, JS obfuscation (APK), .NET obfuscator (exe), aur license check ko app mein ek se zyada jagah rakhna. Ye cheezein casual copying rokti hain.
- Licenses ki history generator ke apne device mein hoti hai. Phone/exe ka data saaf hone par history bhi jati hai, is liye CSV export kabhi kabhi lete rahein.

## 9. Error ki wajah

| Reason | Matlab |
|---|---|
| `format` | License khali ya galat paste hua |
| `signature` | License tampered hai ya dusri key se bana hai (public key check karein) |
| `app` | App code generator aur client mein alag hai |
| `device` | License kisi aur device ke liye bana hai |
| `expired` | Muddat khatam |
| `clock` | Device ki date peeche ki gayi hai |

## 10. GitHub Actions se automatic build (unzip + APK + exe)

1. Naya GitHub repo banayen. Repo ke root mein `license-generator.zip` rakhein.
2. `build.yml` ko repo mein `.github/workflows/build.yml` par rakhein.
3. Push karein (ya Actions tab mein "Run workflow" dabayen).
4. Workflow zip ko khud unzip karti hai, typecheck aur tests chalati hai, phir do files banati hai:
   - `LicenseGenerator-apk` (Android APK)
   - `LicenseGenerator-exe` (Windows portable exe)
5. Dono run ke Artifacts section se download karein.

APK debug keystore se sign hoti hai, jo install aur andar ke use ke liye theek hai. Play Store ke liye apni release keystore alag se lagani paregi.
