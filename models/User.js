const { type } = require('express/lib/response');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    usrType: {
        type: String,
        enum: ['ristoratore', 'cliente'],
        required: true
    },
    address: {
        street: { type: String, default: '' },        // via e numero civico, es. "Via Roma 15"
        city: { type: String, default: '' },           // es. "Roma"
        province: { type: String, default: '' },       // es. "RM"
        zip: { type: String, default: '' },            // CAP, es. "00100"
        country: { type: String, default: 'IT' },      // codice paese ISO 3166-1
        formatted: { type: String, default: '' },      // indirizzo completo formattato, es. "Via Roma 15, 00100 Roma RM, Italy"
        location: {                                     // coordinate GPS
            lat: { type: Number },
            lng: { type: Number }
        }
    },
    phone: {
        type: String,
        default: ''
    },
    credit_card: {
        holder: { type: String, default: '' },
        number: { type: String, default: '' },
        expiration: { type: String, default: '' },
        cvv: { type: String, default: '' }
    },
    preferenze: {
        categorie: { type: [String], default: [] },
        offerte: { type: Boolean, default: false } 
    }
});

module.exports = mongoose.model('User', userSchema);