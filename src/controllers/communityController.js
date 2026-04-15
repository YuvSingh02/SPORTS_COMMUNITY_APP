// backend/src/controllers/communityController.js

const { getSupabaseClient } = require('../config/supabase');
const { sendSuccess, sendError, sendNotFound } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// ─── Channels ─────────────────────────────────────────────────────────────────

const getAllChannels = async (req, res) => {
    const supabase = getSupabaseClient();
    try {
        const { data, error } = await supabase
            .from('channels')
            .select('id, name, description, avatar_url, cover_url, subscribers, owner_id, created_at')
            .eq('is_active', true)
            .order('subscribers', { ascending: false });

        if (error) throw error;
        return sendSuccess(res, { channels: data });
    } catch (err) {
        logger.error('[getAllChannels]', err);
        return sendError(res, 'Failed to fetch communities');
    }
};

const getChannel = async (req, res) => {
    const supabase = getSupabaseClient();
    const userId = req.user.id;
    const { channelId } = req.params;

    try {
        const { data: channel, error } = await supabase
            .from('channels')
            .select('*')
            .eq('id', channelId)
            .single();

        if (error || !channel) return sendNotFound(res, 'Community not found');

        const { data: membership } = await supabase
            .from('channel_members')
            .select('id')
            .eq('channel_id', channelId)
            .eq('user_id', userId)
            .single();

        return sendSuccess(res, {
            channel,
            is_member: !!membership,
            is_owner: channel.owner_id === userId,
        });
    } catch (err) {
        logger.error('[getChannel]', err);
        return sendError(res, 'Failed to fetch community');
    }
};

const createChannel = async (req, res) => {
    const supabase = getSupabaseClient();
    const userId = req.user.id;
    const { name, description, avatar_url, cover_url } = req.body;

    if (!name?.trim()) return sendError(res, 'Community name is required', 400);

    try {
        const { data, error } = await supabase
            .from('channels')
            .insert({
                name: name.trim(),
                description: description?.trim() ?? null,
                avatar_url: avatar_url ?? null,
                cover_url: cover_url ?? null,
                owner_id: userId,
            })
            .select()
            .single();

        if (error) throw error;

        // Auto-join the creator
        await supabase.from('channel_members').insert({
            channel_id: data.id,
            user_id: userId,
        });

        return sendSuccess(res, { channel: data }, 'Community created');
    } catch (err) {
        logger.error('[createChannel]', err);
        return sendError(res, 'Failed to create community');
    }
};

// ─── Membership ───────────────────────────────────────────────────────────────

const joinChannel = async (req, res) => {
    const supabase = getSupabaseClient();
    const userId = req.user.id;
    const { channelId } = req.params;

    try {
        const { error } = await supabase
            .from('channel_members')
            .insert({ channel_id: channelId, user_id: userId });

        if (error?.code === '23505') return sendError(res, 'Already a member', 400);
        if (error) throw error;

        await supabase.rpc('increment_subscribers', { p_channel_id: channelId });

        return sendSuccess(res, null, 'Joined community');
    } catch (err) {
        logger.error('[joinChannel]', err);
        return sendError(res, 'Failed to join community');
    }
};

const leaveChannel = async (req, res) => {
    const supabase = getSupabaseClient();
    const userId = req.user.id;
    const { channelId } = req.params;

    try {
        const { error } = await supabase
            .from('channel_members')
            .delete()
            .eq('channel_id', channelId)
            .eq('user_id', userId);

        if (error) throw error;

        await supabase.rpc('decrement_subscribers', { p_channel_id: channelId });

        return sendSuccess(res, null, 'Left community');
    } catch (err) {
        logger.error('[leaveChannel]', err);
        return sendError(res, 'Failed to leave community');
    }
};

// ─── Owner Posts ──────────────────────────────────────────────────────────────

const getOwnerPosts = async (req, res) => {
    const supabase = getSupabaseClient();
    const { channelId } = req.params;

    try {
        const { data, error } = await supabase
            .from('channel_posts')
            .select(`
                id, content, image_url, is_pinned, likes_count, created_at,
                users ( id, name )
            `)
            .eq('channel_id', channelId)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return sendSuccess(res, { posts: data });
    } catch (err) {
        logger.error('[getOwnerPosts]', err);
        return sendError(res, 'Failed to fetch owner posts');
    }
};

const createOwnerPost = async (req, res) => {
    const supabase = getSupabaseClient();
    const userId = req.user.id;
    const { channelId } = req.params;
    const { content, image_url } = req.body;

    // FIX: allow image-only posts
    if (!content?.trim() && !image_url) {
        return sendError(res, 'Post content or image is required', 400);
    }

    try {
        const { data: channel } = await supabase
            .from('channels')
            .select('owner_id')
            .eq('id', channelId)
            .single();

        if (!channel || channel.owner_id !== userId) {
            return sendError(res, 'Only the community owner can post here', 403);
        }

        const { data, error } = await supabase
            .from('channel_posts')
            .insert({
                channel_id: channelId,
                user_id: userId,
                content: content?.trim() ?? '',
                image_url: image_url ?? null,
            })
            .select()
            .single();

        if (error) throw error;
        return sendSuccess(res, { post: data }, 'Post created');
    } catch (err) {
        logger.error('[createOwnerPost]', err);
        return sendError(res, 'Failed to create post');
    }
};

const togglePinPost = async (req, res) => {
    const supabase = getSupabaseClient();
    const userId = req.user.id;
    const { channelId, postId } = req.params;

    try {
        const { data: channel } = await supabase
            .from('channels')
            .select('owner_id')
            .eq('id', channelId)
            .single();

        if (!channel || channel.owner_id !== userId) {
            return sendError(res, 'Only the community owner can pin posts', 403);
        }

        const { data: post } = await supabase
            .from('channel_posts')
            .select('is_pinned')
            .eq('id', postId)
            .single();

        const { error } = await supabase
            .from('channel_posts')
            .update({ is_pinned: !post.is_pinned })
            .eq('id', postId);

        if (error) throw error;
        return sendSuccess(res, { is_pinned: !post.is_pinned });
    } catch (err) {
        logger.error('[togglePinPost]', err);
        return sendError(res, 'Failed to toggle pin');
    }
};

// ─── Community Feed ───────────────────────────────────────────────────────────

const getCommunityFeed = async (req, res) => {
    const supabase = getSupabaseClient();
    const { channelId } = req.params;
    const page = parseInt(req.query.page ?? 1, 10);
    const limit = parseInt(req.query.limit ?? 20, 10);
    const from = (page - 1) * limit;

    try {
        const { data, error } = await supabase
            .from('discussion_msgs')
            .select(`
                id, message, image_url, likes_count, created_at,
                users ( id, name )
            `)
            .eq('channel_id', channelId)
            .is('parent_id', null)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .range(from, from + limit - 1);

        if (error) throw error;
        return sendSuccess(res, { messages: data, page, limit });
    } catch (err) {
        logger.error('[getCommunityFeed]', err);
        return sendError(res, 'Failed to fetch community feed');
    }
};

const createCommunityMessage = async (req, res) => {
    const supabase = getSupabaseClient();
    const userId = req.user.id;
    const { channelId } = req.params;
    const { message, parent_id, image_url } = req.body;

    // FIX: allow image-only messages
    if (!message?.trim() && !image_url) {
        return sendError(res, 'Message or image is required', 400);
    }

    try {
        const { data, error } = await supabase
            .from('discussion_msgs')
            .insert({
                channel_id: channelId,
                user_id: userId,
                message: message?.trim() ?? '',
                parent_id: parent_id ?? null,
                image_url: image_url ?? null,   // FIX: was missing before
                is_deleted: false,
            })
            .select(`
                id, message, image_url, likes_count, created_at, parent_id,
                users ( id, name )
            `)
            .single();

        if (error) throw error;
        return sendSuccess(res, { message: data }, 'Message posted');
    } catch (err) {
        logger.error('[createCommunityMessage]', err);
        return sendError(res, 'Failed to post message');
    }
};

const deleteCommunityMessage = async (req, res) => {
    const supabase = getSupabaseClient();
    const userId = req.user.id;
    const { channelId, messageId } = req.params;

    try {
        const { data: channel } = await supabase
            .from('channels').select('owner_id').eq('id', channelId).single();

        const { data: msg } = await supabase
            .from('discussion_msgs').select('user_id').eq('id', messageId).single();

        if (!msg) return sendNotFound(res, 'Message not found');

        const isAuthor = msg.user_id === userId;
        const isOwner = channel?.owner_id === userId;

        if (!isAuthor && !isOwner) {
            return sendError(res, 'Not authorised to delete this message', 403);
        }

        const { error } = await supabase
            .from('discussion_msgs')
            .update({ is_deleted: true })
            .eq('id', messageId);

        if (error) throw error;
        return sendSuccess(res, null, 'Message deleted');
    } catch (err) {
        logger.error('[deleteCommunityMessage]', err);
        return sendError(res, 'Failed to delete message');
    }
};

module.exports = {
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
};