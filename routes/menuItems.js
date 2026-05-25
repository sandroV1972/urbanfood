const router = require('express').Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const Meal = require('../models/Meal');

/**
 * @swagger
 * /api/menu-items:
 *   get:
 *     summary: Menu del ristorante del ristoratore loggato
 *     description: Ritorna tutti i piatti del ristorante associato all'utente autenticato
 *     tags: [MenuItems]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array di piatti del menu
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MenuItem'
 *       401:
 *         description: Token mancante o non valido
 *       500:
 *         description: Errore server
 */
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

/**
 * @swagger
 * /api/menu-items/search:
 *   get:
 *     summary: Ricerca piatti per nome, categoria, prezzo
 *     description: |
 *       Endpoint protetto. Tutti i parametri sono opzionali e si combinano in AND.
 *       Solo piatti `available: true` vengono ritornati. Il ristorante è populato.
 *     tags: [MenuItems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: name
 *         in: query
 *         schema: { type: string }
 *         description: Filtro su nome piatto (regex case-insensitive)
 *       - name: category
 *         in: query
 *         schema: { type: string }
 *         description: Filtro su categoria/area (regex case-insensitive)
 *       - name: minPrice
 *         in: query
 *         schema: { type: number }
 *       - name: maxPrice
 *         in: query
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Array di piatti che matchano
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MenuItem'
 *       401:
 *         description: Token mancante o non valido
 *       500:
 *         description: Errore server
 */
router.get('/search', auth, async (req, res) => {
    try {
        const { name, category, minPrice, maxPrice } = req.query;
        const filter = { available: true };

        if (name && name.trim()) {
            filter.strMeal = { $regex: name.trim(), $options: 'i' };
        }
        if (category && category.trim()) {
            const c = category.trim();
            filter.$or = [
                { strCategory: { $regex: c, $options: 'i' } },
                { strArea:     { $regex: c, $options: 'i' } },
                { strTags:     { $regex: c, $options: 'i' } }
            ];
        }
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        const items = await MenuItem.find(filter)
            .populate('restaurant', 'name address');
        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nella ricerca piatti' });
    }
});

/**
 * @swagger
 * /api/menu-items/restaurant/{id}:
 *   get:
 *     summary: Menu pubblico di un ristorante
 *     description: Endpoint pubblico, ritorna solo i piatti disponibili (available true)
 *     tags: [MenuItems]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB del ristorante
 *     responses:
 *       200:
 *         description: Array di piatti disponibili
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MenuItem'
 *       500:
 *         description: Errore server
 */
router.get('/restaurant/:id', async (req, res) => {
    try {
        const menuItems = await MenuItem.find({ restaurant: req.params.id, available: true });
        res.json(menuItems);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero del menu' });
    }
});

/**
 * @swagger
 * /api/menu-items/cuisines:
 *   get:
 *     summary: Cucine disponibili del ristorante
 *     tags: [MenuItems]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
*           description: Array delle cucine (strArea) distinte presenti nel menu
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
router.get('/cuisines', auth, async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({owner: req.user.id});
        if (!restaurant) return res.status(404).json({ error: 'Ristorante non trovato' });
        const cuisines = await MenuItem.distinct('strArea', {restaurant: restaurant._id});
        res.json(cuisines);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nella ricerca delle cucine' });
    }
});

/**
 * @swagger
 * /api/menu-items/{id}:
 *   get:
 *     summary: Dettaglio singolo piatto del menu
 *     tags: [MenuItems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB del piatto
 *     responses:
 *       200:
 *         description: Piatto trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItem'
 *       401:
 *         description: Token mancante o non valido
 *       404:
 *         description: Piatto non trovato
 *       500:
 *         description: Errore server
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id);
        if (!menuItem) return res.status(404).json({ error: 'Piatto non trovato' });
        res.json(menuItem);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero del piatto' });
    }
});

/**
 * @swagger
 * /api/menu-items/{id}:
 *   delete:
 *     summary: Elimina piatto del menu
 *     tags: [MenuItems]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB del piatto
 *     responses:
 *       200:
 *         description: Piatto cancellato
 *       401:
 *         description: Token mancante o non valido
 *       403:
 *         description: Non autorizzato
 *       404:
 *         description: Piatto non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id);
        if (!menuItem) return res.status(404).json({ error: 'Piatto non trovato' });

        // Verifica che il ristorante a cui appartiene il piatto sia di proprietà dell'utente loggato
        const restaurant = await Restaurant.findById(menuItem.restaurant);
        if (!restaurant || restaurant.owner.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        await MenuItem.findByIdAndDelete(req.params.id);
        res.json({ message: 'Piatto cancellato' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nella cancellazione del piatto' });
    }
});
/**
 * @swagger
 * /api/menu-items/from-catalog:
 *   post:
 *     summary: Aggiungi piatti dal catalogo Meals al menu del ristorante
 *     description: Riceve un array di id meals e li copia nel menu del ristorante con prezzo default
 *     tags: [MenuItems]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mealIds]
 *             properties:
 *               mealIds:
 *                 type: array
 *                 items: { type: string }
 *                 description: Array di id Meal del catalogo
 *     responses:
 *       201:
 *         description: Piatti creati nel menu
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MenuItem'
 *       401:
 *         description: Token mancante o non valido
 *       500:
 *         description: Errore server
 */
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

/**
 * @swagger
 * /api/menu-items:
 *   post:
 *     summary: Crea un piatto custom nel menu
 *     description: Multipart per upload immagine. Ingredienti e misure separati da newline
 *     tags: [MenuItems]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [strMeal, price]
 *             properties:
 *               strMeal:         { type: string }
 *               strCategory:     { type: string }
 *               strArea:         { type: string }
 *               strInstructions: { type: string }
 *               strTags:         { type: string }
 *               ingredients:     { type: string, description: 'Lista ingredienti separati da \\n' }
 *               measures:        { type: string, description: 'Lista misure separati da \\n' }
 *               price:           { type: number }
 *               image:           { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Piatto creato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItem'
 *       401:
 *         description: Token mancante o non valido
 *       500:
 *         description: Errore server
 */
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

/**
 * @swagger
 * /api/menu-items/{id}:
 *   put:
 *     summary: Modifica un piatto del menu
 *     description: Multipart per upload immagine. Ingredienti e misure separati da newline
 *     tags: [MenuItems]
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
 *               strMeal:         { type: string }
 *               strCategory:     { type: string }
 *               strArea:         { type: string }
 *               strInstructions: { type: string }
 *               strTags:         { type: string }
 *               ingredients:     { type: string }
 *               measures:        { type: string }
 *               price:           { type: number }
 *               image:           { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Piatto aggiornato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItem'
 *       401:
 *         description: Token mancante o non valido
 *       403:
 *         description: Non autorizzato
 *       404:
 *         description: Piatto non trovato
 *       500:
 *         description: Errore server
 */
router.put('/:id', auth, upload.single('image'), async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id);
        if (!menuItem) return res.status(404).json({ error: 'Piatto non trovato' });

        // Verifica che il ristorante a cui appartiene il piatto sia di proprietà dell'utente loggato
        const restaurant = await Restaurant.findById(menuItem.restaurant);
        if (!restaurant || restaurant.owner.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        const { strMeal, strCategory, strArea, strInstructions, strTags, ingredients, measures, price } = req.body;

        const updateData = {
            strMeal,
            strCategory,
            strArea,
            strInstructions,
            strTags,
            ingredients: ingredients ? ingredients.split('\n').filter(Boolean) : [],
            measures: measures ? measures.split('\n').filter(Boolean) : [],
            price
        };

        if (req.file) {
            updateData.strMealThumb = '/uploads/' + req.file.filename;
        }

        const updated = await MenuItem.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after' });
        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nella modifica del piatto' });
    }
});


module.exports = router;
