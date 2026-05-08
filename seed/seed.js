const bcrypt = require('bcrypt');
const Meal = require('../models/Meal');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const meals = require('../meals 1.json');

const RESTAURANTS_SEED = [
    {
        owner: { name: 'Mario Surf', email: 'mario@surfshack.it', usrType: 'ristoratore' },
        restaurant: {
            name: 'SurfShack Lerici',
            address: 'Via Marina 12, Lerici (SP)',
            phone: '0187 123456',
            piva: '12345678901',
            description: 'Surf food sul golfo dei poeti, dove le onde incontrano il sapore',
            image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'
        },
        // I MenuItems vengono presi dal catalogo Meals dove strCategory o strArea matchano
        cuisines: ['Beef', 'Chicken']
    },
    {
        owner: { name: 'Luigi Romano', email: 'luigi@pizzeriaroma.it', usrType: 'ristoratore' },
        restaurant: {
            name: 'Pizzeria Roma',
            address: 'Via Aurelia 45, La Spezia',
            phone: '0187 567890',
            piva: '23456789012',
            description: 'Pizza napoletana cotta in forno a legna e pasta fresca fatta in casa',
            image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800'
        },
        cuisines: ['Pasta', 'Italian']
    },
    {
        owner: { name: 'Yuki Tanaka', email: 'yuki@tokyosushi.it', usrType: 'ristoratore' },
        restaurant: {
            name: 'Tokyo Sushi Bar',
            address: 'Via Garibaldi 8, Sarzana (SP)',
            phone: '0187 234567',
            piva: '34567890123',
            description: 'Cucina giapponese autentica con pesce fresco del golfo',
            image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800'
        },
        cuisines: ['Seafood', 'Japanese']
    },
    {
        owner: { name: 'Raj Kumar', email: 'raj@currypalace.it', usrType: 'ristoratore' },
        restaurant: {
            name: 'Curry Palace',
            address: 'Corso Cavour 23, La Spezia',
            phone: '0187 345678',
            piva: '45678901234',
            description: 'Ristorante indiano con specialità curry e tandoori',
            image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800'
        },
        cuisines: ['Indian', 'Chicken']
    },
    {
        owner: { name: 'Dimitri Papadopoulos', email: 'dimitri@taverna.it', usrType: 'ristoratore' },
        restaurant: {
            name: 'Greek Taverna',
            address: 'Piazza del Mercato 5, Lerici (SP)',
            phone: '0187 456789',
            piva: '56789012345',
            description: 'Cucina greca tradizionale: souvlaki, moussaka e baklava',
            image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800'
        },
        cuisines: ['Lamb', 'Greek']
    }
];

const seedMeals = async () => {
    if (await Meal.countDocuments() > 0) {
        console.log('Meals already seeded');
        return;
    }
    try {
        const cleanMeals = meals.map(({ _id, ...rest }) => rest);
        await Meal.insertMany(cleanMeals);
        console.log('Meals seeded successfully');
    } catch (error) {
        console.error('Error seeding meals:', error);
    }
};

const seedRestaurants = async () => {
    try {
        const password = await bcrypt.hash('test1234', 10);
        let added = 0;
        let skipped = 0;

        for (const data of RESTAURANTS_SEED) {
            // Check per email: se l'utente esiste già, skippa (idempotente per entry)
            const existingUser = await User.findOne({ email: data.owner.email });
            if (existingUser) {
                skipped++;
                continue;
            }

            // 1. Crea l'utente proprietario
            const user = await User.create({ ...data.owner, password });

            // 2. Crea il ristorante con owner = utente appena creato
            const restaurant = await Restaurant.create({
                ...data.restaurant,
                owner: user._id
            });

            // 3. Trova ~5 piatti dal catalogo che matchano le cucine del ristorante
            const cuisineMeals = await Meal.find({
                $or: [
                    { strCategory: { $in: data.cuisines } },
                    { strArea:     { $in: data.cuisines } }
                ]
            }).limit(5);

            // 4. Crea un MenuItem per ognuno
            for (const meal of cuisineMeals) {
                await MenuItem.create({
                    restaurant: restaurant._id,
                    idMeal: meal.idMeal,
                    strMeal: meal.strMeal,
                    strCategory: meal.strCategory,
                    strArea: meal.strArea,
                    strInstructions: meal.strInstructions,
                    strMealThumb: meal.strMealThumb,
                    strTags: meal.strTags,
                    ingredients: meal.ingredients,
                    measures: meal.measures,
                    price: Math.round((8 + Math.random() * 12) * 100) / 100
                });
            }

            console.log(`Seeded ${restaurant.name} with ${cuisineMeals.length} menu items`);
            added++;
        }
        console.log(`Restaurant seed: ${added} aggiunti, ${skipped} già presenti`);
    } catch (error) {
        console.error('Error seeding restaurants:', error);
    }
};

const seed = async () => {
    await seedMeals();
    await seedRestaurants();
};

module.exports = seed;
