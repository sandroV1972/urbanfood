const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    piva: { type: String, required: true },
    description: String,
    image: String
}, {
    timestamps: true
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
