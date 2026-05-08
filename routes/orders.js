const router = require('express').Router();
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const auth = require('../middleware/auth');

// Calcola distanza su strada tra due indirizzi usando Nominatim + OSRM
async function getRouteDistance(fromAddress, toAddress) {
    const geocode = async (address) => {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
            { headers: { 'User-Agent': 'SurfShack-University-Project/1.0' } }
            );
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Nominatim error ${response.status}: ${text}`);
            }
            const data = await response.json();
            if (data.length === 0) throw new Error('Indirizzo non trovato: ' + address);
            return { lat: data[0].lat, lon: data[0].lon };
    };

    const from = await geocode(fromAddress);
    const to = await geocode(toAddress);

    const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`,
        { headers: { 'User-Agent': 'SurfShack-University-Project/1.0' } }
    );
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`OSRM error ${response.status}: ${text}`);
    }
    const route = await response.json();

    return {
        distanceKm: route.routes[0].distance / 1000,
        durationMin: route.routes[0].duration / 60
    };
}

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Ordini del cliente loggato
 *     description: |
 *       Ritorna gli ordini del cliente autenticato, popolati con dati ristorante e nome piatti.
 *       Filtrabile per periodo via query param `period`.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: period
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [today, past]
 *         description: |
 *           - `today`: solo ordini di oggi
 *           - `past`: tutti gli ordini precedenti a oggi
 *           - omesso: tutti gli ordini
 *     responses:
 *       200:
 *         description: Array di ordini, ordinati per data discendente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       401:
 *         description: Token mancante o non valido
 *       500:
 *         description: Errore server
 */
router.get('/', auth, async (req, res) => {
    try {
        const filter = { user: req.user.id };

        if (req.query.period === 'today' || req.query.period === 'past') {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            if (req.query.period === 'today') {
                filter.date = { $gte: startOfDay };
            } else {
                filter.date = { $lt: startOfDay };
            }
        }

        const orders = await Order.find(filter)
            .sort({ date: -1 })
            .populate('restaurant', 'name address')
            .populate('items.menuItem', 'strMeal strMealThumb');
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero degli ordini' });
    }
});

/**
 * @swagger
 * /api/orders/restaurant:
 *   get:
 *     summary: Ordini ricevuti dal ristoratore loggato
 *     description: Ritorna gli ordini del ristorante associato all'utente autenticato. Filtrabile per giorno.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: date
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtra gli ordini per giorno specifico (YYYY-MM-DD). Default oggi
 *     responses:
 *       200:
 *         description: Array di ordini ricevuti, ordinati per data discendente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 *       401:
 *         description: Token mancante o non valido
 *       404:
 *         description: Ristorante non trovato per l'utente
 *       500:
 *         description: Errore server
 */
router.get('/restaurant', auth, async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user.id });
        if (!restaurant) return res.status(404).json({ error: 'Ristorante non trovato' });

        const baseDate = req.query.date ? new Date(req.query.date) : new Date();
        const startOfDay = new Date(baseDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(baseDate);
        endOfDay.setHours(23, 59, 59, 999);

        const orders = await Order.find({
            restaurant: restaurant._id,
            date: { $gte: startOfDay, $lte: endOfDay }
        })
        .sort({ date: -1 })
        .populate('items.menuItem', 'strMeal');

        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero degli ordini' });
    }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Dettaglio singolo ordine
 *     description: |
 *       Ritorna l'ordine. Accessibile dal cliente proprietario dell'ordine
 *       o dal ristoratore proprietario del ristorante che ha ricevuto l'ordine.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB dell'ordine
 *     responses:
 *       200:
 *         description: Ordine trovato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       401:
 *         description: Token mancante o non valido
 *       403:
 *         description: Non autorizzato
 *       404:
 *         description: Ordine non trovato
 *       500:
 *         description: Errore server
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('restaurant', 'name address owner')
            .populate('items.menuItem', 'strMeal strMealThumb');
        if (!order) return res.status(404).json({ error: 'Ordine non trovato' });

        // Permesso: cliente proprietario OPPURE ristoratore proprietario del ristorante
        const isCustomer = order.user.toString() === req.user.id;
        const isOwner = order.restaurant.owner && order.restaurant.owner.toString() === req.user.id;
        if (!isCustomer && !isOwner) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero dell\'ordine' });
    }
});

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Crea un nuovo ordine
 *     description: |
 *       Il cliente autenticato crea un ordine. Per consegna a domicilio (`delivery.dove = "domicilio"`)
 *       il server calcola il costo aggiuntivo via Nominatim + OSRM (50 cent/km). Domicilio richiede almeno 2 persone.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [restaurant, items, people, delivery]
 *             properties:
 *               restaurant:
 *                 type: string
 *                 description: ID MongoDB del ristorante
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/OrderItem'
 *               people:
 *                 type: integer
 *                 minimum: 1
 *               delivery:
 *                 type: object
 *                 required: [dove]
 *                 properties:
 *                   dove:
 *                     type: string
 *                     enum: [ristorante, domicilio]
 *                   indirizzo:
 *                     type: string
 *                     description: Richiesto se dove = domicilio
 *     responses:
 *       201:
 *         description: Ordine creato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Validazione fallita (es. domicilio con < 2 persone)
 *       401:
 *         description: Token mancante o non valido
 *       500:
 *         description: Errore server (incluso fallimento geocoding/routing)
 */
router.post('/', auth, async (req, res) => {
    try {
        const { restaurant, items, people, delivery } = req.body;

        // Validazione: domicilio solo per 2+ persone
        if (delivery.dove === 'domicilio' && people < 2) {
            return res.status(400).json({ error: 'Consegna a domicilio disponibile solo per almeno 2 persone' });
            console.log('Calling OSRM:', rest.address, '->', delivery.indirizzo);

        }

        let delivery_cost = 0;

        if (delivery.dove === 'domicilio') {
            const rest = await Restaurant.findById(restaurant);
            console.log('Calling OSRM:', rest.address, '->', delivery.indirizzo);
            const route = await getRouteDistance(rest.address, delivery.indirizzo);
            //  calcola il costo della consegna a domicilio 50cent per km
            delivery_cost = Math.round(route.distanceKm * 0.5 * 100) / 100;
        }

        const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

        const order = await Order.create({
            user: req.user.id,
            restaurant,
            items,
            total: total + delivery_cost,
            delivery_cost,
            people,
            status: 'ordinato',
            delivery
        });

        res.status(201).json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nella creazione dell\'ordine' });
    }
});

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Aggiorna lo stato di un ordine
 *     description: |
 *       Cambia lo stato di un ordine. Permessi:
 *       - `consegnato` può essere settato solo dal cliente proprietario dell'ordine
 *       - Stati intermedi (`in_preparazione`, `in_consegna`) solo dal ristoratore proprietario del ristorante
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB dell'ordine
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ordinato, in_preparazione, in_consegna, consegnato]
 *     responses:
 *       200:
 *         description: Ordine aggiornato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       401:
 *         description: Token mancante o non valido
 *       403:
 *         description: Non autorizzato a cambiare questo stato per questo ordine
 *       404:
 *         description: Ordine non trovato
 *       500:
 *         description: Errore server
 */
router.put('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.id);  // ← solo lettura
        if (!order) return res.status(404).json({ error: 'Ordine non trovato' });

        // Controllo permessi PRIMA di salvare
        if (status === 'consegnato') {
            if (order.user.toString() !== req.user.id) {
                return res.status(403).json({ error: 'Solo il cliente può confermare la consegna' });
            }
        } else {
            const restaurant = await Restaurant.findById(order.restaurant);
            if (!restaurant || restaurant.owner.toString() !== req.user.id) {
                return res.status(403).json({ error: 'Non autorizzato' });
            }
        }

        order.status = status;       // ← salva solo dopo i check
        await order.save();
        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nell\'aggiornamento dell\'ordine' });
    }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Cancella un ordine
 *     description: |
 *       Cancella un ordine. Permessi:
 *       - Solo il cliente proprietario o il ristoratore proprietario del ristorante
 *       - Consentito **solo** se lo stato è ancora `ordinato` (non si può cancellare
 *         un ordine già `in_preparazione`, `in_consegna` o `consegnato`)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID MongoDB dell'ordine
 *     responses:
 *       200:
 *         description: Ordine cancellato
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       400:
 *         description: Ordine già in preparazione, non più cancellabile
 *       401:
 *         description: Token mancante o non valido
 *       403:
 *         description: Non autorizzato
 *       404:
 *         description: Ordine non trovato
 *       500:
 *         description: Errore server
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Ordine non trovato' });

        // Permesso: cliente proprietario OPPURE ristoratore proprietario del ristorante
        const isCustomer = order.user.toString() === req.user.id;
        let isOwner = false;
        if (!isCustomer) {
            const restaurant = await Restaurant.findById(order.restaurant);
            isOwner = !!restaurant && restaurant.owner.toString() === req.user.id;
        }
        if (!isCustomer && !isOwner) {
            return res.status(403).json({ error: 'Non autorizzato' });
        }

        // Non si può cancellare se l'ordine è già in lavorazione o oltre
        if (order.status !== 'ordinato') {
            return res.status(400).json({
                error: 'Non puoi cancellare un ordine già in preparazione o successivo'
            });
        }

        await Order.findByIdAndDelete(req.params.id);
        res.json({ message: 'Ordine cancellato' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nella cancellazione dell\'ordine' });
    }
});

module.exports = router;
