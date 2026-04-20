const router = require('express').Router();
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const auth = require('../middleware/auth');

// Calcola distanza su strada tra due indirizzi usando Nominatim + OSRM
async function getRouteDistance(fromAddress, toAddress) {
    const geocode = async (address) => {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
        );
        const data = await response.json();
        if (data.length === 0) throw new Error('Indirizzo non trovato: ' + address);
        return { lat: data[0].lat, lon: data[0].lon };
    };

    const from = await geocode(fromAddress);
    const to = await geocode(toAddress);

    const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`
    );
    const route = await response.json();

    return {
        distanceKm: route.routes[0].distance / 1000,
        durationMin: route.routes[0].duration / 60
    };
}

// GET /api/orders - ordini del cliente loggato
router.get('/', auth, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id }).sort({ date: -1 });
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero degli ordini' });
    }
});

// GET /api/orders/restaurant - ordini ricevuti dal ristoratore
router.get('/restaurant', auth, async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user.id });
        if (!restaurant) return res.status(404).json({ error: 'Ristorante non trovato' });

        const orders = await Order.find({ restaurant: restaurant._id }).sort({ date: -1 });
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero degli ordini' });
    }
});

// POST /api/orders - cliente crea un nuovo ordine
router.post('/', auth, async (req, res) => {
    try {
        const { restaurant, items, people, delivery } = req.body;

        // Validazione: domicilio solo per 2+ persone
        if (delivery.dove === 'domicilio' && people < 2) {
            return res.status(400).json({ error: 'Consegna a domicilio disponibile solo per almeno 2 persone' });
        }

        let delivery_cost = 0;

        if (delivery.dove === 'domicilio') {
            const rest = await Restaurant.findById(restaurant);
            const route = await getRouteDistance(rest.address, delivery.indirizzo);
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

// PUT /api/orders/:id/status - ristoratore aggiorna stato ordine
router.put('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { returnDocument: 'after' }
        );
        if (!order) return res.status(404).json({ error: 'Ordine non trovato' });
        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nell\'aggiornamento dell\'ordine' });
    }
});

module.exports = router;
