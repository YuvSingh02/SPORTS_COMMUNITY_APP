// frontend/src/services/communityService.js

import api from './api';

export const fetchAllChannels = () => api.get('/community');
export const fetchChannel = (channelId) => api.get(`/community/${channelId}`);

// UPDATED: now accepts cover_url
export const createChannel = (name, description, avatar_url, cover_url) =>
    api.post('/community', { name, description, avatar_url, cover_url });

export const joinChannel = (channelId) => api.post(`/community/${channelId}/join`);
export const leaveChannel = (channelId) => api.delete(`/community/${channelId}/join`);

export const fetchOwnerPosts = (channelId) => api.get(`/community/${channelId}/posts`);
export const createOwnerPost = (channelId, content, image_url = null) =>
    api.post(`/community/${channelId}/posts`, { content, image_url });
export const togglePinPost = (channelId, postId) =>
    api.patch(`/community/${channelId}/posts/${postId}/pin`);

export const fetchCommunityFeed = (channelId, page = 1, limit = 20) =>
    api.get(`/community/${channelId}/feed`, { params: { page, limit } });
export const createCommunityMessage = (channelId, message, parent_id = null, image_url = null) =>
    api.post(`/community/${channelId}/feed`, { message, parent_id, image_url });
export const deleteCommunityMessage = (channelId, messageId) =>
    api.delete(`/community/${channelId}/feed/${messageId}`);