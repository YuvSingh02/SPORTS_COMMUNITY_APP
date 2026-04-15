const express = require('express');
const router = express.Router();
const { registerProfile, getMyProfile, updateProfile } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/register', requireAuth, registerProfile);
router.get('/profile', requireAuth, getMyProfile);
router.patch('/profile', requireAuth, updateProfile);

module.exports = router;