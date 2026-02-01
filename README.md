# 🏡 Småbruk Kunnskapsbase

En Progressive Web App (PWA) for å samle og organisere all viktig informasjon om ditt småbruk. Perfekt for å bevare kunnskap om drift, vedlikehold og rutiner fra generasjon til generasjon.

## ✨ Funksjoner

- **📱 Fungerer på iPhone og iPad** - Installer som en app på hjemskjermen
- **📶 Fungerer offline** - All data lagres lokalt på enheten
- **🔍 Søkbar** - Finn raskt informasjonen du trenger
- **📁 Kategorisert** - Ryddig organisering av innhold
- **🖼️ Bilder** - Legg til bilder for visuell dokumentasjon
- **🏷️ Stikkord** - Tag artikler for enklere søk
- **💾 Backup** - Eksporter og importer data for sikkerhetskopi

## 📲 Installasjon på iPhone/iPad

### Metode 1: Lokal server (anbefalt for testing)

1. Åpne Terminal på Mac eller PowerShell på Windows
2. Naviger til mappen med filene
3. Start en enkel server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # eller Node.js
   npx serve
   ```
4. Finn din IP-adresse (f.eks. 192.168.1.100)
5. På iPhone/iPad: Åpne Safari og gå til `http://192.168.1.100:8000`
6. Trykk på "Del"-ikonet (firkant med pil opp)
7. Velg "Legg til på Hjem-skjerm"
8. Gi appen et navn og trykk "Legg til"

### Metode 2: Publisering på nett (permanent løsning)

For permanent tilgang kan appen publiseres gratis på:
- **GitHub Pages** - Gratis hosting
- **Netlify** - Gratis med drag-and-drop
- **Vercel** - Gratis for personlige prosjekter

## 🚀 Kom i gang

### Kategorier
Appen kommer med forhåndsdefinerte kategorier:
- 💧 Vann & Pumper
- ⚡ Strøm & Elektrisitet
- 🔥 Varme & Fyring
- 🔧 Verktøy & Utstyr
- 🐄 Dyr & Husdyrhold
- 🌱 Hage & Dyrking
- 🏠 Bygninger & Vedlikehold
- 📅 Sesongoppgaver
- 🆘 Sikkerhet & Nødinfo
- 📝 Annet

Du kan legge til egne kategorier via menyen.

### Legge til informasjon
1. Trykk på **+** knappen
2. Fyll inn tittel (f.eks. "Hvordan starte vannpumpen")
3. Velg kategori
4. Skriv en detaljert beskrivelse
5. Legg til bilder om ønskelig
6. Legg til stikkord for enklere søk
7. Trykk "Lagre"

### Søke
- Bruk søkefeltet øverst for å finne informasjon
- Søket leter i titler, beskrivelser og stikkord

### Backup
- **Eksporter**: Meny → Eksporter data → Lagre JSON-filen
- **Importer**: Meny → Importer data → Velg JSON-fil

## 💡 Tips for god dokumentasjon

1. **Vær detaljert** - Skriv som om personen aldri har gjort dette før
2. **Bruk bilder** - Ett bilde sier mer enn tusen ord
3. **Steg for steg** - Numerer trinnene
4. **Verktøyliste** - List opp nødvendig utstyr
5. **Advarsler** - Merk farlige eller kritiske steg
6. **Sesong** - Angi når oppgaven skal gjøres

## 🔧 Teknisk informasjon

- **Lagring**: IndexedDB (lokal database i nettleseren)
- **Offline**: Service Worker cacher alle filer
- **Bilder**: Lagres som Base64 i databasen
- **Kompatibilitet**: Alle moderne nettlesere, optimalisert for iOS Safari

## 📝 Eksempel på artikkel

**Tittel**: Starte vannpumpen om våren

**Kategori**: 💧 Vann & Pumper

**Beskrivelse**:
```
VERKTØY TRENGS:
- Skiftenøkkel 19mm
- Flatskrutrekker
- Lommelykt

FREMGANGSMÅTE:

1. Sjekk at hovedstrømbryteren er AV
2. Åpne luken til pumpehuset (nøkkel henger på spiker i boden)
3. Sjekk at det ikke er synlige skader på pumpen
4. Åpne utluftingsventilen (rød knapp på toppen)
5. Skru på hovedstrømbryteren
6. Vent til pumpen har stabilt trykk (ca. 2-3 bar)
7. Lukk utluftingsventilen
8. Sjekk alle kraner innendørs for luftlommer

⚠️ VIKTIG: Ikke start pumpen hvis det er is på bakken rundt - sjekk at all frost er borte!

Ved problemer, ring rørlagger Ola: 123 45 678
```

**Stikkord**: pumpe, vann, vår, oppstart, vedlikehold

---

Laget med ❤️ for å bevare småbrukskunnskap
