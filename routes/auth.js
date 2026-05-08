const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registra un nuovo utente
 *     description: Crea un nuovo account, hasha la password e ritorna il JWT da usare per autenticazione
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, usrType]
 *             properties:
 *               name:     { type: string }
 *               email:    { type: string, format: email }
 *               password: { type: string, format: password }
 *               usrType:
 *                 type: string
 *                 enum: [cliente, ristoratore]
 *     responses:
 *       200:
 *         description: Utente creato e loggato
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       500:
 *         description: Errore server (es. email già esistente)
 */
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

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Profilo dell'utente loggato
 *     description: Ritorna il profilo dell'utente autenticato (senza password)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dati profilo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Token mancante o non valido
 *       500:
 *         description: Errore server
 */
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore nel recupero del profilo' });
    }
})

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Aggiorna il profilo dell'utente loggato
 *     description: Aggiorna i campi del profilo e ritorna un nuovo JWT con i dati aggiornati
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:    { type: string }
 *               email:   { type: string, format: email }
 *               phone:   { type: string }
 *               address:
 *                 type: object
 *                 properties:
 *                   street:    { type: string }
 *                   city:      { type: string }
 *                   province:  { type: string }
 *                   zip:       { type: string }
 *                   country:   { type: string }
 *                   formatted: { type: string }
 *               credit_card:
 *                 type: object
 *                 properties:
 *                   holder:     { type: string }
 *                   number:     { type: string }
 *                   expiration: { type: string }
 *                   cvv:        { type: string }
 *               preferenze:
 *                 type: object
 *                 properties:
 *                   cucina:  { type: array, items: { type: string } }
 *                   offerte: { type: boolean }
 *     responses:
 *       200:
 *         description: Profilo aggiornato e nuovo token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Token mancante o non valido
 *       500:
 *         description: Errore server
 */
router.put('/profile', auth, async (req, res) => {
    try {
        const { name, email, address, credit_card, preferenze, phone } = req.body;
        const user = await User.findByIdAndUpdate( req.user.id ,
            { name, email, address, credit_card, preferenze, phone },
            { returnDocument: 'after' });
        const token = jwt.sign({ id: user.id, email: user.email, name: user.name, usrType: user.usrType }, process.env.JWT_SECRET);
        res.json({ token, user: { name, email, usrType: user.usrType } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore durante la modifica del profilo' });
    }
});

/**
 * @swagger
 * /api/auth/password:
 *   put:
 *     summary: Cambia la password
 *     description: Verifica la vecchia password e setta quella nuova (hashata)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword: { type: string, format: password }
 *               newPassword: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Password aggiornata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       401:
 *         description: Vecchia password errata o token non valido
 *       500:
 *         description: Errore server
 */
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

/**
 * @swagger
 * /api/auth/delete:
 *   delete:
 *     summary: Cancella il proprio account
 *     description: Cancella definitivamente l'utente autenticato dal database
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account cancellato
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       401:
 *         description: Token mancante o non valido
 *       500:
 *         description: Errore server
 */
router.delete('/delete', auth, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user.id);
        res.json({ message: 'Account cancellato' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Errore durante la cancellazione dell\'account' });
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Effettua il login
 *     description: Verifica email + password e ritorna un JWT da usare come Bearer token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login riuscito
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Email non trovata o password errata
 *       500:
 *         description: Errore server
 */
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
