# UrbanFood - Piano di Progetto

## Panoramica
Applicazione web FastFood per ordinazione online da ristoranti di una catena.
Stack: HTML5, CSS3, JavaScript, Bootstrap 5, Node.js, Express, MongoDB, Swagger.

---

## FASE 0 - Infrastruttura

### 0.1 Setup progetto npm
- [x] `npm init` nella directory del progetto
- [x] Installare Express: `npm install express`

### 0.2 MongoDB Atlas
- [ ] Registrarsi su mongodb.com/cloud/atlas
- [ ] Creare cluster gratuito (M0 Free)
- [ ] Creare utente database (username + password)
- [ ] Network Access: aggiungere `0.0.0.0/0`
- [ ] Copiare la connection string

### 0.3 Dipendenze backend
- [ ] `npm install mongoose dotenv cors bcrypt jsonwebtoken swagger-ui-express swagger-jsdoc`
- [ ] `npm install -D nodemon`

### 0.4 File di configurazione
- [ ] `.env` con variabili: `PORT`, `MONGO_URI`, `JWT_SECRET`
- [ ] `.gitignore` aggiornato con `.env` e `node_modules/`
- [ ] `package.json` scripts: `"start": "node server.js"`, `"dev": "nodemon server.js"`

### 0.5 Struttura directory
```
progetto/
├── server.js                  # Entry point Express
├── .env                       # Variabili ambiente
├── package.json
├── meals 1.json               # Dati iniziali piatti
│
├── config/
│   └── db.js                  # Connessione MongoDB
│
├── models/
│   ├── User.js                # Schema utente
│   ├── Restaurant.js          # Schema ristorante
│   ├── Meal.js                # Schema piatto
│   └── Order.js               # Schema ordine
│
├── routes/
│   ├── auth.js                # Registrazione, login, profilo
│   ├── restaurants.js         # CRUD ristoranti
│   ├── meals.js               # CRUD piatti
│   ├── orders.js              # CRUD ordini
│   └── stats.js               # Statistiche
│
├── middleware/
│   └── auth.js                # Verifica JWT token
│
├── seed/
│   └── seed.js                # Caricamento JSON in MongoDB
│
├── public/                    # File statici serviti da Express
│   ├── index.html
│   ├── register.html
│   ├── login.html
│   ├── restaurants.html
│   ├── restaurant-detail.html
│   ├── cart.html
│   ├── orders.html
│   ├── profile.html
│   ├── dashboard.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── api.js             # Funzioni fetch per chiamate API
│       ├── auth.js            # Gestione login/logout/token
│       ├── cart.js            # Logica carrello
│       └── app.js             # Logica generale
│
└── swagger/
    └── swagger.json           # Documentazione API
```

### 0.6 server.js
- [ ] Creare app Express
- [ ] Connessione MongoDB tramite `config/db.js`
- [ ] Middleware: `cors()`, `express.json()`, `express.static('public')`
- [ ] Montare le route: `/api/auth`, `/api/restaurants`, `/api/meals`, `/api/orders`, `/api/stats`
- [ ] Montare Swagger su `/api-docs`
- [ ] Avvio seed automatico se DB vuoto
- [ ] Listen sulla porta da `.env`

---

## FASE 1 - Modelli dati (Mongoose)

### 1.1 User (`models/User.js`)
```
Campi:
- nome: String, required
- cognome: String, required
- email: String, required, unique
- password: String, required (hash con bcrypt)
- tipo: String, enum ['ristoratore', 'cliente'], required
- telefono: String
- indirizzo: String
- preferenze: [String]              # es. ['pizza', 'burger'] per offerte personalizzate
- metodoPagamento: {
    tipo: String,                    # 'carta_credito' o 'prepagata'
    numero: String,
    scadenza: String,
    titolare: String
  }
- createdAt: Date
```

### 1.2 Restaurant (`models/Restaurant.js`)
```
Campi:
- nome: String, required
- proprietario: ObjectId, ref 'User', required
- indirizzo: String, required
- telefono: String, required
- partitaIva: String, required
- descrizione: String
- immagine: String
- coordinate: {
    lat: Number,
    lng: Number
  }
- createdAt: Date
```

### 1.3 Meal (`models/Meal.js`)
```
Campi:
- idMeal: String
- strMeal: String, required
- strCategory: String
- strArea: String
- strInstructions: String
- strMealThumb: String              # URL immagine
- strTags: String
- strYoutube: String
- ingredients: [String]
- measures: [String]
- prezzo: Number                    # Aggiunto dal ristoratore
- ristorante: ObjectId, ref 'Restaurant'  # null = piatto dal JSON comune
- personalizzato: Boolean, default false  # true = piatto creato dal ristoratore
- disponibile: Boolean, default true
- createdAt: Date
```

### 1.4 Order (`models/Order.js`)
```
Campi:
- cliente: ObjectId, ref 'User', required
- ristorante: ObjectId, ref 'Restaurant', required
- piatti: [{
    meal: ObjectId, ref 'Meal',
    quantita: Number,
    prezzo: Number
  }]
- stato: String, enum ['ordinato', 'in_preparazione', 'in_consegna', 'consegnato'], default 'ordinato'
- tipoRitiro: String, enum ['ristorante', 'domicilio'], required
- indirizzoconsegna: String         # Solo se domicilio
- costoConsegna: Number, default 0  # Calcolato con OpenStreetMap
- totale: Number, required
- tempoAttesaStimato: Number        # Minuti
- createdAt: Date
- updatedAt: Date
```

---

## FASE 2 - Seed iniziale

### 2.1 Script seed (`seed/seed.js`)
- [ ] Leggere `meals 1.json` con `fs.readFileSync`
- [ ] Parsare il JSON
- [ ] Inserire tutti i piatti nella collection `meals` con `Meal.insertMany()`
- [ ] I piatti del JSON sono la "lista comune" da cui i ristoratori scelgono

### 2.2 Seed automatico al primo avvio
- [ ] In `server.js`: dopo connessione DB, contare i documenti in `meals`
- [ ] Se count === 0, eseguire il seed
- [ ] Log: "Database seeded con X piatti"

---

## FASE 3 - API REST

### 3.1 Auth (`routes/auth.js`)
| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Registrazione (nome, cognome, email, password, tipo) | No |
| POST | `/api/auth/login` | Login, restituisce JWT token | No |
| GET | `/api/auth/profile` | Dati profilo utente corrente | Si |
| PUT | `/api/auth/profile` | Modifica profilo (dati, preferenze, pagamento) | Si |
| DELETE | `/api/auth/profile` | Cancella account | Si |

### 3.2 Restaurants (`routes/restaurants.js`)
| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| GET | `/api/restaurants` | Lista tutti i ristoranti | No |
| GET | `/api/restaurants/:id` | Dettaglio ristorante + menu | No |
| GET | `/api/restaurants/search?luogo=&nome=` | Ricerca per luogo/nome | No |
| GET | `/api/restaurants/search/by-meal?piatto=` | Ricerca ristorante per piatto | No |
| POST | `/api/restaurants` | Crea ristorante | Si (ristoratore) |
| PUT | `/api/restaurants/:id` | Modifica ristorante | Si (proprietario) |
| DELETE | `/api/restaurants/:id` | Elimina ristorante | Si (proprietario) |

### 3.3 Meals (`routes/meals.js`)
| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| GET | `/api/meals` | Lista tutti i piatti (catalogo comune) | No |
| GET | `/api/meals/:id` | Dettaglio piatto | No |
| GET | `/api/meals/search?nome=&tipologia=&prezzo=` | Ricerca per nome/tipologia/prezzo | No |
| GET | `/api/meals/search/by-ingredient?ingrediente=` | Ricerca per ingrediente | No |
| GET | `/api/meals/search/by-allergy?allergia=` | Ricerca per allergia (esclude ingredienti) | No |
| GET | `/api/meals/restaurant/:restaurantId` | Piatti di un ristorante | No |
| POST | `/api/meals` | Ristoratore aggiunge piatto al suo menu (da catalogo o personalizzato) | Si (ristoratore) |
| PUT | `/api/meals/:id` | Modifica piatto (prezzo, disponibilità) | Si (ristoratore) |
| DELETE | `/api/meals/:id` | Rimuovi piatto dal menu | Si (ristoratore) |

### 3.4 Orders (`routes/orders.js`)
| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| POST | `/api/orders` | Crea ordine (piatti, tipo ritiro, indirizzo) | Si (cliente) |
| GET | `/api/orders` | Ordini del cliente corrente (presenti e passati) | Si (cliente) |
| GET | `/api/orders/restaurant/:id` | Ordini per un ristorante (coda) | Si (ristoratore) |
| PUT | `/api/orders/:id/status` | Cambia stato ordine | Si (ristoratore) |
| PUT | `/api/orders/:id/delivered` | Cliente conferma ricezione → consegnato | Si (cliente) |

### 3.5 Stats (`routes/stats.js`)
| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| GET | `/api/stats/restaurant/:id` | Statistiche ristorante (ordini totali, piatti più venduti, incasso) | Si (ristoratore) |

---

## FASE 4 - Swagger

- [ ] Configurare `swagger-jsdoc` con info progetto
- [ ] Aggiungere annotazioni `@swagger` a ogni route
- [ ] Montare `swagger-ui-express` su `/api-docs`
- [ ] Documentare: parametri, body, risposte, autenticazione

---

## FASE 5 - Pagine Frontend

### 5.1 index.html (Homepage) - GIA' ESISTENTE
- [x] Navbar con logo, link, bottone Accedi
- [x] Sezione categorie piatti
- [x] Sezione piatti in evidenza
- [x] Footer
- [x] Modal login
- [ ] Collegare i piatti alle API: `fetch('/api/meals')` per popolare le card
- [ ] Collegare la barra di ricerca alle API di ricerca
- [ ] Collegare il form login a `POST /api/auth/login`
- [ ] Mostrare offerte personalizzate in base alle preferenze utente

### 5.2 register.html (Registrazione)
- [ ] Form con: nome, cognome, email, password, conferma password
- [ ] Selezione tipo utente: Ristoratore / Cliente (radio button)
- [ ] Se cliente: selezione preferenze (checkbox categorie piatti)
- [ ] Se cliente: dati metodo pagamento
- [ ] Validazione campi (HTML5 + JS)
- [ ] Submit → `POST /api/auth/register`
- [ ] Redirect a login dopo registrazione

### 5.3 restaurants.html (Lista Ristoranti)
- [ ] Barra di ricerca con filtri: nome, luogo, piatto
- [ ] Griglia card ristoranti (immagine, nome, indirizzo, valutazione)
- [ ] Click su card → restaurant-detail.html?id=xxx
- [ ] Dati da `GET /api/restaurants` e `/api/restaurants/search`

### 5.4 restaurant-detail.html (Dettaglio Ristorante)
- [ ] Header con info ristorante (nome, indirizzo, telefono)
- [ ] Menu del ristorante: lista piatti con immagine, nome, prezzo, ingredienti
- [ ] Filtri piatti: per categoria, per ingrediente, per allergia
- [ ] Bottone "Aggiungi al carrello" per ogni piatto
- [ ] Badge con numero piatti nel carrello
- [ ] Dati da `GET /api/restaurants/:id` e `GET /api/meals/restaurant/:id`

### 5.5 cart.html (Carrello)
- [ ] Lista piatti nel carrello (immagine, nome, quantità, prezzo, subtotale)
- [ ] Bottoni +/- per modificare quantità
- [ ] Bottone rimuovi piatto
- [ ] Riepilogo: subtotale, costo consegna, totale
- [ ] Scelta tipo ritiro:
  - Ritiro al ristorante: mostra tempo di attesa stimato
  - Consegna a domicilio: campo indirizzo, calcolo distanza con OpenStreetMap, costo consegna
- [ ] Riepilogo metodo di pagamento (da profilo)
- [ ] Bottone "Conferma Ordine" → `POST /api/orders`
- [ ] Carrello salvato in localStorage

### 5.6 orders.html (Ordini)
**Vista Cliente:**
- [ ] Tab "Ordini attivi": ordini con stato != consegnato
- [ ] Tab "Storico ordini": ordini passati (consegnati)
- [ ] Per ogni ordine: ristorante, piatti, stato, data, totale
- [ ] Barra di stato visuale (ordinato → in preparazione → in consegna → consegnato)
- [ ] Bottone "Confermo ricezione" quando stato = in_consegna → `PUT /api/orders/:id/delivered`

**Vista Ristoratore:**
- [ ] Coda ordini attivi per il proprio ristorante
- [ ] Per ogni ordine: cliente, piatti, stato
- [ ] Bottoni per avanzare stato: "In Preparazione" → "Pronto"
- [ ] Se ritiro al ristorante: "Pronto" → "Consegnato"
- [ ] Se domicilio: "Pronto" → "In Consegna"

### 5.7 profile.html (Profilo Utente)
- [ ] Visualizza dati personali
- [ ] Form modifica: nome, cognome, email, telefono, indirizzo
- [ ] Se cliente: modifica preferenze e metodo pagamento
- [ ] Se ristoratore: link alla dashboard
- [ ] Bottone "Elimina Account" con conferma → `DELETE /api/auth/profile`
- [ ] Dati da `GET /api/auth/profile`, submit → `PUT /api/auth/profile`

### 5.8 dashboard.html (Dashboard Ristoratore)
- [ ] Info ristorante (nome, indirizzo, telefono, P.IVA) con modifica
- [ ] Sezione "Il mio Menu":
  - Lista piatti attualmente in vendita
  - Bottone "Aggiungi da catalogo": modale con lista piatti dal JSON, seleziona e imposta prezzo
  - Bottone "Crea piatto personalizzato": form con nome, categoria, ingredienti, immagine, prezzo
  - Modifica/Rimuovi piatti esistenti
- [ ] Sezione "Ordini in coda":
  - Lista ordini attivi con cambio stato
  - Contatore ordini in coda (per calcolo tempo attesa)
- [ ] Sezione "Statistiche":
  - Numero totale ordini
  - Piatti più venduti (top 5)
  - Incasso totale / giornaliero / settimanale
  - Grafico ordini nel tempo (opzionale)
- [ ] Dati da `GET /api/stats/restaurant/:id`

---

## FASE 6 - JavaScript Frontend

### 6.1 js/api.js (Modulo chiamate API)
- [ ] Funzione base `apiFetch(endpoint, options)` con gestione token JWT
- [ ] Funzioni wrapper: `getMeals()`, `login()`, `register()`, `createOrder()`, ecc.
- [ ] Gestione errori HTTP (401 → redirect a login, 500 → messaggio errore)

### 6.2 js/auth.js (Gestione autenticazione)
- [ ] Salvataggio JWT in localStorage dopo login
- [ ] Funzione `isLoggedIn()`: controlla se token esiste e non è scaduto
- [ ] Funzione `getUser()`: decodifica token per ottenere tipo utente
- [ ] Funzione `logout()`: rimuove token e redirect
- [ ] Aggiornamento navbar: se loggato mostra "Profilo" e "Logout" al posto di "Accedi"
- [ ] Protezione pagine: redirect a login se non autenticato

### 6.3 js/cart.js (Gestione carrello)
- [ ] Carrello salvato in localStorage come array di oggetti
- [ ] `addToCart(meal, restaurantId)`: aggiunge piatto
- [ ] `removeFromCart(index)`: rimuove piatto
- [ ] `updateQuantity(index, qty)`: aggiorna quantità
- [ ] `getCartTotal()`: calcola totale
- [ ] `clearCart()`: svuota dopo ordine confermato
- [ ] Vincolo: tutti i piatti devono essere dello stesso ristorante

---

## FASE 7 - Funzionalità avanzate

### 7.1 Calcolo distanza e costo consegna (OpenStreetMap)
- [ ] Usare Nominatim API per geocoding indirizzo → coordinate
- [ ] Calcolare distanza tra ristorante e punto di consegna
- [ ] Formula costo: es. 2€ base + 0.50€/km
- [ ] Mostrare distanza e costo nel carrello prima della conferma

### 7.2 Tempo di attesa
- [ ] Contare ordini in coda per il ristorante (stato = ordinato o in_preparazione)
- [ ] Tempo stimato = ordini_in_coda * tempo_medio_per_ordine (es. 10 min)
- [ ] Mostrare al cliente al momento dell'ordine

### 7.3 Ricerca per allergie
- [ ] L'utente seleziona allergeni da escludere (glutine, lattosio, frutta a guscio, ecc.)
- [ ] La API filtra i piatti escludendo quelli che contengono quegli ingredienti

### 7.4 Offerte personalizzate
- [ ] In base alle preferenze salvate nel profilo cliente
- [ ] Homepage mostra piatti della categoria preferita in evidenza

---

## FASE 8 - Swagger e documentazione API

- [ ] Installare e configurare `swagger-jsdoc` + `swagger-ui-express`
- [ ] Annotare ogni route con commenti `@swagger` (parametri, body, risposte)
- [ ] Endpoint `/api-docs` con interfaccia Swagger UI interattiva
- [ ] Documentare autenticazione JWT (Bearer token)

---

## FASE 9 - Documentazione e consegna

### 9.1 Relazione PDF
- [ ] Struttura e presentazione del sito web
- [ ] Descrizione delle operazioni implementate
- [ ] Scelte implementative e motivazioni
- [ ] Schema del database
- [ ] Descrizione API REST
- [ ] Diagrammi (opzionale)

### 9.2 Screenshot dimostrativi
- [ ] Registrazione utente (cliente e ristoratore)
- [ ] Login
- [ ] Ricerca ristoranti (per luogo, nome, piatto)
- [ ] Ricerca piatti (per tipologia, nome, prezzo, ingrediente, allergia)
- [ ] Visualizzazione menu ristorante
- [ ] Aggiunta piatti al carrello
- [ ] Conferma ordine (ritiro e domicilio)
- [ ] Cambio stato ordine (ristoratore)
- [ ] Conferma ricezione (cliente)
- [ ] Statistiche ristorante
- [ ] Storico acquisti cliente
- [ ] Dashboard ristoratore
- [ ] Swagger API docs

### 9.3 Consegna
- [ ] Codice sorgente su GitHub
- [ ] Upload su upload.di.unimi.it
- [ ] Deadline: ultimo appello Settembre 2026

---

## Operazioni obbligatorie (riepilogo da PDF)

### Base:
- [x] ~~Setup HTML/CSS/Bootstrap~~ (fatto)
- [ ] Registrazione e login
- [ ] Visualizzazione piatti, clienti, ristoratori, acquisti
- [ ] Ricerca ristoranti per luogo e nome
- [ ] Ricerca piatti per tipologia, nome, prezzo
- [ ] Login e ordine di uno o più piatti
- [ ] Gestione consegne (flusso stati ordine)
- [ ] Statistiche per ristorante
- [ ] Visualizzazione acquisti presenti e passati

### Aggiuntive (se lavori da solo, facoltative ma consigliate):
- [ ] Ricerca ristorante per piatto
- [ ] Ricerca piatti per ingredienti
- [ ] Ricerca piatti per allergie
- [ ] Consegna a domicilio con calcolo distanza OpenStreetMap
