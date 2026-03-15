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
    }
});

module.exports = mongoose.model('User', userSchema);