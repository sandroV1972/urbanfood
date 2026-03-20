const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    baseMeal: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal', default: null },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    ingredients: [String],
    description: String,
    image: String,
    available: { type: Boolean, default: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
