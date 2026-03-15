const mongoose = require('mongoose');

const mealSchema = new mongooseSchema({
    idMeal: String,
    strMeal: { type: String, required: true, unique: true }, //String,
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
    measures: [String]
}, {
  timestamps: true
});

module.exports = mongoose.model('Meal', mealSchema);