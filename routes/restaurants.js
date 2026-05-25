const router = require('express').Router();
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

/**
 * @swagger
 * /api/restaurants:
 *   get:
 *     summary: Lista di tutti i ristoranti
 *     description: Endpoint pubblico, ritorna l'array di tutti i ristoranti registrati
 *     tags: [Restaurants]
 *     responses:
 *       200:
 *         description: Array dei ristoranti
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Restaurant'
 *       500:
 *         description: Errore nel recupero
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
    try {
        const restaurants = await Restaurant.find();
        res.json(restaurants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero dei ristoranti' });
    }
});

/**
 * @swagger
 * /api/restaurants/mine:
 *   get:
 *     summary: Ristoranti del ristoratore loggato
 *     description: Ritorna i ristoranti di proprietà dell'utente autenticato
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array dei ristoranti del proprietario
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Restaurant'
 *       401:
 *         description: Token mancante o non valido
 *       500:
 *         description: Errore server
 */
router.get('/mine', auth, async (req, res) => {
    try {
        const restaurants = await Restaurant.find({ owner: req.user.id });
        res.json(restaurants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero dei ristoranti' });
    }
});

/**
 * @swagger
 * /api/restaurants/search:
 *   get:
 *     summary: Ricerca ristoranti per nome, indirizzo o tipo cucina
 *     description: |
 *       Endpoint pubblico. Tutti i parametri sono opzionali e possono essere combinati (AND).
 *       La ricerca è case-insensitive con match parziale.
 *       Per `cuisine`, vengono cercati ristoranti che hanno almeno un piatto nel menu
 *       con quella categoria, area o tag corrispondente.
 *     tags: [Restaurants]
 *     parameters:
 *       - name: name
 *         in: query
 *         required: false
 *         schema: { type: string }
 *         description: Filtro su nome ristorante
 *       - name: address
 *         in: query
 *         required: false
 *         schema: { type: string }
 *         description: Filtro su indirizzo
 *       - name: cuisine
 *         in: query
 *         required: false
 *         schema: { type: string }
 *         description: Tipo di cucina (cerca in strCategory, strArea, strTags dei MenuItems)
 *     responses:
 *       200:
 *         description: Array dei ristoranti che matchano i filtri
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Restaurant'
 *       500:
 *         description: Errore server
 */
router.get('/search', async (req, res) => {
    try {
        // destructure query params to filter
        // equivalent to 
        // const name = req.query.name, 
        // const address = req.query.address,
        // const cuisine = req.query;`
        const { name, address, cuisine } = req.query;
        const filter = {};

        if (name && name.trim()) {
            filter.name = { $regex: name.trim(), $options: 'i' };
        }
        if (address && address.trim()) {
            filter.address = { $regex: address.trim(), $options: 'i' };
        }
        if (cuisine && cuisine.trim()) {
            const c = cuisine.trim();
            const menuItems = await MenuItem.find({
                $or: [
                    { strCategory: { $regex: c, $options: 'i' } },
                    { strArea:     { $regex: c, $options: 'i' } },
                    { strTags:     { $regex: c, $options: 'i' } }
                ]
            }).select('restaurant');
            // get unique restaurant ids Usa 'Set' per evitare duplicati
            const restaurantIds = [...new Set(menuItems.map(m => m.restaurant.toString()))];
            filter._id = { $in: restaurantIds };
        }

        const restaurants = await Restaurant.find(filter);
        res.json(restaurants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nella ricerca' });
    }
});

/**
 * @swagger
 * /api/restaurants/order/{id}:
 *   get:
 *     summary: Dettaglio pubblico di un ristorante
 *     description: Endpoint pubblico per la pagina cliente, ritorna il ristorante per id
 *     tags: [Restaurants]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB del ristorante
 *     responses:
 *       200:
 *         description: Ristorante trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Restaurant'
 *       404:
 *         description: Ristorante non trovato
 *       500:
 *         description: Errore server
 */
router.get('/order/:id', async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ error: 'Ristorante non trovato' });
        res.json(restaurant);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero del ristorante' });
    }
});

/**
 * @swagger
 * /api/restaurants/{id}:
 *   get:
 *     summary: Dettaglio ristorante (solo proprietario)
 *     description: Ritorna il ristorante; accessibile solo dal ristoratore proprietario
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB del ristorante
 *     responses:
 *       200:
 *         description: Ristorante trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Restaurant'
 *       401:
 *         description: Token mancante o non valido
 *       403:
 *         description: Non sei il proprietario del ristorante
 *       404:
 *         description: Ristorante non trovato
 *       500:
 *         description: Errore server
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        const menu = await Restaurant.findById(req.params.id).populate('menu');
        if (!restaurant) return res.status(404).json({ error: 'Ristorante non trovato' });

        if (restaurant.owner.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }
        res.json(restaurant);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero del ristorante' });
    }
});

/**
 * @swagger
 * /api/restaurants:
 *   post:
 *     summary: Crea un nuovo ristorante
 *     description: Solo per ristoratori. Accetta multipart per upload immagine
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:        { type: string }
 *               address:     { type: string }
 *               phone:       { type: string }
 *               piva:        { type: string }
 *               description: { type: string }
 *               image:       { type: string, format: binary, description: 'File immagine' }
 *             required: [name, address, phone, piva]
 *     responses:
 *       201:
 *         description: Ristorante creato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Restaurant'
 *       401:
 *         description: Token mancante o non valido
 *       500:
 *         description: Errore server
 */
router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        const { name, address, phone, piva, description } = req.body;
        const image = req.file ? '/uploads/' + req.file.filename : null;
        const restaurant = await Restaurant.create({
            owner: req.user.id,
            name, address, phone, piva, description, image
        });
        res.status(201).json(restaurant);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nella creazione del ristorante' });
    }
});

/**
 * @swagger
 * /api/restaurants/{id}:
 *   put:
 *     summary: Modifica un ristorante esistente
 *     description: Solo il proprietario può modificare. Multipart per upload immagine
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:        { type: string }
 *               address:     { type: string }
 *               phone:       { type: string }
 *               piva:        { type: string }
 *               description: { type: string }
 *               image:       { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Ristorante aggiornato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Restaurant'
 *       401:
 *         description: Token mancante o non valido
 *       403:
 *         description: Non autorizzato
 *       404:
 *         description: Ristorante non trovato
 *       500:
 *         description: Errore server
 */
router.put('/:id', auth, upload.single('image'), async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ error: 'Ristorante non trovato' });
        if (restaurant.owner.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        const { name, address, phone, piva, description } = req.body;
        const image = req.file ? '/uploads/' + req.file.filename : restaurant.image;
        const updated = await Restaurant.findByIdAndUpdate(
            req.params.id,
            { name, address, phone, piva, description, image },
            { returnDocument: 'after' }
        );
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nella modifica del ristorante' });
    }
});

/**
 * @swagger
 * /api/restaurants/{id}:
 *   delete:
 *     summary: Cancella un ristorante
 *     description: Solo il proprietario può cancellare il proprio ristorante
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ristorante cancellato
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       401:
 *         description: Token mancante o non valido
 *       403:
 *         description: Non autorizzato
 *       404:
 *         description: Ristorante non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ error: 'Ristorante non trovato' });
        if (restaurant.owner.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        await Restaurant.findByIdAndDelete(req.params.id);
        res.json({ message: 'Ristorante cancellato' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nella cancellazione del ristorante' });
    }
});



module.exports = router;
