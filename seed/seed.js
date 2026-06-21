// =====================================================================
// SEED — Popolamento iniziale del database
// =====================================================================
// Questo script viene eseguito a ogni avvio del server (server.js → seed()).
// Si compone di tre step idempotenti che lavorano sulle collezioni MongoDB
// tramite i modelli Mongoose:
//
//   1. seedMeals       → popola il catalogo piatti (collection 'meals') dal JSON
//   2. seedRestaurants → crea 5 ristoranti demo + relativi User + ~5 MenuItem
//   3. ensureOwners    → garantisce che ogni ristorante abbia il suo proprietario
//                        (Wave Shack a matteo, altri a utenti slug-based)
//
// Tutte le query passano per Mongoose, che traduce i metodi JS (find, create,
// insertMany, distinct, ecc.) in operazioni MongoDB sul cluster Atlas a cui
// ci si è già connessi in config/db.js prima dell'esecuzione di seed().
// =====================================================================

const bcrypt = require('bcrypt');
const Meal = require('../models/Meal');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const meals = require('../meals 1.json'); // file fornito da progetto per popolare il catalogo Meals

// Dati seed per i 5 ristoranti demo. Ognuno include:
// - owner: i dati dell'utente proprietario da creare (senza password, viene hashata dopo)
// - restaurant: i dati del ristorante
// - cuisines: categorie/aree usate per pescare ~5 piatti dal catalogo Meals
const RESTAURANTS_SEED = [
    {
        owner: { name: 'Mario Surf', email: 'mario@surfshack.it', usrType: 'ristoratore' },
        restaurant: {
            name: 'SurfShack Lerici',
            address: 'Via Marina 12, Lerici (SP)',
            phone: '0187 123456',
            piva: '12345678901',
            description: 'Surf food sul golfo dei poeti, dove le onde incontrano il sapore',
            image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'
        },
        // I MenuItems vengono presi dal catalogo Meals dove strCategory o strArea matchano
        cuisines: ['Beef', 'Chicken']
    },
    {
        owner: { name: 'Luigi Romano', email: 'luigi@pizzeriaroma.it', usrType: 'ristoratore' },
        restaurant: {
            name: 'Pizzeria Roma',
            address: 'Via Aurelia 45, La Spezia',
            phone: '0187 567890',
            piva: '23456789012',
            description: 'Pizza napoletana cotta in forno a legna e pasta fresca fatta in casa',
            image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800'
        },
        cuisines: ['Pasta', 'Italian']
    },
    {
        owner: { name: 'Yuki Tanaka', email: 'yuki@tokyosushi.it', usrType: 'ristoratore' },
        restaurant: {
            name: 'Tokyo Sushi Bar',
            address: 'Via Garibaldi 8, Sarzana (SP)',
            phone: '0187 234567',
            piva: '34567890123',
            description: 'Cucina giapponese autentica con pesce fresco del golfo',
            image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800'
        },
        cuisines: ['Seafood', 'Japanese']
    },
    {
        owner: { name: 'Raj Kumar', email: 'raj@currypalace.it', usrType: 'ristoratore' },
        restaurant: {
            name: 'Curry Palace',
            address: 'Corso Cavour 23, La Spezia',
            phone: '0187 345678',
            piva: '45678901234',
            description: 'Ristorante indiano con specialità curry e tandoori',
            image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800'
        },
        cuisines: ['Indian', 'Chicken']
    },
    {
        owner: { name: 'Dimitri Papadopoulos', email: 'dimitri@taverna.it', usrType: 'ristoratore' },
        restaurant: {
            name: 'Greek Taverna',
            address: 'Piazza del Mercato 5, Lerici (SP)',
            phone: '0187 456789',
            piva: '56789012345',
            description: 'Cucina greca tradizionale: souvlaki, moussaka e baklava',
            image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800'
        },
        cuisines: ['Lamb', 'Greek']
    }
];

// ---------------------------------------------------------------------
// STEP 1 — seedMeals
// ---------------------------------------------------------------------
// Popola la collection 'meals' con il catalogo iniziale da meals 1.json
// (~13.000 piatti). Idempotente: se la collection non è vuota, esce subito.
const seedMeals = async () => {
    // countDocuments() ritorna il numero di documenti nella collection meals.
    // Mongoose lo traduce in db.meals.countDocuments({}) sul cluster.
    if (await Meal.countDocuments() > 0) {
        console.log('Meals already seeded');
        return;
    }
    try {
        // Il JSON contiene anche un _id per ogni record. Rimuovo quei campi
        // tramite destructuring rest: { _id, ...rest } scarta _id e tiene il resto.
        // Così Mongo genera nuovi ObjectId al momento dell'inserimento.
        const cleanMeals = meals.map(({ _id, ...rest }) => rest);

        // insertMany è una bulk insert: una sola operazione MongoDB per N documenti.
        // Molto più veloce di N Meal.create() in loop.
        await Meal.insertMany(cleanMeals);
        console.log('Meals seeded successfully');
    } catch (error) {
        console.error('Error seeding meals:', error);
    }
};

// ---------------------------------------------------------------------
// STEP 2 — seedRestaurants
// ---------------------------------------------------------------------
// Per ogni entry in RESTAURANTS_SEED, crea (se non esiste):
//   - lo User proprietario (con password hashata)
//   - il Restaurant con owner che punta allo User appena creato
//   - ~5 MenuItem prelevati dal catalogo Meals matching per cucina
//
// Idempotente per-entry: se l'utente con quella email esiste già, skippa.
const seedRestaurants = async () => {
    try {
        // bcrypt.hash è async: genera un hash sicuro con 10 round di salt
        const password = await bcrypt.hash('password123', 10);
        let added = 0;
        let skipped = 0;

        for (const data of RESTAURANTS_SEED) {
            // findOne({ campo: valore }) ritorna il primo documento che matcha o null.
            // Usato come check di esistenza per garantire idempotenza.
            const existingUser = await User.findOne({ email: data.owner.email });
            if (existingUser) {
                skipped++;
                continue;
            }

            // 1. User.create(obj) genera un nuovo ObjectId e salva il documento.
            //    Ritorna il documento creato (con _id valorizzato).
            //    L'operator spread { ...data.owner, password } unisce i campi
            //    dell'owner con la password hashata.
            const user = await User.create({ ...data.owner, password });

            // 2. Crea il ristorante referenziando user._id come owner.
            //    Il campo owner è ObjectId ref 'User' nello schema Restaurant.
            const restaurant = await Restaurant.create({
                ...data.restaurant,
                owner: user._id
            });

            // 3. Query con $or e $in per trovare i piatti del catalogo che hanno:
            //    - strCategory in [una delle cucine]  OPPURE
            //    - strArea in [una delle cucine]
            //    .limit(5) restituisce al massimo 5 risultati.
            const cuisineMeals = await Meal.find({
                $or: [
                    { strCategory: { $in: data.cuisines } },
                    { strArea:     { $in: data.cuisines } }
                ]
            }).limit(5);

            // 4. Crea un MenuItem per ogni piatto trovato, copiando i campi
            //    rilevanti dal catalogo e aggiungendo restaurant + price.
            //    Loop sincrono con await: una create per volta, in ordine.
            for (const meal of cuisineMeals) {
                await MenuItem.create({
                    restaurant: restaurant._id,
                    idMeal: meal.idMeal,
                    strMeal: meal.strMeal,
                    strCategory: meal.strCategory,
                    strArea: meal.strArea,
                    strInstructions: meal.strInstructions,
                    strMealThumb: meal.strMealThumb,
                    strTags: meal.strTags,
                    ingredients: meal.ingredients,
                    measures: meal.measures,
                    // Prezzo random tra 8.00 e 20.00, arrotondato ai centesimi
                    price: Math.round((8 + Math.random() * 12) * 100) / 100
                });
            }

            console.log(`Seeded ${restaurant.name} with ${cuisineMeals.length} menu items`);
            added++;
        }
        console.log(`Restaurant seed: ${added} aggiunti, ${skipped} già presenti`);
    } catch (error) {
        console.error('Error seeding restaurants:', error);
    }
};

// ---------------------------------------------------------------------
// STEP 3 — ensureOwners
// ---------------------------------------------------------------------
// Garantisce coerenza di proprietà sui ristoranti già nel DB:
//   - "Wave Shack" deve essere di matteo@valenti.email (utente creato se manca)
//   - Tutti gli altri ristoranti attualmente di matteo vengono spostati a un
//     nuovo utente con email derivata dal nome (slug)
//
// Lo step è utile quando si importano ristoranti manualmente: garantisce che
// ognuno abbia un proprietario unico e logicamente coerente.

const KEEP_RESTAURANT_NAME = 'Wave Shack';
const KEEP_OWNER_EMAIL = 'matteo@valenti.email';
const KEEP_OWNER_NAME = 'Matteo Valenti';

// slugify trasforma un nome ristorante in stringa lowercase senza spazi/punteggiatura.
// Es. "Pizzeria Da Gino!" → "pizzeriadagino"
// Usata per generare email tipo "pizzeriadagino@surfshack.it"
const slugify = (name) =>
    name.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')   // rimuove accenti
        .replace(/[^a-z0-9]+/g, '');                // tiene solo lettere/numeri

const ensureOwners = async () => {
    try {
        const password = await bcrypt.hash('password123', 10);

        // Step A: garantisci che matteo esista (creato se manca)
        let matteo = await User.findOne({ email: KEEP_OWNER_EMAIL });
        if (!matteo) {
            matteo = await User.create({
                name: KEEP_OWNER_NAME,
                email: KEEP_OWNER_EMAIL,
                password,
                usrType: 'ristoratore'
            });
            console.log(`+ Creato utente: ${KEEP_OWNER_EMAIL}`);
        }

        // Step B: itera tutti i ristoranti nel DB
        // .find() senza argomento ritorna TUTTI i documenti della collection
        const restaurants = await Restaurant.find();
        let createdUsers = 0;
        let updated = 0;

        for (const r of restaurants) {
            // Caso 1: Wave Shack → deve essere di matteo
            // .equals() confronta ObjectId in modo sicuro (toString-safe)
            if (r.name === KEEP_RESTAURANT_NAME) {
                if (!r.owner.equals(matteo._id)) {
                    r.owner = matteo._id;
                    // .save() persiste le modifiche al documento già esistente
                    await r.save();
                    updated++;
                    console.log(`→ "${r.name}" assegnato a ${KEEP_OWNER_EMAIL}`);
                }
                continue;   // passa al prossimo ristorante
            }

            // Caso 2: altri ristoranti che sono attualmente di matteo → li riassegno
            if (r.owner.equals(matteo._id)) {
                // Genera email slug-based dal nome del ristorante
                const email = `${slugify(r.name)}@surfshack.it`;

                // Cerca o crea l'utente proprietario nuovo
                let user = await User.findOne({ email });
                if (!user) {
                    user = await User.create({
                        name: `${r.name} Owner`,
                        email,
                        password,
                        usrType: 'ristoratore'
                    });
                    createdUsers++;
                    console.log(`+ Creato utente: ${email}`);
                }
                // Riassegna l'owner del ristorante
                r.owner = user._id;
                await r.save();
                updated++;
                console.log(`→ "${r.name}" assegnato a ${email}`);
            }
        }

        console.log(`Owners ensured: ${updated} aggiornati, ${createdUsers} nuovi utenti`);
    } catch (error) {
        console.error('Error ensuring owners:', error);
    }
};

// ---------------------------------------------------------------------
// Entry point del seed: chiamato da server.js dopo connectDB().
// I tre step vengono eseguiti in sequenza con await, per garantire l'ordine:
//   - meals deve esistere prima di seedRestaurants (che attinge al catalogo)
//   - seedRestaurants deve eseguire prima di ensureOwners (che opera sui ristoranti)
// ---------------------------------------------------------------------
const seed = async () => {
    await seedMeals();
    await seedRestaurants();
    await ensureOwners();
};

module.exports = seed;
