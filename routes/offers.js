const router = require('express').Router();
const Offer = require('../models/Offer');
const Restaurant = require('../models/Restaurant');
const auth = require('../middleware/auth');
const User = require('../models/User');

/**
 * @swagger
 * /api/offers:
 *   get:
 *     summary: Lista di tutte le offerte
 *     description: Endpoint pubblico, ritorna l'array di tutte le offerte
 *     tags: [Offers]
 *     responses:
 *       200:
 *         description: Array di offerte
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Offer'
 *       500:
 *         description: Errore server
 */
router.get('/', async (req, res) => {
    try {
        const offers = await Offer.find();
        res.json(offers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero delle offerte' });
    }
});

/**
 * @swagger
 * /api/offers/mine:
 *   get:
 *     summary: Offerte del ristorante del ristoratore loggato
 *     description: Ritorna tutte le offerte (attive e passate) del ristorante associato all'utente autenticato
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array delle offerte ordinate per data di fine decrescente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Offer'
 *       401:
 *         description: Token mancante o non valido
 *       404:
 *         description: Ristorante non trovato
 *       500:
 *         description: Errore server
 */
router.get('/mine', auth, async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user.id });
        if (!restaurant) return res.status(404).json({ error: 'Ristorante non trovato' });
        // end: -1 => ordina per data di fine decrescente
        const offers = await Offer.find({ restaurant: restaurant._id }).sort({ end: -1 });
        res.json(offers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero delle offerte' });
    }
});

/**
 * @swagger
 * /api/offers/restaurant/{id}:
 *   get:
 *     summary: Offerte attive di un ristorante
 *     description: Endpoint pubblico, ritorna solo le offerte attualmente attive (now compreso tra start ed end)
 *     tags: [Offers]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB del ristorante
 *     responses:
 *       200:
 *         description: Array delle offerte attive
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Offer'
 *       500:
 *         description: Errore server
 */
router.get('/restaurant/:id', async (req, res) => {
    try {
        const now = new Date();
        const offers = await Offer.find({
            restaurant: req.params.id,
            start: { $lte: now },
            end:   { $gte: now }
        }).sort({ end: 1 });
        res.json(offers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero delle offerte' });
    }
});

/**
 * @swagger
 * /api/offers:
 *   post:
 *     summary: Crea una nuova offerta per il ristorante del ristoratore loggato
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description, discount, category, start, end]
 *             properties:
 *               description:
 *                 type: string
 *                 description: Testo descrittivo dell'offerta
 *               discount:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Percentuale di sconto
 *               category:
 *                 type: string
 *                 description: Categoria piatti a cui si applica (oppure "Tutte")
 *               start:
 *                 type: string
 *                 format: date
 *               end:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Offerta creata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Offer'
 *       400:
 *         description: Dati invalidi (es. data fine precedente alla data inizio)
 *       401:
 *         description: Token mancante o non valido
 *       404:
 *         description: Ristorante non trovato
 *       500:
 *         description: Errore server
 */
router.post('/', auth, async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user.id });
        if (!restaurant) return res.status(404).json({ error: 'Ristorante non trovato' });

        const { description, discount, category, start, end } = req.body;

        if (new Date(end) < new Date(start)) {
            return res.status(400).json({ error: 'La data di fine deve essere successiva a quella di inizio' });
        }

        const offer = await Offer.create({
            restaurant: restaurant._id,
            description,
            discount,
            category,
            start,
            end
        });
        res.status(201).json(offer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nella creazione dell\'offerta' });
    }
});

/**
 * @swagger
 * /api/offers/myOffers:
 *   get:
 *     summary: Ritorna le offerte adatte a un determinato cliente
 *     tags: [Offers]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB del cliente
 *     responses:
 *       200:
 *         description: Array delle offerte
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Offer'
 *       500:
 *         description: Errore server
 */
router.get('/myOffers', auth, async (req, res) => {
    // Ritorna le offerte attive che matchano le preferenze del cliente loggato.
    // Se l'utente non è cliente, non ha attivato le offerte, o non ha categorie
    // preferite, ritorna array vuoto (non è un errore, è solo "niente da mostrare").
    try {
        const user = await User.findById(req.user.id, 'preferenze usrType');

        if (user.usrType !== 'cliente')   return res.json([]);
        if (!user.preferenze?.offerte)    return res.json([]);

        const categories = user.preferenze.categorie || [];
        if (categories.length === 0)      return res.json([]);

        const now = new Date();
        const offers = await Offer.find({
            start: { $lte: now },
            end:   { $gte: now },
            $or: [
                { category: { $in: categories } },
                { category: 'Tutte' }
            ]
        }).populate('restaurant', 'name image');

        res.json(offers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero delle offerte personalizzate' });
    }
});

/**
 * @swagger
 * /api/offers/{id}:
 *   delete:
 *     summary: Elimina un'offerta
 *     description: Solo il ristoratore proprietario del ristorante a cui l'offerta appartiene può cancellarla
 *     tags: [Offers]
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
 *         description: Offerta eliminata
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
 *         description: Offerta non trovata
 *       500:
 *         description: Errore server
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) return res.status(404).json({ error: 'Offerta non trovata' });

        // Verifica che il ristorante a cui appartiene l'offerta sia di proprietà dell'utente loggato
        const restaurant = await Restaurant.findById(offer.restaurant);
        if (!restaurant || restaurant.owner.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        await Offer.findByIdAndDelete(req.params.id);
        res.json({ message: 'Offerta eliminata' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nell\'eliminazione dell\'offerta' });
    }
});

/**
 * @swagger
 * /api/offers/{id}:
 *   get:
 *     summary: Recupera un'offerta specifica
 *     description: Endpoint pubblico
 *     tags: [Offers]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Offerta trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Offer'
 *       404:
 *         description: Offerta non trovata
 *       500:
 *         description: Errore server
 */
router.get('/:id', async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) return res.status(404).json({ error: 'Offerta non trovata' });
        res.json(offer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero dell\'offerta' });
    }
});

module.exports = router;
