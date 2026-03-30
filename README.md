# SurfShack Lerici

Progetto per il corso di **Tecnologie Web** - Universita degli Studi di Milano (UNIMI), A.A. 2025/2026.

SurfShack e una piattaforma di ordinazione online per ristoranti fast food, ispirata alla cultura surf anni '80/'90, con sede a Lerici (SP).

## Stack tecnologico

- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **Backend**: Node.js, Express 5
- **Database**: MongoDB Atlas, Mongoose ODM
- **Autenticazione**: JWT, bcrypt
- **Documentazione API**: Swagger

## Installazione

```bash
# Clona il repository
git clone https://github.com/sandroV1972/urbanfood.git
cd urbanfood

# Installa le dipendenze
npm install

# Crea il file .env nella root del progetto
touch .env
```

### Variabili d'ambiente (.env)

```
PORT=3000
MONGO_URI=mongodb+srv://<utente>:<password>@<cluster>.mongodb.net/urbanfood
JWT_SECRET=<una_stringa_segreta>
```

### Avvio

```bash
# Sviluppo (con auto-reload)
npm run dev

# Produzione
npm start
```

Al primo avvio il server importa automaticamente 302 piatti dal catalogo (`meals 1.json`) nel database.

## Struttura del progetto

```
surfshack/
├── config/
│   └── db.js                # Connessione MongoDB
├── middleware/
│   └── auth.js              # Middleware autenticazione JWT
├── models/
│   ├── Meal.js              # Catalogo piatti (seed)
│   ├── MenuItem.js          # Piatti nei menu dei ristoranti
│   ├── Order.js             # Ordini
│   ├── Restaurant.js        # Ristoranti
│   └── User.js              # Utenti
├── public/
│   ├── components/
│   │   └── navbar.html      # Navbar condivisa
│   ├── css/
│   │   └── style.css        # Stile SurfShack (tema surf '80/'90)
│   ├── js/
│   │   └── auth.js          # Logica autenticazione frontend
│   ├── index.html           # Homepage
│   ├── register.html        # Registrazione
│   ├── profile.html         # Profilo utente
│   ├── dashboard.html       # Dashboard ristoratore
│   └── restaurants.html     # Gestione ristoranti
├── routes/
│   ├── index.js             # Aggregatore rotte API
│   ├── auth.js              # Rotte autenticazione
│   └── meals.js             # Rotte catalogo piatti
├── seed/
│   └── seed.js              # Seed catalogo piatti da JSON
├── server.js                # Entry point
├── meals 1.json             # Dati piatti (TheMealDB)
├── package.json
└── .env                     # Variabili d'ambiente (non versionato)
```

## API Routes

| Metodo | Endpoint | Descrizione | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Registrazione utente | No |
| POST | `/api/auth/login` | Login utente | No |
| PUT | `/api/auth/profile` | Modifica profilo | Si |
| PUT | `/api/auth/password` | Cambio password | Si |
| DELETE | `/api/auth/delete` | Cancella account | Si |
| GET | `/api/meals/random` | Piatto casuale dal catalogo | No |

## Utenti di test

| Nome | Email | Password | Ruolo |
|------|-------|----------|-------|
| Alessandro Valenti | alessandrovalenti.android@gmail.com | *(inserisci)* | cliente |
| Alessandro Valenti | alessandro@valenti.email | *(inserisci)* | cliente |
| Matteo Valenti | matteo@valenti.email | *(inserisci)* | ristoratore |

## Ruoli

- **Cliente**: naviga ristoranti, consulta menu, effettua ordini
- **Ristoratore**: gestisce ristoranti, menu (piatti dal catalogo o custom), ordini ricevuti, statistiche

## Catalogo piatti

Il catalogo contiene 302 piatti importati da [TheMealDB](https://www.themealdb.com/) suddivisi in 14 categorie: Beef, Breakfast, Chicken, Dessert, Goat, Lamb, Miscellaneous, Pasta, Pork, Seafood, Side, Starter, Vegan, Vegetarian.

I ristoratori possono:
- Aggiungere piatti dal catalogo al proprio menu (personalizzando nome, prezzo, ingredienti, foto)
- Creare piatti completamente nuovi

## Autore

**Alessandro Valenti** - UNIMI, Informatica, III anno
