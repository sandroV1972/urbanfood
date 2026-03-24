const Meal = require('../models/Meal');
const meals = require('../meals 1.json');

const seedMeals = async () => {
    const count = await Meal.countDocuments();
    if (count > 0) {
        console.log('Meals already seeded');
        return;
    } else {
        try {
            const cleanMeals = meals.map(({ _id, ...rest }) => rest);
            await Meal.insertMany(cleanMeals);
            console.log('Meals seeded successfully');
        } catch (error) {
            console.error('Error seeding meals:', error);
        }
    }
};

module.exports = seedMeals;