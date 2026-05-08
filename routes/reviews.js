const router = require('express').Router();
const Review = require('../models/Reviews');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const auth = require('../middleware/auth');

/**
 * @swagger
 * /api/reviews/restaurant/{id}:
 *   get:
 *     summary: Recensioni di un ristorante
 *     description: Endpoint pubblico, ritorna le recensioni di un ristorante con dati utente populati
 *     tags: [Reviews]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB del ristorante
 *     responses:
 *       200:
 *         description: Array di recensioni del ristorante
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Review'
 *       500:
 *         description: Errore server
 */
router.get('/restaurant/:id', async (req, res) => {
    try {
        const reviews = await Review.find({ restaurant: req.params.id })
            .sort({ createdAt: -1 })
            .populate('user', 'name');
        res.json(reviews);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero delle recensioni' });
    }
});

/**
 * @swagger
 * /api/reviews/mine:
 *   get:
 *     summary: Recensioni del cliente loggato
 *     description: Ritorna le recensioni scritte dall'utente autenticato
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array delle proprie recensioni
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Review'
 *       401:
 *         description: Token mancante o non valido
 *       500:
 *         description: Errore server
 */
router.get('/mine', auth, async (req, res) => {
    try {
        const reviews = await Review.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .populate('restaurant', 'name');
        res.json(reviews);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero delle recensioni' });
    }
});

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Dettaglio di una recensione
 *     tags: [Reviews]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB della recensione
 *     responses:
 *       200:
 *         description: Recensione trovata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       404:
 *         description: Recensione non trovata
 *       500:
 *         description: Errore server
 */
router.get('/:id', async (req, res) => {
    try {
        const review = await Review.findById(req.params.id)
            .populate('user', 'name')
            .populate('restaurant', 'name');
        if (!review) {
            return res.status(404).json({ error: 'Recensione non trovata' });
        }
        res.json(review);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero della recensione' });
    }
});

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Crea una nuova recensione
 *     description: |
 *       Crea una recensione per un ristorante. L'utente deve aver ricevuto almeno
 *       un ordine in stato `consegnato` da quel ristorante. È consentita una sola
 *       recensione per coppia (utente, ristorante).
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [restaurant, rating, comment]
 *             properties:
 *               restaurant:
 *                 type: string
 *                 description: ID MongoDB del ristorante da recensire
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Recensione creata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       401:
 *         description: Token mancante o non valido
 *       403:
 *         description: Devi aver ricevuto almeno un ordine consegnato per recensire
 *       404:
 *         description: Ristorante non trovato
 *       409:
 *         description: Hai già recensito questo ristorante
 *       500:
 *         description: Errore server
 */
router.post('/', auth, async (req, res) => {
    try {
        const { restaurant: restaurantId, rating, comment } = req.body;

        // Verifica che il ristorante esista
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ error: 'Ristorante non trovato' });
        }

        // Verifica che l'utente abbia almeno un ordine consegnato da questo ristorante
        const hasDelivered = await Order.exists({
            user: req.user.id,
            restaurant: restaurantId,
            status: 'consegnato'
        });
        if (!hasDelivered) {
            return res.status(403).json({ error: 'Devi aver ricevuto almeno un ordine per recensire' });
        }

        // Verifica che non esista già una recensione (il compound unique index lo gestirebbe ma diamo errore pulito)
        const existing = await Review.findOne({ user: req.user.id, restaurant: restaurantId });
        if (existing) {
            return res.status(409).json({ error: 'Hai già recensito questo ristorante' });
        }

        const review = await Review.create({
            user: req.user.id,
            restaurant: restaurantId,
            rating,
            comment
        });
        res.status(201).json(review);
    } catch (error) {
        // Fallback in caso di race condition col compound index
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Hai già recensito questo ristorante' });
        }
        console.error(error);
        res.status(500).json({ error: 'Errore nella creazione della recensione' });
    }
});

/**
 * @swagger
 * /api/reviews/{id}:
 *   put:
 *     summary: Modifica una recensione
 *     description: Solo l'autore della recensione può modificarla
 *     tags: [Reviews]
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
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating, comment]
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Recensione modificata
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       401:
 *         description: Token mancante o non valido
 *       403:
 *         description: Non sei l'autore della recensione
 *       404:
 *         description: Recensione non trovata
 *       500:
 *         description: Errore server
 */
router.put('/:id', auth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ error: 'Recensione non trovata' });
        }
        if (review.user.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Non sei l\'autore della recensione' });
        }

        review.rating = req.body.rating;
        review.comment = req.body.comment;
        await review.save();
        res.json(review);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nella modifica della recensione' });
    }
});

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Elimina una recensione
 *     description: Solo l'autore della recensione può cancellarla
 *     tags: [Reviews]
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
 *         description: Recensione eliminata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       401:
 *         description: Token mancante o non valido
 *       403:
 *         description: Non sei l'autore della recensione
 *       404:
 *         description: Recensione non trovata
 *       500:
 *         description: Errore server
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ error: 'Recensione non trovata' });
        }
        if (review.user.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Non sei l\'autore della recensione' });
        }
        await Review.findByIdAndDelete(req.params.id);
        res.json({ message: 'Recensione eliminata' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nell\'eliminazione della recensione' });
    }
});

module.exports = router;
