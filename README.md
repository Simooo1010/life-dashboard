# Life OS Dashboard

Dashboard personale privata — interfaccia visiva unificata per il Life OS (Second Brain, Calendario, Meteo contestuale Modica, Sintesi AI Groq).

---

## 1. Configurazione Password & Variabili

Nel file `.env.local` (e nelle Environment Variables di Vercel):

### `DASHBOARD_MASTER_PASSWORD`
- **Cos'è**: La password scelta da te per accedere alla dashboard dalla schermata `/login`.
- **Formato**: Qualsiasi testo tu voglia ricordare facilmente.

### `SESSION_PASSWORD`
- **Cos'è**: La chiave di cifratura usata internamente da `iron-session` per sigillare il cookie di sessione (AES-256).
- **Formato**: Una stringa casuale di **almeno 32 caratteri**.
- **Come generarla istantaneamente**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

---

## 2. Google Calendar (iCal)

La dashboard legge il calendario in modo leggero e sicuro tramite l'**Indirizzo segreto in formato iCal**:

1. Apri [calendar.google.com](https://calendar.google.com).
2. Nella barra laterale sinistra, passa il mouse sul tuo calendario principale, clicca sui tre puntini `⋮` > **Impostazioni e condivisione**.
3. Nella sezione **Integra calendario**, copia l'**Indirizzo segreto in formato iCal** (`https://.../basic.ics`).
4. Incollalo nella variabile `GOOGLE_CALENDAR_ICAL_URL`.

---

## 3. Guida al Deployment su Vercel

La dashboard opera come interfaccia privata su un URL HTTPS sicuro (es. `https://life-dashboard.vercel.app`), accessibile da PC, iPhone o tablet.

### Passo 1: Crea un nuovo progetto su Supabase per Life Dashboard

1. Vai su [supabase.com/dashboard](https://supabase.com/dashboard) e crea un **nuovo progetto** dedicato (es. `life-dashboard`).
2. Apri la sezione **SQL Editor**, incolla ed esegui lo script contenuto in `supabase-init.sql`.
3. Vai in **Project Settings** > **API** e copia **Project URL** e **anon public key**.

### Passo 2: Environment Variables su Vercel

Nel pannello **Environment Variables** del progetto su Vercel, aggiungi le variabili:

| Nome Variabile | Esempio / Note |
|---|---|
| `DASHBOARD_MASTER_PASSWORD` | Password personale per il login |
| `SESSION_PASSWORD` | Stringa random di 32+ caratteri per sessioni |
| `PERSISTENCE_MODE` | `supabase` |
| `DASHBOARD_SUPABASE_URL` | `https://<tuo-progetto>.supabase.co` |
| `DASHBOARD_SUPABASE_ANON_KEY` | Chiave anon del progetto Supabase |
| `NOTION_TOKEN` | Token Notion integrazione Second Brain |
| `GROQ_API_KEY` | API Key Groq per la sintesi AI |
| `GOOGLE_CALENDAR_ICAL_URL` | Indirizzo segreto `.ics` di Google Calendar |
| `WEATHER_LOCATION_NAME` | `Modica` |
| `WEATHER_LAT` | `36.8588` |
| `WEATHER_LON` | `14.7608` |
| `WEATHER_TIMEZONE` | `Europe/Rome` |
| `WEATHER_PROVIDER` | `ilmeteo` |
