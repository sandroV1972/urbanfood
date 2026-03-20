// Importa il modulo dotenv per la gestione delle variabili d'ambiente
require('dotenv').config();

// Importa Express per la creazione del server Node.js
const express = require('express');
const app = express();

// Importa il modulo per la connessione al database
const connectDB = require('./config/db');

// Abilita CORS per tutte le richieste HTTP in entrata. Non serve se gira tutto su localhost:3000
// ma e' utile se si vuole accedere da un client esterno
const cors = require('cors');
app.use(cors());

const port = process.env.PORT || 3000; // Usa la porta definita dall'ambiente o 3000 di default

// Connessione al database
connectDB();

// Middleware per parsare il JSON nelle richieste
app.use(express.json());

// Definizione middleware pagine statiche
app.use(express.static('public'));

// Esempio di un'altra rotta (GET /api/saluto)
app.get('/api/saluto', (req, res) => {
  const nome = req.query.nome || 'Mondo'; // Prende il nome dai parametri query (es. /api/saluto?nome=Alice)
  res.json({ messaggio: `Ciao, ${nome}!` });
});

// Rotte pagine senza .html
app.get('/dashboard', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard.html');
});
app.get('/profile', (req, res) => {
  res.sendFile(__dirname + '/public/profile.html');
});
app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/public/register.html');
});
app.get('/restaurants', (req, res) => {
  res.sendFile(__dirname + '/public/restaurants.html');
});

// Importa le rotte API
const routes = require('./routes');
app.use('/api', routes);

// Middleware per gestire le richieste non trovate
app.use((req, res) => {
  res.status(404).json({ error: 'Pagina non trovata' });
});

// Middleware per gestire gli errori
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Si è verificato un errore' });
});



// Avvia il server
app.listen(port, () => {
  console.log(`Server Node.js in ascolto sulla porta ${port}`);
});
