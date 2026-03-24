const router = require('express').Router();

router.use('/auth', require('./auth'));
router.use('/restaurants', require('./restaurants'));
//monta le rotte definite in meals.js
router.use('/meals', require('./meals'));
// router.use('/meals', require('./meals'));
// router.use('/menu-items', require('./menuItems'));
// router.use('/orders', require('./orders'));
// router.use('/stats', require('./stats'));

module.exports = router;