const OfferSchema = require('mongoose').Schema;
const mongoose = require('mongoose');

const offerSchema = new OfferSchema({
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    description: { type: String, required: true },
    discount: { type: Number, required: true, min: 0, max: 100 },
    category: { type: String, required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('Offer', offerSchema);  
