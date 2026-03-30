const router = require('express').Router();
const Restaurant = require('../models/Restaurant');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /api/restaurants - lista ristoranti del ristoratore loggato
router.get('/', auth, async (req, res) => {
    try {
        const restaurants = await Restaurant.find({ owner: req.user.id });
        res.json(restaurants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero dei ristoranti' });
    }
});

// GET /api/restaurants/:id - dettaglio singolo ristorante
router.get('/:id', auth, async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
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

// POST /api/restaurants - crea un nuovo ristorante
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

// PUT /api/restaurants/:id - modifica un ristorante
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
            { new: true }
        );
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nella modifica del ristorante' });
    }
});

// DELETE /api/restaurants/:id - cancella un ristorante
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
