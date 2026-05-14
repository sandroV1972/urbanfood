# SurfShack — Relazione del progetto

## 1 Introduzione

Questo documento descrive il progetto **SurfShack**, applicazione web fast-food per
ordinazione online da ristoranti. Al suo interno saranno discussi:

- la struttura del sito (suddivisione in pagine e flusso di navigazione)
- la struttura del Database (collezioni MongoDB con i loro schemi)
- i tipi di utente con le relative operazioni
- le funzionalità avanzate implementate (calcolo costo consegna via OpenStreetMap,
  ricerca, mappe interattive, recensioni, statistiche)
- le API REST esposte e documentate via Swagger
- lo stato di implementazione e cosa rimane da fare

**Stack tecnologico**: HTML5, CSS3, JavaScript, Bootstrap 5, Bootstrap Icons,
Node.js, Express, MongoDB Atlas, Mongoose, Swagger (swagger-jsdoc + swagger-ui-express),
Leaflet, Nominatim (geocoding), OSRM (routing), bcrypt, jsonwebtoken, multer.

---

## 2 Struttura del sito

Il sito è stato realizzato per essere fluido e dinamico in base al tipo di utente
scelto durante la creazione dell'account.

Quando si accede al sito si arriva sulla **HomePage** (`/`) che mostra le categorie di
piatti, un piatto "del giorno" pescato casualmente dal catalogo e l'elenco dei
ristoranti registrati. Dalla HomePage o dalla **navbar** è possibile aprire la modale
di **login** o andare alla pagina di **registrazione** (`/register`).

L'**autenticazione** è gestita con **JSON Web Token** (JWT). Tutte le route API che
modificano dati o accedono a informazioni private sono protette da un middleware
(`middleware/auth.js`) che valida il token e popola `req.user`. Sul frontend, ogni
pagina riservata fa un check del ruolo all'apertura: se l'utente non è loggato o il
ruolo non corrisponde, viene reindirizzato alla home.

Successivamente, in base al **tipo di account**, l'utente accede a una **navbar
dinamica** generata via `data-role` su `navbar.html` e gestita da `auth.js`:

- **Cliente**: Home, Ricerca, I miei ordini, Profilo
- **Ristoratore**: Dashboard, Ristorante, Ordini, Statistiche, Profilo

### Pagine del frontend

| Path | File | Ruolo | Descrizione |
|---|---|---|---|
| `/` | `index.html` | Tutti | Home con categorie, ristoranti, piatto del giorno |
| `/register` | `register.html` | Tutti | Registrazione cliente o ristoratore |
| `/restaurant-order/:id` | `restaurant-order.html` | Cliente | Pagina ordinazione con menu, mappa, carrello, modale conferma |
| `/search` | `search.html` | Cliente | Ricerca ristoranti / piatti con tab |
| `/my-orders` | `my-orders.html` | Cliente | Storico ordini con tab "oggi"/"storico", recensioni |
| `/profile` | `profile.html` | Tutti | Gestione profilo con tab (dati, preferenze, carta, password, recensioni) |
| `/dashboard` | `dashboard.html` | Ristoratore | Dashboard con info ristorante e ordini recenti |
| `/restaurants` | `restaurants.html` | Ristoratore | Gestione ristorante e menu (CRUD piatti) |
| `/orders` | `orders.html` | Ristoratore | Ordini ricevuti con filtri (oggi, ieri, settimana, range, tutti) |
| `/stats` | `stats.html` | Ristoratore | KPI cards, top piatti, fatturato 7gg, ordini per stato |

### Componenti condivisi

- **`public/components/navbar.html`** — navbar e modale login, caricata via fetch da
  `auth.js` su ogni pagina e popolata in base al ruolo via attributi `data-role`.
- **`public/js/auth.js`** — gestisce: caricamento navbar, login modal, decode del JWT,
  visibilità degli elementi per ruolo, logout.
- **`public/css/style.css`** — tema "surf" con palette teal/sand/navy/pink e classi
  utility (`cart-card`, `restaurant-card`, `qty-control`, `btn-add`, ecc.).

---

## 3 Architettura

```
progetto/
├── server.js                  # Entry point Express, route pagine
├── .env                       # MONGO_URI, JWT_SECRET
├── package.json
├── meals 1.json               # Catalogo iniziale piatti
│
├── config/
│   └── db.js                  # Connessione MongoDB Atlas
│
├── models/
│   ├── User.js                # Cliente o ristoratore
│   ├── Restaurant.js          # owner -> User
│   ├── MenuItem.js            # restaurant -> Restaurant
│   ├── Meal.js                # catalogo comune (read-only per ristoratori)
│   ├── Order.js               # cliente, ristorante, items, delivery, status
│   └── Reviews.js             # user, restaurant, rating, comment (unique compound)
│
├── routes/
│   ├── auth.js                # register, login, profile, password, delete
│   ├── restaurants.js         # CRUD + search + mine
│   ├── menuItems.js           # CRUD + from-catalog + search
│   ├── meals.js               # GET list, GET random
│   ├── orders.js              # CRUD ordini cliente/ristorante + status
│   ├── reviews.js             # CRUD recensioni
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
│   └── swagger.js             # OpenAPI spec con schemas riusabili
│
├── uploads/                   # Immagini caricate da ristoratori
│
└── public/                    # File statici
    ├── index.html             # Home
    ├── register.html          # Registrazione
    ├── restaurants.html       # Gestione ristorante (ristoratore)
    ├── restaurant-order.html  # Pagina ordinazione (cliente)
    ├── dashboard.html         # Dashboard ristoratore
    ├── orders.html            # Ordini ricevuti (ristoratore)
    ├── my-orders.html         # Storico ordini cliente
    ├── search.html            # Ricerca ristoranti/piatti (cliente)
    ├── profile.html           # Profilo utente
    ├── stats.html             # Statistiche (ristoratore)
    ├── components/navbar.html
    ├── css/style.css
    └── js/auth.js
```

---

## 4 Struttura del Database

Tutti i dati del progetto vengono mantenuti su un Database non relazionale
(**MongoDB Atlas**) attraverso **Mongoose**. Le collezioni sono legate fra loro
tramite riferimenti `ObjectId`. In particolare gli `_id` più usati come riferimento
sono quelli di **User**, **Restaurant**, **MenuItem** e **Order**.

Di seguito vengono mostrati gli schemi di tutte le collezioni usate, con descrizione
dei campi.

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

- `email`: unica per account
- `password`: hashata con bcrypt (10 round)
- `usrType`: enum `['cliente', 'ristoratore']`
- `address`, `credit_card`, `preferenze`: opzionali, popolati via la pagina profilo

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

- `owner`: riferimento a User di tipo `ristoratore`, **unico** (un solo ristorante per
  ristoratore)
- `image`: URL relativo all'immagine caricata via multer
- I restanti campi sono autoesplicativi

### 4.3 Collezione `meals` (catalogo comune)

Catalogo read-only popolato dal seed da `meals 1.json`. Usato come "fonte" da cui i
ristoratori possono attingere per popolare il proprio menu.

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

### 4.4 Collezione `menuitems` (menu di un ristorante)

Una copia "personalizzata" di un piatto, legata a uno specifico ristorante e con
prezzo definito dal ristoratore.

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

- `restaurant`: riferimento al ristorante proprietario
- `price`: prezzo definito dal ristoratore
- `available`: flag per disabilitare temporaneamente un piatto

### 4.5 Collezione `orders`

```json
{
  "_id": "ObjectId",
  "user": "ObjectId ref User (cliente)",
  "restaurant": "ObjectId ref Restaurant",
  "items": [
    {
      "menuItem": "ObjectId ref MenuItem",
      "quantity": 2,
      "price": 8.5
    }
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

- `status`: enum `['ordinato', 'in_preparazione', 'in_consegna', 'consegnato']`
- `delivery.dove`: enum `['ristorante', 'domicilio']`
- `delivery.indirizzo`: presente solo se `dove === 'domicilio'`
- `delivery_cost`: calcolato server-side via Nominatim + OSRM (50 cent/km)
- `total`: somma degli items + `delivery_cost`
- `people`: numero persone (min 1; ≥ 2 obbligatorio per `domicilio`)

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

- `rating`: numero 1-5
- `comment`: opzionale (le sole stelle bastano)
- **Compound unique index** su `(user, restaurant)`: una sola recensione per coppia
  cliente-ristorante. Per modificarla l'utente fa `PUT /api/reviews/:id`.
- Vincolo applicativo: per creare una recensione l'utente deve avere almeno un Order
  con `status === 'consegnato'` da quel ristorante.

---

## 5 Utenti e operazioni

Il sito prevede la presenza di due tipi di utente: il **cliente** e il
**ristoratore**. In fase di registrazione si sceglie la tipologia di account; entrambi
condividono i campi base (nome, email, password) e poi ognuno ha le proprie
funzionalità specifiche.

L'email è **univoca** per account (non possono esserci account con la stessa email,
nemmeno di tipo differente). La password viene hashata con bcrypt prima di essere
salvata.

### 5.1 Cliente

Il cliente è l'utente che effettua ordini. Si registra fornendo nome, email e
password. Dopo la registrazione può completare il profilo con telefono, indirizzo,
preferenze e dati della carta di credito.

#### 5.1.1 Gestione del profilo

Dalla pagina `/profile` il cliente può, organizzato in tab:

- **Profilo**: modifica di nome, email, telefono e indirizzo (street, city, zip, country)
- **Preferenze**: tipi di cucina preferiti (multi-select) e flag offerte
- **Carta**: titolare, numero, scadenza, CVV (un solo metodo di pagamento per account)
- **Password**: cambio password con verifica della password corrente
- **Le mie recensioni**: lista delle recensioni scritte con possibilità di cancellarle
- **Zona pericolo** (nel tab Profilo): cancellazione completa dell'account

Le modifiche al profilo causano la rigenerazione del JWT, che viene aggiornato in
localStorage automaticamente.

#### 5.1.2 Ricerca ristoranti e piatti

La pagina `/search` (visibile solo ai clienti) offre due tab:

- **Ristoranti**: ricerca per nome, indirizzo o tipo di cucina. Combinazione AND con
  match parziale case-insensitive. La ricerca per cucina passa per i menuitems e
  ritorna i ristoranti che hanno almeno un piatto della cucina cercata.
- **Piatti**: ricerca per nome, categoria/cucina e range di prezzo. Mostra solo
  piatti `available: true`, con preview immagine, prezzo e link al ristorante.

#### 5.1.3 Ordinazione e carrello

Dalla pagina di un ristorante (`/restaurant-order/:id`) il cliente vede:

- Info ristorante (nome, indirizzo, telefono, descrizione, immagine)
- **Mappa interattiva** (Leaflet con tile OpenStreetMap) con marker
- Menu con immagini, nome, prezzo
- Click su un piatto → modale dettaglio con quantity selector (+/-)
- "Aggiungi al carrello" → aggiunge l'item al carrello (persistito in `localStorage`)

Il **carrello** è in offcanvas Bootstrap, accessibile dal pulsante in alto. Permette:
- Modifica quantità con +/-
- Rimozione singolo item (cestino)
- Visualizzazione totale corrente

Click su "Conferma ordine" apre la **modale di checkout** con:
- Riepilogo dei piatti
- Numero persone (min 1)
- Tipo di servizio: Ritiro al ristorante / Consegna a domicilio (radio)
- Indirizzo (mostrato solo se domicilio)
- Vincolo: domicilio richiede ≥ 2 persone (radio disabilitato altrimenti, sincronizzato
  in tempo reale col campo persone)

Sul submit, il backend calcola il costo consegna con Nominatim + OSRM (50 cent/km) e
crea l'ordine. Redirect automatico a `/my-orders`.

#### 5.1.4 Storico ordini

La pagina `/my-orders` mostra gli ordini del cliente in due tab:

- **Oggi**: ordini effettuati oggi (default all'apertura)
- **Storico**: ordini precedenti

Per ogni ordine: nome ristorante, data formattata locale, badge di stato colorato
(Ordinato / In preparazione / In consegna / Consegnato), persone, tipo consegna,
lista piatti con quantità e subtotale, costo consegna se domicilio, totale.

Azioni disponibili:
- **Conferma consegna** (solo se `delivery.dove === 'domicilio'` e status non
  `consegnato`): cliente conferma di aver ricevuto l'ordine, status diventa
  `consegnato`. Solo il cliente proprietario può effettuare questa azione.
- **Lascia recensione** (solo se status === `consegnato` e cliente non ha già
  recensito quel ristorante): apre modale con stelle 1-5 e textarea commento.

### 5.2 Ristoratore

Il ristoratore gestisce un singolo ristorante (vincolo `unique` sul campo `owner`
del modello Restaurant). Si registra fornendo nome, email e password.

#### 5.2.1 Gestione del profilo e del ristorante

Dalla pagina `/profile` può modificare i dati personali (stessi tab del cliente,
escluse le preferenze e la carta che sono cliente-specifiche).

Dalla `/restaurants` può creare/modificare il proprio ristorante: nome, indirizzo,
telefono, P.IVA, descrizione, immagine. L'immagine viene caricata via multer in
`uploads/`.

#### 5.2.2 Gestione del menu

Sempre dalla `/restaurants` può gestire il menu. Per i piatti:

- **Da catalogo**: il ristoratore può aggiungere piatti dal catalogo comune `meals`
  al proprio menu, scegliendo il prezzo. Endpoint dedicato `POST /api/menu-items/from-catalog`.
- **Personalizzati**: può creare un piatto custom da zero (nome, categoria, area,
  ingredienti, misure, immagine, prezzo).
- **Modifica/elimina**: per ogni piatto del menu può modificare prezzo, ingredienti,
  ecc., o cancellarlo. Solo il proprietario del ristorante può modificare i suoi
  piatti (check di ownership server-side).

#### 5.2.3 Gestione degli ordini

Dalla pagina `/orders` il ristoratore vede gli ordini ricevuti, con filtri
flessibili:

- **Oggi** (default), **Ieri**, **Ultima settimana** (preset rapidi)
- **Tutti gli ordini** (nessun filtro data)
- **Date picker**: giorno specifico

L'endpoint server `GET /api/orders/restaurant` accetta sia `?date=YYYY-MM-DD` che
`?from=&to=` come range, con normalizzazione delle ore (start/end of day).

Per ogni ordine: numero (ultime 6 cifre dell'`_id`), ora, badge stato, persone,
tipo consegna, items con quantità, totale, eventuale costo consegna.

**Azione "Avanza"**: cambia lo status al successivo nel flow:
- `ordinato` → `in_preparazione` → `in_consegna`
- Lo stato `consegnato` è raggiungibile **solo dal cliente** (vedi 5.1.4)

#### 5.2.4 Statistiche

Dalla pagina `/stats` il ristoratore vede un dashboard con:

- **KPI cards**: ordini totali, fatturato totale, ordine medio, rating medio (con
  numero recensioni)
- **Top 5 piatti** più venduti, con barre proporzionali alla quantità
- **Fatturato ultimi 7 giorni** come grafico a barre verticali
- **Ordini per stato** come badge colorati con conteggi

Tutte le statistiche sono calcolate server-side con **MongoDB aggregation pipelines**
(`$match`, `$group`, `$unwind`, `$lookup`, `$sort`).

#### 5.2.5 Visione delle recensioni

Le recensioni dei clienti sono visibili sulla pagina pubblica del ristorante e nel
KPI rating (`stats.html`). Il ristoratore non può cancellare o modificare le
recensioni — solo il cliente proprietario può farlo.

---

## 6 API REST (documentate su `/api-docs`)

Tutte le API sono accessibili sotto il prefisso `/api/` e documentate con Swagger UI
montato su `/api-docs`. La security scheme è `bearerAuth` (JWT in header
`Authorization: Bearer <token>`).

### Auth (`/api/auth`)
| Metodo | Endpoint | Auth | Stato |
|---|---|---|---|
| POST | `/register` | No | ✅ |
| POST | `/login` | No | ✅ |
| GET | `/profile` | Sì | ✅ |
| PUT | `/profile` | Sì | ✅ |
| PUT | `/password` | Sì | ✅ |
| DELETE | `/delete` | Sì | ✅ |

### Restaurants (`/api/restaurants`)
| Metodo | Endpoint | Auth | Stato |
|---|---|---|---|
| GET | `/` | No | ✅ |
| GET | `/mine` | Sì | ✅ |
| GET | `/search?name=&address=&cuisine=` | No | ✅ |
| GET | `/order/:id` | No | ✅ |
| GET | `/:id` | Sì (proprietario) | ✅ |
| POST | `/` | Sì (multipart) | ✅ |
| PUT | `/:id` | Sì (proprietario, multipart) | ✅ |
| DELETE | `/:id` | Sì (proprietario) | ✅ |

### MenuItems (`/api/menu-items`)
| Metodo | Endpoint | Auth | Stato |
|---|---|---|---|
| GET | `/` | Sì (ristoratore) | ✅ |
| GET | `/restaurant/:id` | No | ✅ |
| GET | `/search?name=&category=&minPrice=&maxPrice=` | Sì | ✅ |
| GET | `/:id` | Sì | ✅ |
| POST | `/from-catalog` | Sì (ristoratore) | ✅ |
| POST | `/` | Sì (multipart) | ✅ |
| PUT | `/:id` | Sì (proprietario) | ✅ |
| DELETE | `/:id` | Sì (proprietario) | ✅ |

### Meals (`/api/meals`)
| Metodo | Endpoint | Auth | Stato |
|---|---|---|---|
| GET | `/` | No | ✅ |
| GET | `/random` | No | ✅ |

### Orders (`/api/orders`)
| Metodo | Endpoint | Auth | Stato |
|---|---|---|---|
| GET | `/?period=today\|past` | Sì (cliente) | ✅ |
| GET | `/restaurant?date=&from=&to=` | Sì (ristoratore) | ✅ |
| GET | `/:id` | Sì (cliente o ristoratore proprietari) | ✅ |
| POST | `/` | Sì (cliente) | ✅ |
| PUT | `/:id/status` | Sì (ruoli specifici per status) | ✅ |
| DELETE | `/:id` | Sì (cliente o ristoratore, solo se status='ordinato') | ✅ |

**Permessi di cambio status**:
- `consegnato` → solo il **cliente** proprietario dell'ordine
- Stati intermedi (`in_preparazione`, `in_consegna`) → solo il **ristoratore**
  proprietario del ristorante

### Reviews (`/api/reviews`)
| Metodo | Endpoint | Auth | Stato |
|---|---|---|---|
| GET | `/restaurant/:id` | No | ✅ |
| GET | `/mine` | Sì | ✅ |
| GET | `/:id` | No | ✅ |
| POST | `/` | Sì (con check ordine consegnato) | ✅ |
| PUT | `/:id` | Sì (autore) | ✅ |
| DELETE | `/:id` | Sì (autore) | ✅ |

### Stats (`/api/stats`)
| Metodo | Endpoint | Auth | Stato |
|---|---|---|---|
| GET | `/restaurant` | Sì (ristoratore) | ✅ |

---

## 7 Funzionalità avanzate

### 7.1 Calcolo distanza consegna ✅
- Geocoding indirizzi via **Nominatim** (con `User-Agent` corretto come da policy)
- Routing stradale via **OSRM** (`router.project-osrm.org`)
- Costo: 0,50€/km arrotondato ai centesimi
- Gestione errori: 500 con dettaglio se Nominatim/OSRM falliscono

### 7.2 Mappa ristorante ✅
- **Leaflet** con tile raster OpenStreetMap (no WebGL, compatibile con tutti i browser)
- Marker con popup contenente il nome del ristorante
- Geocoding indirizzo via Nominatim al caricamento della pagina

### 7.3 Sicurezza
- ✅ JWT con `Authorization: Bearer` su tutte le route protette
- ✅ Bcrypt per hash password (10 round)
- ✅ Check ownership su tutte le mutazioni (PUT/DELETE per ristoranti, menu items, ordini, review)
- ✅ Check ruolo su pagine frontend (redirect se ruolo sbagliato)
- ✅ Check ruolo specifici su `PUT /orders/:id/status` (cliente solo `consegnato`,
  ristoratore solo intermedi)
- ✅ Compound unique index su Reviews per evitare recensioni multiple

### 7.4 Swagger ✅
- Documentazione completa di tutti gli endpoint su `/api-docs`
- Schemi riusabili (`Restaurant`, `MenuItem`, `Order`, `OrderItem`, `User`, `Review`,
  `AuthResponse`, `Error`)
- BearerAuth dichiarato e applicato sulle route protette
- Esempi multipart per upload immagini

### 7.5 Aggregazioni statistiche ✅
- Pipeline MongoDB per KPI ristoratore:
  - `$group` per fatturato e conteggio ordini
  - `$unwind` su items + `$group` per top piatti
  - `$lookup` su menuitems per recuperare i nomi
  - `$dateToString` per fatturato giornaliero
  - Riempimento manuale dei giorni mancanti (per avere 7 punti continui nel grafico)

---

## 8 Account di test (seed)

Il seed automatico (in [seed/seed.js](seed/seed.js)) viene eseguito a ogni avvio del
server e si compone di **tre step idempotenti**:

1. **`seedMeals`** — popola la collection `meals` con il catalogo iniziale (~13.000
   piatti da `meals 1.json`). Skippa se la collection contiene già documenti.
2. **`seedRestaurants`** — crea **5 ristoranti demo** con il rispettivo ristoratore
   (uno per ognuno) e ~5 menu items presi dal catalogo `Meals` matchati per
   cucina/area. Salta l'entry se l'utente proprietario esiste già (controllo per email).
3. **`ensureOwners`** — garantisce uno stato consistente di proprietà:
   - **Wave Shack** è sempre di `matteo@valenti.email` (l'utente viene creato se mancante)
   - Tutti gli altri ristoranti attualmente di matteo vengono **riassegnati** a un
     nuovo utente con email derivata dal nome ristorante
     (slug-based, es. `pizzeriaroma@surfshack.it`)
   - I ristoranti già con un proprio owner unico vengono lasciati intatti

**Password attuale (per gli utenti creati o aggiornati con la versione corrente del
seed)**: `password123`

### Account consigliati per il login (creati/garantiti da `ensureOwners`)

| Email | Ristorante | Note |
|---|---|---|
| `matteo@valenti.email` | Wave Shack | Creato automaticamente se mancante |
| `surfshacklerici@surfshack.it` | SurfShack Lerici | Slug-based |
| `pizzeriaroma@surfshack.it` | Pizzeria Roma | Slug-based |
| `tokyosushibar@surfshack.it` | Tokyo Sushi Bar | Slug-based |
| `currypalace@surfshack.it` | Curry Palace | Slug-based |
| `greektaverna@surfshack.it` | Greek Taverna | Slug-based |

Lo `slug` è il nome del ristorante minuscolo senza spazi/punteggiatura.

> **Quando vengono creati gli account slug-based?** `ensureOwners` li crea solo per i
> ristoranti che a runtime sono ancora di proprietà di `matteo@valenti.email`.

### Account legacy creati da `seedRestaurants` (versioni precedenti del seed)

Se il seed è stato eseguito prima dell'unificazione della password, questi account
esistono in DB con la **password originaria** (`test1234`).

| Email | Nome | Ristorante | Cucine | Password (legacy) |
|---|---|---|---|---|
| `mario@surfshack.it` | Mario Surf | SurfShack Lerici | Beef, Chicken | `test1234` |
| `luigi@pizzeriaroma.it` | Luigi Romano | Pizzeria Roma | Pasta, Italian | `test1234` |
| `yuki@tokyosushi.it` | Yuki Tanaka | Tokyo Sushi Bar | Seafood, Japanese | `test1234` |
| `raj@currypalace.it` | Raj Kumar | Curry Palace | Indian, Chicken | `test1234` |
| `dimitri@taverna.it` | Dimitri Papadopoulos | Greek Taverna | Lamb, Greek | `test1234` |

**Per migrare a `password123`**:
1. Login con `test1234`, poi `/profile` → tab Password → cambia a `password123`
2. Drop dell'utente da MongoDB Atlas + riavvio server: `seedRestaurants` lo ricrea con la nuova password

### Cliente di test

Il seed **non** crea utenti `cliente` — registrane uno nuovo da `/register` con
qualsiasi email.

### Idempotenza e re-run

Tutto il seed è **idempotente**. Rilanciando il server più volte:
- I piatti del catalogo non vengono duplicati
- I ristoranti demo non vengono duplicati
- `ensureOwners` non riassegna nulla se gli owner sono già corretti

Per rigenerare lo stato da zero, droppare le collections `users`, `restaurants`,
`menuitems` da MongoDB Atlas e riavviare il server.

---

## 9 Stato implementazione (riepilogo)

| Area | Stato |
|---|---|
| Backend Express + MongoDB | ✅ Completo |
| Modelli Mongoose | ✅ Completo |
| Auth JWT + ruoli | ✅ Completo |
| API REST (CRUD) | ✅ Completo |
| Swagger documentation | ✅ Completo |
| Seed automatico | ✅ Completo |
| Frontend pagine principali | ✅ Completo |
| Carrello con localStorage | ✅ Completo |
| Calcolo distanza consegna (OpenStreetMap) | ✅ Completo |
| Ricerca ristoranti | ✅ Completo |
| Ricerca piatti | ✅ Completo |
| Mappa ristorante (Leaflet) | ✅ Completo |
| Recensioni | ✅ Completo |
| Statistiche ristorante | ✅ Completo |
| Ricerca piatti per ingredienti/allergie | ⏳ Non iniziato |
| Relazione PDF + screenshot | ⏳ Non iniziato |

---

## 10 Da fare per la consegna

### Implementazione (opzionale)
- [ ] Ricerca piatti per ingredienti / allergie (filtro escludente)
- [ ] Tempo di attesa stimato in coda

### Documentazione
- [ ] Relazione PDF (struttura, scelte implementative, schema DB, API)
- [ ] Screenshot dimostrativi delle funzionalità principali
- [ ] README con istruzioni di setup

### Consegna
- [ ] Push su GitHub
- [ ] Upload su `upload.di.unimi.it`
- [ ] Deadline: ultimo appello Settembre 2026

---

## 11 Operazioni richieste (riepilogo da PDF)

### Base
- ✅ Setup HTML/CSS/Bootstrap
- ✅ Registrazione e login (cliente + ristoratore)
- ✅ Visualizzazione piatti, ristoranti, acquisti
- ✅ Ricerca ristoranti per luogo, nome (e cucina come bonus)
- ✅ Ricerca piatti per tipologia, nome, prezzo
- ✅ Login e ordine di uno o più piatti
- ✅ Gestione consegne (flusso stati ordine)
- ✅ Statistiche per ristorante
- ✅ Visualizzazione acquisti presenti e passati

### Aggiuntive (consigliate per studente singolo)
- ✅ Ricerca ristorante per piatto (parzialmente coperto da ricerca per cucina)
- ⏳ Ricerca piatti per ingredienti
- ⏳ Ricerca piatti per allergie
- ✅ Consegna a domicilio con calcolo distanza OpenStreetMap
- ✅ Recensioni con valutazione 1-5 stelle e commento

---

## 12 Avvio progetto

```bash
npm install
# Configurare .env con MONGO_URI e JWT_SECRET
npm start
```

Il server parte su `http://localhost:3000` (o la porta in `.env`).
- Sito: `http://localhost:3000/`
- Swagger UI: `http://localhost:3000/api-docs`
