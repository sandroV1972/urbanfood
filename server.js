const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // Usa la porta definita dall'ambiente o 3000 di default

// Middleware per parsare il JSON nelle richieste
app.use(express.json());

// Definizione middleware pagine statiche
app.use(express.static('public'));

// Esempio di un'altra rotta (GET /api/saluto)
app.get('/api/saluto', (req, res) => {
  const nome = req.query.nome || 'Mondo'; // Prende il nome dai parametri query (es. /api/saluto?nome=Alice)
  res.json({ messaggio: `Ciao, ${nome}!` });
});

// Avvia il server
app.listen(port, () => {
  console.log(`Server Node.js in ascolto sulla porta ${port}`);
});
