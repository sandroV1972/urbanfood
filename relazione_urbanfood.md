# UrbanFood — Relazione del progetto

**Programmazione Web e Mobile — Anno Accademico 2025/2026**

Autore: A. Valenti

---

## 1 Introduzione

Questo documento contiene la relazione del progetto di Programmazione Web e Mobile. Il progetto, chiamato **UrbanFood**, è una piattaforma web per l'ordinazione di cibo online da ristoranti; al suo interno il ristorante demo principale usato per i test e per il branding delle pagine è **SurfShack**.

All'interno del documento saranno discussi:

- la struttura del sito (suddivisione nelle varie pagine e flusso di navigazione) e file di configurazione;
- la struttura scelta per il Database (come sono state gestite le collezioni MongoDB);
- i tipi di utente con le relative operazioni richieste in traccia, comprese le feature aggiuntive introdotte;
- le funzionalità avanzate (calcolo del costo di consegna tramite OpenStreetMap, mappe interattive, ricerca, recensioni, offerte, statistiche);
- le API REST esposte e documentate tramite Swagger;
- requirements e avvio del server.

Per effettuare le prove, il seed automatico crea cinque ristoranti demo con i rispettivi account ristoratore (le credenziali sono elencate nella sezione 8). Gli account cliente vanno invece registrati manualmente dalla pagina di registrazione.

**Stack tecnologico**: HTML5, CSS3, JavaScript, Bootstrap 5, Bootstrap Icons, Font Awesome, Node.js, Express 5, MongoDB Atlas, Mongoose, Swagger (swagger-jsdoc + swagger-ui-express), Leaflet, Nominatim (geocoding), OSRM (routing), bcrypt, jsonwebtoken, multer.

---

## 2 Struttura del sito

Il sito è stato realizzato per essere fluido e dinamico in base al tipo di utente scelto durante la creazione dell'account.

Quando si accede al sito si arriva sulla **HomePage** principale (`/`), che mostra le categorie di piatti, un piatto "del giorno" pescato casualmente dal catalogo e l'elenco dei ristoranti registrati. Dalla HomePage o dalla navbar è possibile aprire la modale di **login** oppure andare alla pagina di **registrazione** (`/register`).

L'**autenticazione** è gestita tramite **JSON Web Token** (JWT). Tutte le route API che modificano dati o accedono a informazioni private sono protette da un middleware (`middleware/auth.js`) che verifica il token, lo decodifica e popola `req.user`. Senza una sessione attiva queste rotte rispondono con `401`. Lato frontend, ogni pagina riservata effettua un controllo del ruolo all'apertura: se l'utente non è loggato, o se il ruolo non corrisponde a quello previsto per la pagina, viene reindirizzato alla home.

Successivamente, in base al **tipo di account** scelto in fase di registrazione, l'utente accede a una **navbar dinamica**. La navbar (`components/navbar.html`) è caricata via fetch da `auth.js` su ogni pagina e i suoi elementi vengono mostrati o nascosti in base all'attributo `data-role`:

- **Cliente**: Home, Ricerca, I miei ordini, Profilo
- **Ristoratore**: Dashboard, Ristorante, Ordini, Statistiche, Offerte, Profilo
- **Guest** (non loggato): solo Home

### Pagine del frontend

| Path | File | Ruolo | Descrizione |
|---|---|---|---|
| `/` | `index.html` | Tutti | Home con categorie, ristoranti, piatto del giorno |
| `/register` | `register.html` | Tutti | Registrazione cliente o ristoratore |
| `/restaurant-order/:id` | `restaurant-order.html` | Cliente | Ordinazione con menu, mappa, carrello, checkout |
| `/search` | `search.html` | Cliente | Ricerca ristoranti / piatti con tab |
| `/my-orders` | `my-orders.html` | Cliente | Storico ordini con tab "oggi"/"storico", recensioni |
| `/profile` | `profile.html` | Tutti | Gestione profilo con tab (dati, preferenze, carta, password, recensioni) |
| `/dashboard` | `dashboard.html` | Ristoratore | Dashboard con info ristorante e ordini recenti |
| `/restaurants` | `restaurants.html` | Ristoratore | Gestione ristorante e menu (CRUD piatti) |
| `/orders` | `orders.html` | Ristoratore | Ordini ricevuti con filtri (oggi, ieri, settimana, data, tutti) |
| `/stats` | `stats.html` | Ristoratore | KPI, top piatti, fatturato 7 giorni, ordini per stato |
| `/offers` | `offers.html` | Ristoratore | Creazione e gestione offerte a tempo |

### Componenti condivisi

- **`public/components/navbar.html`** — navbar e modale di login, caricata via fetch da `auth.js` e popolata in base al ruolo tramite attributi `data-role`.
- **`public/js/auth.js`** — gestisce il caricamento della navbar, la modale di login, la decodifica del JWT, la visibilità degli elementi per ruolo e il logout.
- **`public/css/style.css`** — tema grafico con palette teal/sand/navy/pink e classi utility (`cart-card`, `restaurant-card`, `qty-control`, `btn-add`, ecc.).

---

## 3 Architettura del progetto

```
progetto/
├── server.js                  # Entry point Express, route pagine, mount API
├── .env                       # MONGO_URI, JWT_SECRET, PORT
├── package.json
├── meals 1.json               # Catalogo iniziale piatti (seed)
│
├── config/
│   └── db.js                  # Connessione MongoDB Atlas
│
├── models/
│   ├── User.js                # Cliente o ristoratore (campo usrType)
│   ├── Restaurant.js          # owner -> User (unique)
│   ├── MenuItem.js            # restaurant -> Restaurant
│   ├── Meal.js                # catalogo comune (read-only per i ristoratori)
│   ├── Order.js               # user, restaurant, items, delivery, status
│   ├── Reviews.js             # user, restaurant, rating, comment (unique compound)
│   └── Offer.js               # restaurant, description, discount, periodo
│
├── routes/
│   ├── auth.js                # register, login, profile, password, delete
│   ├── restaurants.js         # CRUD + search + mine
│   ├── menuItems.js           # CRUD + from-catalog + search + cuisines
│   ├── meals.js               # GET list, GET random, GET cuisines
│   ├── orders.js              # CRUD ordini cliente/ristorante + status
│   ├── reviews.js             # CRUD recensioni
│   ├── offers.js              # CRUD offerte
│   ├── stats.js               # Aggregazioni statistiche ristorante
│   └── index.js               # Mount delle sotto-route
│
├── middleware/
│   ├── auth.js                # Verifica JWT, popola req.user
│   └── upload.js              # Multer per upload immagini
│
├── seed/
│   └── seed.js                # Meals + 5 ristoranti + ensureOwners
│
├── swagger/
│   └── swagger.js             # Specifica OpenAPI con schemi riusabili
│
├── public/                    # File statici
│   ├── index.html             # Home
│   ├── register.html          # Registrazione
│   ├── restaurants.html       # Gestione ristorante (ristoratore)
│   ├── restaurant-order.html  # Pagina ordinazione (cliente)
│   ├── dashboard.html         # Dashboard ristoratore
│   ├── orders.html            # Ordini ricevuti (ristoratore)
│   ├── my-orders.html         # Storico ordini cliente
│   ├── search.html            # Ricerca ristoranti/piatti (cliente)
│   ├── profile.html           # Profilo utente
│   ├── stats.html             # Statistiche (ristoratore)
│   ├── offers.html            # Offerte (ristoratore)
│   ├── components/navbar.html
│   ├── components/footer.html
│   ├── css/style.css
│   └── js/auth.js
│
└── uploads/                   # Immagini caricate dai ristoratori
```

### 3.1 File di configurazione `.env`

Le credenziali sensibili e i parametri specifici dell'ambiente non sono salvati nelcodice ma in un file `.env` (escluso dal versionamento tramite `.gitignore`). Il file viene caricato all'avvio del server tramite la libreria `dotenv`, che inietta le variabili in `process.env` prima dell'esecuzione di qualunque altro codice.

Le variabili utilizzate dal progetto sono tre:

| Variabile | Scopo |
|---|---|
| `MONGO_URI` | Stringa di connessione al cluster MongoDB Atlas (include credenziali) |
| `JWT_SECRET` | Chiave segreta usata da `jsonwebtoken` per firmare e verificare i token JWT |
| `PORT` | Porta su cui Express ascolta (default 3000, in sviluppo `4001`) |

Esempio di file `.env` (valori fittizi):

```
MONGO_URI=mongodb+srv://user:password@cluster0.xxxx.mongodb.net/urbanfood?retryWrites=true&w=majority
JWT_SECRET=stringa_lunga_e_casuale_per_la_firma_dei_token
PORT=4001
```

Il caricamento avviene alla prima riga di `server.js`:

```js
require('dotenv').config();
```

In questo modo qualunque file richiamato dopo (es. `config/db.js`, `routes/auth.js`) può accedere alle variabili tramite `process.env.MONGO_URI`, `process.env.JWT_SECRET`, ecc.

### 3.2 Database MongoDB Atlas

Il database è ospitato su **MongoDB Atlas** (servizio cloud gestito), cluster
gratuito tier `M0`. La scelta di un servizio remoto rispetto a un MongoDB locale ha tre vantaggi pratici:

- **Stesso dato accessibile da macchine diverse** (sviluppo progetto);
- **Nessun setup di mongod locale** richiesto per testare il progetto;
- **Backup automatici** gestiti da Atlas.

La connessione è realizzata nel file [config/db.js](config/db.js):

```js
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

module.exports = connectDB;
```

`mongoose.connect()` legge la stringa di connessione da `process.env.MONGO_URI` e stabilisce un pool di connessioni mantenuto per tutta la vita del processo. La chiamata è asincrona; se la connessione fallisce, il processo termina con codice 1 per evitare di lavorare su uno stato inconsistente.

**Sicurezza dell'accesso al cluster**

Il cluster Atlas richiede due livelli di autorizzazione:

1. **Database User**: username e password embedded nella `MONGO_URI`. È un account applicativo con permessi limitati al solo database `urbanfood`.
2. **Network Access**: Atlas mantiene una whitelist di IP autorizzati a connettersi.
   Per lo sviluppo è stato aggiunto l'IP della macchina di sviluppo (oppure
   `0.0.0.0/0` per accesso da qualunque IP, accettabile per questo progetto poiché l'autenticazione user/password resta comunque richiesta).

**Avvio del server**

Lo `server.js` chiama `connectDB()` non bloccante all'avvio:

```js
connectDB();
seed();
app.listen(port, ...);
```

Mongoose bufferizza le query effettuate prima del completamento della connessione, quindi i primi `Order.find(...)` o `User.create(...)` aspettano automaticamente che il pool sia pronto. Questo evita race condition tipiche con i database remoti.

---

## 4 Struttura del Database

Tutti i dati del progetto vengono mantenuti e gestiti su un Database non relazionale (**MongoDB Atlas**) tramite **Mongoose**. Al suo interno sono presenti delle collezioni che permettono il salvataggio dei dati secondo schemi specifici. Le collezioni sono legate fra loro mediante riferimenti `ObjectId`; in particolare gli `_id` più usati come chiave esterna sono quelli di **User**, **Restaurant**, **MenuItem** e **Order**. Questa scelta semplifica la suddivisione dei dati in collezioni multiple e rende più agevole il recupero dei dati a seguito di una richiesta dell'utente.

Di seguito vengono mostrati gli schemi di tutte le collezioni usate, con la descrizione dei campi.

### 4.1 Collezione `users` (clienti e ristoratori)

Una collezione unica per entrambi i ruoli, distinti dal campo `usrType`.

```json
{
  "_id": "ObjectId",
  "name": "Mario Rossi",
  "email": "mario@example.com",
  "password": "<bcrypt hash>",
  "usrType": "cliente",
  "phone": "+39 333 1234567",
  "address": {
    "street": "Via Roma 12",
    "city": "Lerici",
    "province": "SP",
    "zip": "19032",
    "country": "IT",
    "formatted": "Via Roma 12, 19032 Lerici (SP)",
    "location": { "lat": 44.0762, "lng": 9.9114 }
  },
  "credit_card": {
    "holder": "Mario Rossi",
    "number": "4111222233334444",
    "expiration": "12/27",
    "cvv": "123"
  },
  "preferenze": {
    "cucina": ["Italian", "Pizza"],
    "offerte": true
  }
}
```

- `email`: univoca per account (non possono esistere due account con la stessa email, nemmeno di tipo differente);
- `password`: hashata con bcrypt (10 round) prima del salvataggio;
- `usrType`: enum `['cliente', 'ristoratore']`;
- `address`, `credit_card`, `preferenze`: campi opzionali, popolati dalla pagina profilo;
- `preferenze.cucina`: array dei tipi di cucina preferiti; `preferenze.offerte`: flag per la visualizzazione delle offerte.

### 4.2 Collezione `restaurants`

```json
{
  "_id": "ObjectId",
  "owner": "ObjectId ref User",
  "name": "SurfShack Lerici",
  "address": "Via Marina 12, Lerici (SP)",
  "phone": "0187 123456",
  "piva": "12345678901",
  "description": "Surf food sul golfo dei poeti",
  "image": "/uploads/abc123.jpg",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

- `owner`: riferimento a un `User` di tipo `ristoratore`, **unico** (un solo ristorante per ristoratore);
- `image`: URL relativo all'immagine caricata tramite multer;
- i restanti campi sono autoesplicativi.

### 4.3 Collezione `meals` (catalogo comune)

Catalogo read-only popolato dal seed a partire da `meals 1.json`. Funge da "fonte" da cui i ristoratori possono attingere per popolare il proprio menu.

```json
{
  "_id": "ObjectId",
  "idMeal": "52893",
  "strMeal": "Apple & Blackberry Crumble",
  "strCategory": "Dessert",
  "strArea": "British",
  "strInstructions": "...",
  "strMealThumb": "https://www.themealdb.com/images/media/meals/...",
  "strTags": "Pudding",
  "ingredients": ["Plain Flour", "Caster Sugar", "..."],
  "measures": ["120g", "60g", "..."]
}
```

- `idMeal`: identificatore del piatto, usato come riferimento quando un piatto del catalogo viene copiato in un menu;
- `strMeal`: nome del piatto; `strCategory`: categoria; `strArea`: area geografica/cucina;
- `ingredients` e `measures`: array paralleli con ingredienti e relative dosi.

### 4.4 Collezione `menuitems` (menu di un ristorante)

Una copia "personalizzata" di un piatto, legata a uno specifico ristorante e con prezzo definito dal ristoratore.

```json
{
  "_id": "ObjectId",
  "restaurant": "ObjectId ref Restaurant",
  "idMeal": "52893",
  "strMeal": "Apple & Blackberry Crumble",
  "strCategory": "Dessert",
  "strArea": "British",
  "strInstructions": "...",
  "strMealThumb": "https://...",
  "strTags": "Pudding",
  "ingredients": ["Plain Flour", "..."],
  "measures": ["120g", "..."],
  "price": 8.5,
  "available": true,
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

- `restaurant`: riferimento al ristorante proprietario (indicizzato);
- `price`: prezzo definito dal ristoratore;
- `available`: flag per disabilitare temporaneamente un piatto senza cancellarlo.

### 4.5 Collezione `orders`

```json
{
  "_id": "ObjectId",
  "user": "ObjectId ref User (cliente)",
  "restaurant": "ObjectId ref Restaurant",
  "items": [
    { "menuItem": "ObjectId ref MenuItem", "quantity": 2, "price": 8.5 }
  ],
  "total": 25.00,
  "delivery_cost": 8.00,
  "people": 3,
  "status": "in_preparazione",
  "date": "2026-05-09T18:30:00Z",
  "delivery": {
    "dove": "domicilio",
    "indirizzo": "Via Aurelia 45, La Spezia"
  }
}
```

- `status`: enum `['ordinato', 'in_preparazione', 'in_consegna', 'consegnato']`;
- `delivery.dove`: enum `['ristorante', 'domicilio']`;
- `delivery.indirizzo`: presente solo se `dove === 'domicilio'`;
- `delivery_cost`: calcolato lato server tramite Nominatim + OSRM (0,50 €/km);
- `total`: somma del valore degli `items` più il `delivery_cost`;
- `people`: numero di persone (minimo 1; almeno 2 obbligatorie per la consegna a domicilio).

### 4.6 Collezione `reviews` (recensioni)

```json
{
  "_id": "ObjectId",
  "user": "ObjectId ref User (cliente)",
  "restaurant": "ObjectId ref Restaurant",
  "rating": 5,
  "comment": "Ottima esperienza, tornerò!",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

- `rating`: numero da 1 a 5;
- `comment`: opzionale (le sole stelle sono sufficienti);
- è presente un **compound unique index** su `(user, restaurant)`: una sola recensione per coppia cliente-ristorante. Per modificarla l'utente effettua `PUT /api/reviews/:id`;
- vincolo applicativo: per creare una recensione l'utente deve avere almeno un ordine in stato `consegnato` da quel ristorante.

### 4.7 Collezione `offers` (offerte)

```json
{
  "_id": "ObjectId",
  "restaurant": "ObjectId ref Restaurant",
  "description": "Sconto sui burger del weekend",
  "discount": 20,
  "category": "Beef",
  "start": "2026-05-01T00:00:00Z",
  "end": "2026-05-03T00:00:00Z",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

- `restaurant`: riferimento al ristorante che pubblica l'offerta;
- `discount`: percentuale di sconto (valore tra 0 e 100);
- `category`: categoria di piatti a cui si applica l'offerta;
- `start` / `end`: periodo di validità; un'offerta è considerata "attiva" se la data odierna è compresa nell'intervallo, "passata" se la data di fine è trascorsa.

---

## 5 Utenti e operazioni richieste

Il sito prevede la presenza di due tipi di utente: il **cliente** e il **ristoratore**. In fase di registrazione si sceglie la tipologia di account, in base alla quale verranno poi richieste informazioni diverse per il completamento del profilo. Entrambi i tipi di utente condividono la necessità, durante la prima registrazione, di inserire nome, email (univoca) e password. La password viene hashata con bcrypt prima di essere salvata nel Database.

Di seguito vengono analizzati nel dettaglio i due tipi di utente con le relative operazioni.

### 5.1 Clienti

Il primo tipo di utente che è possibile creare è quello del cliente. Si registra fornendo nome, email e password; dopo la registrazione può completare il profilo con telefono, indirizzo di residenza (usato per il calcolo del costo di consegna e come riferimento), preferenze e dati della carta di credito.

#### 5.1.1 Gestione del profilo

Dalla pagina `/profile`, organizzata in tab, il cliente può:

- **Profilo**: modificare nome, email, telefono e indirizzo (strada, città, CAP, paese);
- **Preferenze**: selezionare i tipi di cucina preferiti (selezione multipla) e attivare il flag per la visualizzazione delle offerte;
- **Carta**: inserire titolare, numero, scadenza e CVV (un solo metodo di pagamento per account);
- **Password**: cambiare la password inserendo prima quella attuale e poi due volte la nuova;
- **Le mie recensioni**: visualizzare l'elenco delle recensioni scritte, con possibilità di cancellarle;
- **Zona pericolo** (nel tab Profilo): cancellare completamente l'account e tutti i dati associati.

Le modifiche al profilo causano la rigenerazione del JWT, che viene aggiornato automaticamente in `localStorage`.

#### 5.1.2 Ricerca di ristoranti e piatti

La pagina `/search`, visibile solo ai clienti, offre due tab:

- **Ristoranti**: ricerca per nome, indirizzo o tipo di cucina. I criteri si combinano in AND, con match parziale case-insensitive. La ricerca per cucina passa attraverso i `menuitems` e ritorna i ristoranti che hanno almeno un piatto della cucina cercata.
- **Piatti**: ricerca per nome, categoria/cucina e fascia di prezzo (minimo/massimo). Vengono mostrati solo i piatti con `available: true`, con anteprima immagine, prezzo e link al ristorante.

#### 5.1.3 Ordinazione e gestione del carrello

Dalla pagina di un ristorante (`/restaurant-order/:id`) il cliente vede le informazioni del ristorante (nome, indirizzo, telefono, descrizione, immagine), una **mappa interattiva** (Leaflet con tile OpenStreetMap, geocoding tramite Nominatim) con marker, e il menu suddiviso con immagini, nome e prezzo. Il click su un piatto apre una modale di dettaglio con un selettore di quantità, dalla quale è possibile aggiungere il piatto al carrello.

Il **carrello** è realizzato come offcanvas Bootstrap ed è persistito in `localStorage`. Permette di modificare la quantità di ciascun piatto, rimuovere singoli item e visualizzare il totale corrente.

Il click su "Conferma ordine" apre la **modale di checkout**, che mostra il riepilogo dei piatti con il prezzo finale e richiede:

- il numero di persone (minimo 1);
- il tipo di servizio: ritiro al ristorante oppure consegna a domicilio;
- l'indirizzo di consegna (mostrato solo se si sceglie il domicilio).

È previsto il vincolo per cui la consegna a domicilio richiede almeno 2 persone (il radio è disabilitato e sincronizzato in tempo reale con il campo persone). Al momento dell'invio, il backend calcola il costo di consegna tramite Nominatim + OSRM e crea l'ordine, con redirect automatico alla pagina degli ordini.

#### 5.1.4 Storico degli ordini

La pagina `/my-orders` mostra gli ordini del cliente in due tab: **Oggi** (default all'apertura) e **Storico** (ordini precedenti). Per ogni ordine sono mostrati il nome del ristorante, la data e l'ora formattate, un badge di stato colorato (Ordinato, In preparazione, In consegna, Consegnato), il numero di persone, il tipo di consegna, l'elenco dei piatti con quantità e subtotale, l'eventuale costo di consegna e il totale.

Le azioni disponibili sono:

- **Conferma consegna** (solo se la consegna è a domicilio e lo stato non è già `consegnato`): il cliente conferma di aver ricevuto l'ordine e lo stato diventa `consegnato`. Solo il cliente proprietario dell'ordine può effettuare questa azione.
- **Lascia recensione** (solo se lo stato è `consegnato` e il cliente non ha già recensito quel ristorante): apre una modale con valutazione da 1 a 5 stelle e un campo per il commento.

### 5.2 Ristoratori

Il secondo tipo di utente è il ristoratore, che gestisce un singolo ristorante (vincolo `unique` sul campo `owner` del modello `Restaurant`). Si registra fornendo nome, email e password.

#### 5.2.1 Gestione del profilo e del ristorante

In alto a deste nella navbar vi è il nome del "ristoratore" e una icona che collega alla pagina `/profile` dove il ristoratore può modificare i propri dati personali (gli stessi tab del cliente, esclusi quelli relativi a preferenze e carta, che sono specifici del cliente).

Dalla pagina `/restaurants` può creare o modificare il proprio ristorante inserendo nome, indirizzo, telefono, partita IVA, descrizione e immagine. L'immagine viene caricata tramite multer nella cartella `uploads/`.

#### 5.2.2 Gestione del menu e dei piatti

Sempre dalla pagina `/restaurants` il ristoratore gestisce il menu. Per la scelta dei piatti può:

- **Attingere dal catalogo comune** `meals`, aggiungendo piatti al proprio menu tramite l'endpoint dedicato `POST /api/menu-items/from-catalog`;
- **Creare piatti personalizzati** da zero, inserendo nome, categoria, area, ingredienti, misure, immagine e prezzo;
- **Modificare o eliminare** un piatto del menu (prezzo, ingredienti, ecc.). Solo il proprietario del ristorante può intervenire sui propri piatti, grazie a un controllo di ownership lato server.

#### 5.2.3 Gestione degli ordini

Dalla pagina `/orders` il ristoratore vede gli ordini ricevuti, con filtri flessibili: **Oggi** (appena apre la pagina il date piccker è settato alla data odierna) o con pulsanti predefiniti **Ieri**, **Ultima settimana**, **Tutti gli ordini** e un **date picker** per un giorno specifico. L'endpoint `GET /api/orders/restaurant` accetta sia un parametro `date=YYYY-MM-DD` sia un intervallo `from=&to=`, con normalizzazione di inizio e fine giornata.

Per ogni ordine vengono mostrati il numero (ultime 6 cifre dell'`_id`), l'ora, il badge di stato, il numero di persone, il tipo di consegna, gli item con quantità, l'eventuale costo di consegna e il totale. L'azione **"Avanza"** fa progredire lo stato dell'ordine lungo il flusso `ordinato → in_preparazione → in_consegna`. Lo stato `consegnato` è raggiungibile **solo dal cliente** (vedi 5.1.4).

#### 5.2.4 Visione delle statistiche

Dalla pagina `/stats` il ristoratore vede una dashboard con:

- **KPI cards**: ordini totali, fatturato totale, valore medio dell'ordine, rating medio con numero di recensioni;
- **Top 5 piatti** più venduti, con barre proporzionali alla quantità;
- **Fatturato degli ultimi 7 giorni** come grafico a barre verticali;
- **Ordini per stato** come badge colorati con i relativi conteggi.

Tutte le statistiche sono calcolate lato server con **MongoDB aggregation pipeline** (`$match`, `$group`, `$unwind`, `$lookup`, `$sort`, `$dateToString`).

#### 5.2.5 Gestione delle offerte

Dalla pagina `/offers` il ristoratore può creare offerte a tempo, indicando descrizione, categoria di cucina, percentuale di sconto e periodo di validità (data di inizio e di fine). Le offerte vengono suddivise tra **attive** e **passate** in base alla data di fine, ed è possibile cancellarle. La validazione impedisce di creare offerte con data di fine precedente a quella di inizio. Per scelta di design non permettiamo di modificare le offerte e non abbiamo implementato tutto CRUD per offers.

#### 5.2.6 Visione delle recensioni

Le recensioni dei clienti sono visibili nella valutazione media del ristorante e nei KPI della pagina statistiche. Il ristoratore non può cancellare né modificare le recensioni: solo il cliente che le ha scritte può farlo.

---

## 6 API REST (documentate su `/api-docs`)

Tutte le API sono accessibili sotto il prefisso `/api/` e documentate con Swagger UI, montato su `/api-docs`. Lo schema di sicurezza è `bearerAuth` (JWT nell'header `Authorization: Bearer <token>`).

### Auth (`/api/auth`)
| Metodo | Endpoint | Auth |
|---|---|---|
| POST | `/register` | No |
| POST | `/login` | No |
| GET | `/profile` | Sì |
| PUT | `/profile` | Sì |
| PUT | `/password` | Sì |
| DELETE | `/delete` | Sì |

### Restaurants (`/api/restaurants`)
| Metodo | Endpoint | Auth |
|---|---|---|
| GET | `/` | No |
| GET | `/mine` | Sì |
| GET | `/search?name=&address=&cuisine=` | No |
| GET | `/order/:id` | No |
| GET | `/:id` | Sì (proprietario) |
| POST | `/` | Sì (multipart) |
| PUT | `/:id` | Sì (proprietario, multipart) |
| DELETE | `/:id` | Sì (proprietario) |

### MenuItems (`/api/menu-items`)
| Metodo | Endpoint | Auth |
|---|---|---|
| GET | `/` | Sì (ristoratore) |
| GET | `/search?name=&category=&minPrice=&maxPrice=` | Sì |
| GET | `/restaurant/:id` | No |
| GET | `/cuisines` | Sì |
| GET | `/:id` | Sì |
| POST | `/from-catalog` | Sì (ristoratore) |
| POST | `/` | Sì (multipart) |
| PUT | `/:id` | Sì (proprietario) |
| DELETE | `/:id` | Sì (proprietario) |

### Meals (`/api/meals`)
| Metodo | Endpoint | Auth |
|---|---|---|
| GET | `/` | No |
| GET | `/random` | No |
| GET | `/cuisines` | No |

### Orders (`/api/orders`)
| Metodo | Endpoint | Auth |
|---|---|---|
| GET | `/?period=today\|past` | Sì (cliente) |
| GET | `/restaurant?date=&from=&to=` | Sì (ristoratore) |
| GET | `/:id` | Sì (cliente o ristoratore proprietari) |
| POST | `/` | Sì (cliente) |
| PUT | `/:id/status` | Sì (ruoli specifici per stato) |
| DELETE | `/:id` | Sì (cliente o ristoratore, solo se stato `ordinato`) |

**Permessi di cambio stato**: `consegnato` solo dal **cliente** proprietario dell'ordine; gli stati intermedi (`in_preparazione`, `in_consegna`) solo dal **ristoratore** proprietario del ristorante.

### Reviews (`/api/reviews`)
| Metodo | Endpoint | Auth |
|---|---|---|
| GET | `/restaurant/:id` | No |
| GET | `/mine` | Sì |
| GET | `/:id` | No |
| POST | `/` | Sì (con verifica ordine consegnato) |
| PUT | `/:id` | Sì (autore) |
| DELETE | `/:id` | Sì (autore) |

### Offers (`/api/offers`)
| Metodo | Endpoint | Auth |
|---|---|---|
| GET | `/` | No |
| GET | `/mine` | Sì (ristoratore) |
| GET | `/restaurant/:id` | No |
| GET | `/:id` | No |
| POST | `/` | Sì (ristoratore) |
| DELETE | `/:id` | Sì (proprietario) |

### Stats (`/api/stats`)
| Metodo | Endpoint | Auth |
|---|---|---|
| GET | `/restaurant` | Sì (ristoratore) |

---

## 7 Funzionalità avanzate

### 7.1 Calcolo del costo di consegna
- Geocoding degli indirizzi tramite **Nominatim** (con header `User-Agent` conforme alla policy, usiamo `SurfShack-University-Project/1.0`):

```js
const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
    { headers: { 'User-Agent': 'SurfShack-University-Project/1.0' } }
);
const data = await response.json();
return { lat: data[0].lat, lon: data[0].lon };
```
- Costo pari a 0,50 €/km arrotondato ai centesimi;
- Routing stradale tramite **OSRM** (`router.project-osrm.org`) o istanza self‑hosted, la distanza non è calcolata in linea d'aria ma stradale; 
``` js
const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`,
    { headers: { 'User-Agent': 'SurfShack-University-Project/1.0' } }
);
const route = await response.json();
return {
    distanceKm: route.routes[0].distance / 1000,
    durationMin: route.routes[0].duration / 60
};
```

- Gestione degli errori con risposta `500` e dettaglio in caso di fallimento di Nominatim o OSRM, includendo messaggi specifici per rate limit, timeout e fallback operativo.

### 7.2 Mappa del ristorante
- **Leaflet** con tile raster OpenStreetMap (compatibile con tutti i browser, nessun WebGL, non installato di defaul in alcuni browser come LiberWolf);
- Marker con popup contenente il nome del ristorante
- Geocoding dell'indirizzo tramite Nominatim al caricamento della pagina.

### 7.3 Sicurezza
- JWT con `Authorization: Bearer` su tutte le route protette
- bcrypt per l'hashing delle password (10 round);
- controllo di ownership su tutte le mutazioni (PUT/DELETE di ristoranti, piatti, ordini, recensioni, offerte);
- controllo di ruolo lato frontend (redirect in caso di ruolo non corrispondente);
- controlli di ruolo specifici su `PUT /orders/:id/status` (il cliente può solo `consegnato`, il ristoratore solo gli stati intermedi);
- compound unique index su `reviews` per impedire recensioni multiple.

### 7.4 Documentazione Swagger
- Documentazione completa di tutti gli endpoint su `/api-docs`;
- schemi riusabili (`Restaurant`, `MenuItem`, `Meal`, `Order`, `OrderItem`, `User`, `Review`, `Offer`, `AuthResponse`, `Error`);
- `bearerAuth` dichiarato e applicato sulle route protette;
- esempi multipart per l'upload delle immagini.

### 7.5 Aggregazioni statistiche
Pipeline MongoDB per i KPI del ristorante: `$group` per fatturato e conteggio ordini; `$unwind` sugli items più `$group` per i top piatti; `$lookup` su `menuitems` per recuperare i nomi; `$dateToString` per il fatturato giornaliero; riempimento manuale dei giorni mancanti per avere 7 punti continui nel grafico.

---

## 8 Account di test (seed)

Il seed automatico (`seed/seed.js`) viene eseguito a ogni avvio del server e si compone di tre step idempotenti:

1. **`seedMeals`** — popola la collezione `meals` con il catalogo iniziale da `meals 1.json`; salta se la collezione contiene già documenti.
2. **`seedRestaurants`** — crea 5 ristoranti demo con il rispettivo ristoratore e alcuni menu item presi dal catalogo, abbinati per cucina/area; salta l'entry se l'utente proprietario esiste già (controllo per email).
3. **`ensureOwners`** — garantisce uno stato di proprietà consistente: il ristorante "Wave Shack" è sempre assegnato a `matteo@valenti.email` (creato se mancante); gli altri eventualmente ancora di sua proprietà vengono riassegnati a utenti con email derivata dal nome (slug-based); i ristoranti già con un proprio owner vengono lasciati intatti.

### Account ristoratore creati dal seed

| Email | Ristorante | Password |
|---|---|---|
| `mario@surfshack.it` | SurfShack Lerici | `password123` |
| `luigi@pizzeriaroma.it` | Pizzeria Roma | `password123` |
| `yuki@tokyosushi.it` | Tokyo Sushi Bar | `password123` |
| `raj@currypalace.it` | Curry Palace | `password123` |
| `dimitri@taverna.it` | Greek Taverna | `password123` |

> Nota: la password effettiva dipende dalla versione del seed con cui gli account sono stati creati. Gli account generati con la versione corrente usano `password123`.

### Cliente di test

Il seed **non** crea utenti di tipo `cliente`: occorre registrarne uno nuovo dalla pagina `/register` con qualsiasi email.

### Idempotenza

Tutto il seed è idempotente: rilanciando il server più volte i piatti del catalogo e i ristoranti demo non vengono duplicati. Per rigenerare lo stato da zero è sufficiente droppare le collezioni `users`, `restaurants` e `menuitems` da MongoDB Atlas e riavviare il server.

---

## 9 Avvio del progetto

### 9.1 Prerequisiti

- **Node.js ≥ 18.x** e **npm** (incluso con Node)
- Un cluster **MongoDB Atlas** già configurato (vedi sezione 3.2 per creazione cluster, Database User e Network Access)

### 9.2 Configurazione `.env`

Creare un file `.env` nella root del progetto con tre variabili:

```env
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/urbanfood?retryWrites=true&w=majority
JWT_SECRET=stringa_segreta_per_la_firma_dei_jwt
PORT=4001
```

Sostituire `USER`/`PASSWORD` con le credenziali del Database User creato su Atlas.
Il file `.env` è escluso dal versionamento (`.gitignore`).

### 9.3 Installazione e avvio

```bash
# Installazione delle dipendenze
npm install

# Avvio (preferibile)
./start.sh
```

Lo script `start.sh` libera automaticamente la porta `4001` da eventuali processi node appesi e avvia il server tramite `nodemon`, che ricarica il processo a ogni modifica dei file. In alternativa si può usare il classico `npm start`.

Al primo avvio il server si connette ad Atlas ed esegue il seed automatico
(catalogo piatti + ristoranti demo + `ensureOwners` — vedi sezione 8). 

Una volta avviato:

- **Sito**: [http://localhost:4001/](http://localhost:4001/)
- **Swagger UI**: [http://localhost:4001/api-docs](http://localhost:4001/api-docs)
