const router = require('express').Router();

router.use('/auth', require('./auth'));
// aggiungerai poi:
// router.use('/restaurants', require('./restaurants'));
// router.use('/meals', require('./meals'));
// router.use('/orders', require('./orders'));
// router.use('/stats', require('./stats'));

module.exports = router;