const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    items: [{
        menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
    }],
    total: { type: Number, required: true },
    status: { 
        type: String,
        enum: ['ordinato', 'in_preparazione', 'in_consegna', 'consegnato'], //['ordinato', 'in_preparazione', 'in_consegna', 'consegnato ', 'cliente'], 
        required: true },
    date: { type: Date, default: Date.now },
    people: { type: Number, required: true, min: 1},
    delivery: {
        dove: { type: String,
                enum: ['ristorante', 'domicilio'],
                required: true},
        indirizzo: String},
    delivery_cost: { type: Number }
});

module.exports = mongoose.model('Order', orderSchema);