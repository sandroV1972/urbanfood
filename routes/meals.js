const router = require('express').Router();
const Meal = require('../models/Meal');

router.get('/random', async (req, res) => {
    try {
        const randomMeal = await Meal.aggregate([{ $sample: { size: 1 } }]);
        res.json(randomMeal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero dei piatti' });
    }
});

module.exports = router;