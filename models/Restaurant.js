const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    address: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true
    },
    menu: [{
        meal: { type: mongoose.Schema.Types.ObjectId, ref: 'Meal' },
        prezzo: Number,
        disponibile: { type: Boolean, default: true }
    }]
});

module.exports = mongoose.model('Restaurant', restaurantSchema);