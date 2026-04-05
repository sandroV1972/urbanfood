const router = require('express').Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const Meal = require('../models/Meal');

router.get('/', auth, async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user.id });
        const menuItems = await MenuItem.find({ restaurant: restaurant._id });
        res.json(menuItems);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero del menu' });
    }
});

// Aggiunge piatti dal catalogo Meals
router.post('/from-catalog', auth, async (req, res) => {
    try {
        const { mealIds } = req.body;
        const restaurant = await Restaurant.findOne({ owner: req.user.id });
        const meals = await Meal.find({ _id: { $in: mealIds } });

        const created = [];
        for (const meal of meals) {
            const menuItem = await MenuItem.create({
                restaurant: restaurant._id,
                idMeal: meal.idMeal,
                strMeal: meal.strMeal,
                strCategory: meal.strCategory,
                strArea: meal.strArea,
                strInstructions: meal.strInstructions,
                strMealThumb: meal.strMealThumb,
                strTags: meal.strTags,
                strYoutube: meal.strYoutube,
                strSource: meal.strSource,
                strImageSource: meal.strImageSource,
                ingredients: meal.ingredients,
                measures: meal.measures,
                price: 10
            });
            created.push(menuItem);
        }

        res.status(201).json(created);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nella creazione del menu' });
    }
});

// Crea un piatto custom con upload immagine
router.post('/', auth, upload.single('image'), async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user.id });
        const { strMeal, strCategory, strArea, strInstructions, strTags, ingredients, measures, price } = req.body;

        const menuItem = await MenuItem.create({
            restaurant: restaurant._id,
            strMeal,
            strCategory,
            strArea,
            strInstructions,
            strTags,
            ingredients: ingredients ? ingredients.split('\n').filter(Boolean) : [],
            measures: measures ? measures.split('\n').filter(Boolean) : [],
            strMealThumb: req.file ? '/uploads/' + req.file.filename : '',
            price
        });

        res.status(201).json(menuItem);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nella creazione del piatto' });
    }
});

module.exports = router;