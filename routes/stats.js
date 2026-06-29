const router = require('express').Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Review = require('../models/Reviews');
const auth = require('../middleware/auth');

/**
 * @swagger
 * /api/stats/restaurant:
 *   get:
 *     summary: Statistiche del ristorante del ristoratore loggato
 *     description: |
 *       Aggrega vari KPI dagli ordini ricevuti dal ristorante associato all'utente
 *       autenticato: totale ordini, fatturato, top piatti, ordini per stato,
 *       rating medio, andamento fatturato ultimi 7 giorni.
 *     tags: [Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Oggetto con statistiche aggregate
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalOrders:    { type: integer }
 *                 totalRevenue:   { type: number }
 *                 avgOrderValue:  { type: number }
 *                 ordersByStatus:
 *                   type: object
 *                   additionalProperties: { type: integer }
 *                 topDishes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:     { type: string }
 *                       quantity: { type: integer }
 *                       revenue:  { type: number }
 *                 averageRating: { type: number }
 *                 totalReviews:  { type: integer }
 *                 revenueLast7Days:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:    { type: string, format: date }
 *                       revenue: { type: number }
 *       401:
 *         description: Token mancante o non valido
 *       404:
 *         description: Ristorante non trovato per l'utente
 *       500:
 *         description: Errore server
 */
router.get('/restaurant', auth, async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Token mancante o non valido' });
        
        const restaurant = await Restaurant.findOne({ owner: req.user.id });
        if (!restaurant) return res.status(404).json({ error: 'Ristorante non trovato' });

        const restaurantId = restaurant._id;

        // Totale ordini + fatturato
        const totals = await Order.aggregate([
            { $match: { restaurant: restaurantId } },
            { $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$total' }
            } }
        ]);
        const totalOrders = totals[0]?.totalOrders || 0;
        const totalRevenue = totals[0]?.totalRevenue || 0;
        const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

        // Ordini per stato
        const byStatus = await Order.aggregate([
            { $match: { restaurant: restaurantId } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const ordersByStatus = {};
        byStatus.forEach(s => ordersByStatus[s._id] = s.count);

        // Top 5 piatti più venduti (per quantity)
        const topDishes = await Order.aggregate([
            { $match: { restaurant: restaurantId } },
            { $unwind: '$items' },
            { $group: {
                _id: '$items.menuItem',
                quantity: { $sum: '$items.quantity' },
                revenue:  { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
            } },
            { $sort: { quantity: -1 } },
            { $limit: 5 },
            { $lookup: {
                from: 'menuitems',
                localField: '_id',
                foreignField: '_id',
                as: 'menuItem'
            } },
            { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
            { $project: {
                _id: 0,
                name: { $ifNull: ['$menuItem.strMeal', 'Piatto'] },
                quantity: 1,
                revenue:  { $round: ['$revenue', 2] }
            } }
        ]);

        // Rating medio + numero recensioni
        const reviewsAgg = await Review.aggregate([
            { $match: { restaurant: restaurantId } },
            { $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews:  { $sum: 1 }
            } }
        ]);
        const averageRating = reviewsAgg[0]
            ? Math.round(reviewsAgg[0].averageRating * 10) / 10
            : 0;
        const totalReviews = reviewsAgg[0]?.totalReviews || 0;

        // Fatturato ultimi 7 giorni (raggruppato per giorno)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const revenueByDay = await Order.aggregate([
            { $match: {
                restaurant: restaurantId,
                date: { $gte: sevenDaysAgo }
            } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                revenue: { $sum: '$total' }
            } },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: '$_id', revenue: { $round: ['$revenue', 2] } } }
        ]);

        // Riempi i giorni mancanti con revenue 0 per avere 7 punti continui
        const revenueLast7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const found = revenueByDay.find(r => r.date === dateStr);
            revenueLast7Days.push({ date: dateStr, revenue: found ? found.revenue : 0 });
        }

        res.json({
            totalOrders,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            avgOrderValue: Math.round(avgOrderValue * 100) / 100,
            ordersByStatus,
            topDishes,
            averageRating,
            totalReviews,
            revenueLast7Days
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
    }
});

module.exports = router;
