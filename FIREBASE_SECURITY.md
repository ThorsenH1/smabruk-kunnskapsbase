# 🔐 Firebase Sikkerhet - Viktig Informasjon

## ⚠️ Er Firebase API-nøkkelen min trygg å dele offentlig?

**JA!** Firebase API-nøkler for web-apper er designet for å være offentlige. De må være inkludert i frontend-koden for at appen skal fungere.

## 🛡️ Hvordan er dataene mine beskyttet?

Sikkerheten i Firebase-appen din opprettholdes gjennom **3 lag**:

### 1. **API Key Restrictions** (Google Cloud Console)
- Begrenser hvilke domener som kan bruke API-nøkkelen
- Begrenser hvilke Firebase-tjenester nøkkelen kan aksessere

### 2. **Firebase Security Rules** (Firestore/Storage)
- Kontrollerer hvem som kan lese/skrive data
- Validerer data før den lagres
- Eksempel:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      // Kun brukeren selv kan lese/skrive sine egne data
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 3. **Firebase Authentication**
- Verifiserer brukeridentitet
- Kun innloggede brukere får tilgang

## 📋 Sjekkliste etter GitHub-varsel

- [ ] **Sett opp API Key Restrictions**
  1. Gå til [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials?project=smabruk-info-8abbe)
  2. Finn din API-nøkkel
  3. Legg til **HTTP referrers**:
     - `https://smabruk-info-8abbe.web.app/*`
     - `https://smabruk-info-8abbe.firebaseapp.com/*`
     - `http://localhost/*`
  4. Begrens til kun nødvendige APIs:
     - Cloud Firestore API
     - Firebase Authentication API
     - Identity Toolkit API

- [ ] **Verifiser Firebase Security Rules**
  1. Gå til [Firebase Console - Firestore Rules](https://console.firebase.google.com/project/smabruk-info-8abbe/firestore/rules)
  2. Sjekk at reglene beskytter brukerdata
  3. Test reglene i simulator

- [ ] **Sjekk billing & aktivitet**
  1. Gå til [Firebase Console - Usage](https://console.firebase.google.com/project/smabruk-info-8abbe/usage)
  2. Verifiser at aktiviteten er normal

## 🚫 Hva du IKKE skal dele offentlig

Selv om Firebase-nøkkelen er ok, er det noen ting du **aldri** skal committe til GitHub:

- ❌ `.env` filer med sensitive miljøvariabler
- ❌ Service Account keys (`serviceAccountKey.json`)
- ❌ Admin SDK credentials
- ❌ Database passord eller secrets
- ❌ Private API-nøkler fra tredjepartstjenester

## 📚 Mer informasjon

- [Firebase: Is it safe to expose Firebase apiKey?](https://firebase.google.com/docs/projects/api-keys)
- [Best practices for API keys](https://cloud.google.com/docs/authentication/api-keys)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

## 🔄 Hvis du vil regenerere nøkkelen (ikke nødvendig)

Hvis du likevel vil regenerere API-nøkkelen:

1. Gå til [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials?project=smabruk-info-8abbe)
2. Finn nøkkelen og klikk "Regenerate Key"
3. Oppdater `firebase-config.js` med den nye nøkkelen
4. Deploy appen på nytt

**Merk:** Dette vil bryte eksisterende installasjoner inntil de oppdateres!

---

**Viktig:** Denne advarselen fra Google er **automatisk** og sendes hver gang de finner en Firebase-nøkkel på GitHub. Det betyr IKKE at du har et sikkerhetsproblem - det er bare en påminnelse om å sjekke at du har satt opp restriksjoner korrekt. ✅
