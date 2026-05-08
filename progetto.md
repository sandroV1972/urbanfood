# SurfShack — Piano e Stato del Progetto

## Panoramica
Applicazione web fast-food per ordinazione online da ristoranti.
**Stack**: HTML5, CSS3, JavaScript, Bootstrap 5, Node.js, Express, MongoDB (Atlas), Mongoose, Swagger, Leaflet, Nominatim/OSRM.

---

## Account di test (seed)

Il seed automatico crea **5 ristoratori** con i propri ristoranti, foto e menù di esempio.
Tutti hanno la stessa password.

**Password (per tutti)**: `test1234`

| Email | Nome | Ristorante | Cucine |
|---|---|---|---|
| `mario@surfshack.it` | Mario Surf | SurfShack Lerici | Beef, Chicken |
| `luigi@pizzeriaroma.it` | Luigi Romano | Pizzeria Roma | Pasta, Italian |
| `yuki@tokyosushi.it` | Yuki Tanaka | Tokyo Sushi Bar | Seafood, Japanese |
| `raj@currypalace.it` | Raj Kumar | Curry Palace | Indian, Chicken |
| `dimitri@taverna.it` | Dimitri Papadopoulos | Greek Taverna | Lamb, Greek |

Per loggarsi come **cliente**, registrarsene uno nuovo da `/register` (qualsiasi email).

Il seed è **idempotente** (skippa se i dati esistono già). Per rigenerarlo, droppare le collections `users`, `restaurants`, `menuitems` da MongoDB Atlas e riavviare il server.

---

## Stato implementazione (riepilogo)

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
| Mappa ristorante (Leaflet) | ✅ Completo |
| Statistiche ristorante | ⏳ Non iniziato |
| Ricerca piatti per ingredienti/allergie | ⏳ Non iniziato |
| Relazione PDF + screenshot | ⏳ Non iniziato |

---

## Architettura

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
│   └── Order.js               # cliente, ristorante, items, delivery, status
│
├── routes/
│   ├── auth.js                # register, login, profile, password, delete
│   ├── restaurants.js         # CRUD + search + mine
│   ├── menuItems.js           # CRUD + from-catalog
│   ├── meals.js               # GET list, GET random
│   └── orders.js              # CRUD ordini cliente/ristorante + status
│
├── middleware/
│   ├── auth.js                # Verifica JWT, popola req.user
│   └── upload.js              # Multer per upload immagini
│
├── seed/
│   └── seed.js                # Meals + 5 ristoranti + menu
│
├── swagger/
│   └── swagger.js             # OpenAPI spec con schemas riusabili
│
├── uploads/                   # Immagini caricate da ristoratori
│
└── public/                    # File statici
    ├── index.html             # Home
    ├── register.html          # Registrazione cliente/ristoratore
    ├── restaurants.html       # Gestione ristorante (ristoratore)
    ├── restaurant-order.html  # Pagina ordinazione (cliente)
    ├── dashboard.html         # Dashboard ristoratore
    ├── orders.html            # Ordini ricevuti (ristoratore) con filtro data
    ├── my-orders.html         # Storico ordini cliente + conferma consegna
    ├── search.html            # Ricerca ristoranti (cliente)
    ├── profile.html           # Profilo utente
    ├── components/
    │   └── navbar.html        # Navbar caricata via fetch in auth.js
    ├── css/
    │   └── style.css          # Tema "surf"
    └── js/
        └── auth.js            # Init pagina, gestione token, navbar, login modal
```

---

## Modelli dati (implementati)

### User
- `name`, `email` (unique), `password` (bcrypt hash), `usrType` ('cliente' | 'ristoratore')
- `phone`, `address` (street/city/province/zip/country/formatted/location)
- `credit_card` (holder/number/expiration/cvv)
- `preferenze` (cucina[], offerte)

### Restaurant
- `owner` (ref User, unique), `name`, `address`, `phone`, `piva`, `description`, `image`

### MenuItem
- `restaurant` (ref Restaurant)
- Campi catalogo: `idMeal`, `strMeal`, `strCategory`, `strArea`, `strInstructions`, `strMealThumb`, `strTags`, `ingredients[]`, `measures[]`
- `price`, `available`

### Meal (catalogo)
- Stessi campi di MenuItem ma senza ristorante né prezzo. Read-only, popolato dal seed da `meals 1.json`.

### Order
- `user` (ref User), `restaurant` (ref Restaurant)
- `items[]` (menuItem, quantity, price)
- `total`, `delivery_cost`, `people`, `date`, `status` (`ordinato` | `in_preparazione` | `in_consegna` | `consegnato`)
- `delivery` ({ dove: `ristorante`|`domicilio`, indirizzo? })

---

## API REST (implementata e documentata su `/api-docs`)

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
| GET | `/` | Sì (cliente) | ✅ |
| GET | `/restaurant?date=` | Sì (ristoratore) | ✅ |
| GET | `/:id` | Sì (cliente o ristoratore proprietari) | ✅ |
| POST | `/` | Sì (cliente) | ✅ |
| PUT | `/:id/status` | Sì (ruoli specifici per status) | ✅ |
| DELETE | `/:id` | Sì (cliente o ristoratore, solo se status='ordinato') | ✅ |

**Permessi di cambio status**:
- `consegnato` → solo il **cliente** proprietario dell'ordine
- Stati intermedi (`in_preparazione`, `in_consegna`) → solo il **ristoratore** proprietario del ristorante

---

## Funzionalità frontend

### Home (`index.html`)
- ✅ Navbar dinamica in base al ruolo
- ✅ Sezione categorie piatti
- ✅ Sezione "Esplora i ristoranti" (popolata da API)
- ✅ Sezione "Benvenuto" con piatto random dal catalogo
- ✅ Modal login

### Registrazione (`register.html`)
- ✅ Form: nome, email, password, tipo utente
- ✅ Submit a `POST /api/auth/register`
- ✅ Auto-login dopo registrazione

### Pagina ordinazione (`restaurant-order.html`)
- ✅ Info ristorante + mappa interattiva (Leaflet con tile OpenStreetMap)
- ✅ Menu del ristorante con immagini
- ✅ Modale dettaglio piatto con quantità
- ✅ Carrello in offcanvas (Bootstrap)
- ✅ localStorage per persistenza carrello
- ✅ Quantity control con +/-
- ✅ Bottone trash per rimuovere item
- ✅ Modale conferma ordine con form (persone, dove, indirizzo se domicilio)
- ✅ Constraint: domicilio richiede ≥ 2 persone (radio disabilitato)
- ✅ Calcolo costo consegna server-side (Nominatim + OSRM, 50 cent/km)
- ✅ Redirect a `/my-orders` dopo conferma

### Dashboard ristoratore (`dashboard.html`)
- ✅ Sezione "Il tuo ristorante" con creazione/modifica
- ✅ Upload immagine ristorante
- ⏳ Sezione ordini recenti (da rifinire — link a `/orders`)
- ⏳ Statistiche

### Ordini ricevuti (`orders.html`)
- ✅ Solo per ristoratori (auth check + redirect)
- ✅ Filtro per giorno (date picker, default oggi)
- ✅ Lista ordini con badge status colorato
- ✅ Bottone "Avanza" per cambio status
- ✅ Riepilogo per ordine: data, persone, tipo consegna, items, totale

### Storico cliente (`my-orders.html`)
- ✅ Solo per clienti (auth check + redirect)
- ✅ Lista ordini con badge status, data, ristorante
- ✅ Riepilogo items e totale
- ✅ Bottone "Conferma consegna" quando status = `in_consegna`
- ✅ Empty state con link alla home

### Ricerca (`search.html`)
- ✅ Solo per clienti (link in navbar)
- ✅ Form: nome, indirizzo, tipo cucina
- ✅ Ricerca server-side combinata (filtri AND, regex case-insensitive)
- ✅ Per cucina: query in due step su MenuItems → restaurant ids
- ✅ Card risultati con link a `/restaurant-order/:id`

### Profilo (`profile.html`)
- ✅ Visualizzazione e modifica dati utente
- ✅ Cambio password
- ✅ Cancellazione account

---

## Funzionalità avanzate

### Calcolo distanza consegna ✅
- Geocoding indirizzi via **Nominatim** (con `User-Agent` corretto)
- Routing stradale via **OSRM** (`router.project-osrm.org`)
- Costo: 0,50€/km arrotondato ai centesimi
- Gestione errori: 500 con dettaglio se Nominatim/OSRM falliscono

### Mappa ristorante ✅
- **Leaflet** con tile raster OpenStreetMap (no WebGL)
- Marker con popup nome ristorante
- Geocoding indirizzo via Nominatim

### Sicurezza
- ✅ JWT con `Authorization: Bearer` su tutte le route protette
- ✅ Bcrypt per hash password (10 rounds)
- ✅ Check ownership su tutte le mutazioni (PUT/DELETE per ristoranti, menu items, ordini)
- ✅ Check ruolo su pagine frontend (redirect se ruolo sbagliato)
- ✅ Check ruolo specifici su `PUT /orders/:id/status` (cliente solo `consegnato`, ristoratore solo intermedi)

### Swagger ✅
- Documentazione completa di tutti gli endpoint su `/api-docs`
- Schemi riusabili (`Restaurant`, `MenuItem`, `Order`, `User`, `OrderItem`, `AuthResponse`, `Error`)
- BearerAuth dichiarato e applicato sulle route protette
- Esempi multipart per upload immagini

---

## Da fare per la consegna

### Implementazione
- [ ] Statistiche ristoratore (ordini totali, piatti più venduti, incasso)
- [ ] Ricerca piatti per ingredienti / allergie (filtro escludente)
- [ ] Eventuale sezione "ordini in coda" con tempo di attesa stimato

### Documentazione
- [ ] Relazione PDF (struttura, scelte implementative, schema DB, API)
- [ ] Screenshot dimostrativi delle funzionalità principali
- [ ] README con istruzioni di setup

### Consegna
- [ ] Push su GitHub
- [ ] Upload su `upload.di.unimi.it`
- [ ] Deadline: ultimo appello Settembre 2026

---

## Operazioni richieste (riepilogo)

### Base
- ✅ Setup HTML/CSS/Bootstrap
- ✅ Registrazione e login (cliente + ristoratore)
- ✅ Visualizzazione piatti, ristoranti, acquisti
- ✅ Ricerca ristoranti per luogo, nome (e cucina come bonus)
- ⏳ Ricerca piatti per tipologia, nome, prezzo
- ✅ Login e ordine di uno o più piatti
- ✅ Gestione consegne (flusso stati ordine)
- ⏳ Statistiche per ristorante
- ✅ Visualizzazione acquisti presenti e passati

### Aggiuntive (consigliate per studente singolo)
- ⏳ Ricerca ristorante per piatto (parzialmente coperto da ricerca per cucina)
- ⏳ Ricerca piatti per ingredienti
- ⏳ Ricerca piatti per allergie
- ✅ Consegna a domicilio con calcolo distanza OpenStreetMap

---

## Avvio progetto

```bash
npm install
# Configurare .env con MONGO_URI e JWT_SECRET
npm start
```

Il server parte su `http://localhost:3000` (o la porta in `.env`).
Swagger UI: `http://localhost:3000/api-docs`.
