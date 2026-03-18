// POST /api/auth/register
// - Riceve nome, email, password, tipo
// - Hash password con bcrypt
// - Salva utente nel DB
// - Genera JWT con jwt.sign({ id, email, tipo }, JWT_SECRET)
// - Risponde con { token, user: { nome, email, tipo } }

const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');


router.post('/register', async (req, res) => {
    try {
        const { name, email, password, usrType } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword, usrType });
        const token = jwt.sign({ id: user.id, email: user.email, name: user.name, usrType: user.usrType }, process.env.JWT_SECRET);
        res.json({ token, user: { name, email, usrType } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore durante la registrazione' });
    }
});

router.put('/profile', auth, async (req, res) => {
    try {
        const { name, email } = req.body;
        const user = await User.findByIdAndUpdate( req.user.id , { name, email }, { new: true });
        const token = jwt.sign({ id: user.id, email: user.email, name: user.name, usrType: user.usrType }, process.env.JWT_SECRET);
        res.json({ token, user: { name, email, usrType } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore durante la modifica del profilo' });
    }
});

router.put('/password', auth, async (req, res) => {
    try {
        const {oldPassword, newPassword, } = req.body;
        const user = await User.findById(req.user.id);
        const match = await bcrypt.compare(oldPassword, user.password);
        if (!match) return res.status(401).json({ error: 'Password errata' });
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        res.json({ message: 'Password aggiornata' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore durante la modifica della password' });
    }
});

router.delete('/delete', auth, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user.id);
        res.json({ message: 'Account cancellato' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore durante la cancellazione dell\'account' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Email non trovata' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Password errata' });

        const token = jwt.sign({ id: user.id, email: user.email, name: user.name, usrType: user.usrType }, process.env.JWT_SECRET);
        res.json({ token, user: { name: user.name, email: user.email, usrType: user.usrType } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore durante il login' });
    }
});


module.exports = router;