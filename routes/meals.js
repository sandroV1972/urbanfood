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
        // usa una funzione di aggregazione per ottenere un piatto casuale
        // aggrega una sola funzione $sample per ottenere un piatto casuale
        // ritorn una array di un singolo piatto
        // la funzione $sample ha un campo size che indica il numero di piatti da ritornare
        // restituisce un piatto casuale vedi https://www.mongodb.com/docs/manual/reference/operator/aggregation/sample/
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
 *     summary: Lista tutti i piatti del catalogo, meal_1.js fornite dal progetto
 *     description: Endpoint pubblico, ritorna l'intero catalogo dei piatti standard
 *                  pre caricati dal file meal_1.js
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
 * /api/meals/cuisines:
 *   get:
 *     summary: Restituisce tutti i tipi di cucina
 *     tags: [Meals]
 *     responses:
 *       200:
 *         description: Lista dei tipi di cucina
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 *       500:
 *         description: Errore server
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
 *   get:
 *     summary: Tipologie di Piatti disponibili
 *     tags: [Meals]
 *     responses:
 *       200:
 *         description: Array dei tipi di piatti (strCategory) distinti presenti
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { type: string }
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

/**
 * @swagger
 * /api/meals/categoriesWithImages:
 *   get:
 *     summary: Torna ogni categoria con un'immagine rappresentativa
 *     tags: [Meals]
 *     responses:
 *       200:
 *         description: Array di oggetti `{ category, image }`
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   category: { type: string }
 *                   image:    { type: string }
 *       500:
 *         description: Errore server
 */
router.get('/categoriesWithImages', async (req, res) => {
    try {
        const categories = await Meal.aggregate([
            { $group: { _id: '$strCategory', image: { $first: '$strMealThumb' } } },
            { $project: { _id: 0, category: '$_id', image: 1 } }
        ]);
        // errore se non ci sono categorie 404
        if (categories.length === 0) {
            return res.status(404).json({ error: 'Categoria non trovata' });
        }
        // no authentication required for this endpoint
        res.json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nella ricerca dei piatti' });
    }
});

module.exports = router;
