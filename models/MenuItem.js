const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    idMeal: String,
    strMeal: { type: String, required: true },
    strMealAlternate: String,
    strCategory: String,
    strArea: String,
    strInstructions: String,
    strMealThumb: String,
    strTags: String,
    strYoutube: String,
    strSource: String,
    strImageSource: String,
    strCreativeCommonsConfirmed: String,
    dateModified: String,
    ingredients: [String],
    measures: [String],
    price: { type: Number, required: true },
    available: { type: Boolean, default: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
