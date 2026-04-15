// backend/src/routes/community.js

const express = require('express');
const {
    getAllChannels,
    getChannel,
    createChannel,
    joinChannel,
    leaveChannel,
    getOwnerPosts,
    createOwnerPost,
    togglePinPost,
    getCommunityFeed,
    createCommunityMessage,
    deleteCommunityMessage,
} = require('../controllers/communityController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Channels
router.get('/', requireAuth, getAllChannels);
router.post('/', requireAuth, createChannel);
router.get('/:channelId', requireAuth, getChannel);

// Membership
router.post('/:channelId/join', requireAuth, joinChannel);
router.delete('/:channelId/join', requireAuth, leaveChannel);

// Owner posts
router.get('/:channelId/posts', requireAuth, getOwnerPosts);
router.post('/:channelId/posts', requireAuth, createOwnerPost);
router.patch('/:channelId/posts/:postId/pin', requireAuth, togglePinPost);

// Community feed
router.get('/:channelId/feed', requireAuth, getCommunityFeed);
router.post('/:channelId/feed', requireAuth, createCommunityMessage);
router.delete('/:channelId/feed/:messageId', requireAuth, deleteCommunityMessage);

module.exports = router;