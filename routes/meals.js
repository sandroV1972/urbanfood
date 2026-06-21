const router = require('express').Router();
const Meal = require('../models/Meal');

/**
 * @swagger
 * /api/meals/random:
 *   get:
 *     summary: Ritorna un piatto casuale dal catalogo
 *     description: Endpoint pubblico, usato dalla home per la card "Piatto del giorno"
 *     tags: [Meals]
 *     responses:
 *       200:
 *         description: Array contenente un singolo piatto
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Meal'
 *       500:
 *         description: Errore server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/random', async (req, res) => {
    try {
        const randomMeal = await Meal.aggregate([{ $sample: { size: 1 } }]);
        res.json(randomMeal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero dei piatti' });
    }
});

/**
 * @swagger
 * /api/meals:
 *   get:
 *     summary: Lista tutti i piatti del catalogo
 *     description: Endpoint pubblico, ritorna l'intero catalogo dei piatti disponibili
 *     tags: [Meals]
 *     responses:
 *       200:
 *         description: Array di piatti
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Meal'
 *       500:
 *         description: Errore server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
    try {
        const meals = await Meal.find();
        res.json(meals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero dei piatti' });
    }
});

/**
 * @swagger
 * 
 * /api/meals/cousines:
 *   get:
 *     summary: Restituisce tutti i tipi di cucina
 *     tags: [MenuItems]
 *     responses:
 *       200:
 *         description: Lista dei tipi di cucina
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
router.get('/cuisines', async (req, res) => {
    try {
        const cuisines = await Meal.distinct('strArea');
        res.json(cuisines.filter(c => c).sort());
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero dei tipi di cucina' });
    }
});
/**
 * @swagger
 * /api/meals/categories:
 * 
 * 
 *   get:
 *     summary: Tipologie di Piatti disponibili
 *     tags: [Meals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array dei tipi di piatti (strCategory) distinti presenti
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { type: string }
 *       401:
 *         description: Token mancante o non valido
 *       404:
 *         description: Ristorante non trovato
 *       500:
 *         description: Errore server
 */
router.get('/categories', async (req, res) => {
    try {
        const categories = await Meal.distinct('strCategory');
        res.json(categories.filter(c => c).sort());
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nella ricerca dei piatti' });
    }
});

module.exports = router;
