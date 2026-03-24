const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    baseMeal: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal', default: null },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: String,
    area: String,
    description: String,
    ingredients: [String],
    measures: [String],
    image: String,
    tags: String,
    youtube: String,
    source: String,
    available: { type: Boolean, default: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
