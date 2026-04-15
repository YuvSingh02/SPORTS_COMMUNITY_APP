// frontend/src/screens/community/ChannelScreen.js
//
// Full community page with two tabs:
//   - Owner Updates: owner-only posts with photo, pin support (max 5 pins)
//   - Community:     user discussion feed with photo support and threading
//
// Images uploaded to Supabase Storage bucket: community-images

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, SafeAreaView, StatusBar,
  TextInput, Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import {
  fetchChannel, joinChannel, leaveChannel,
  fetchOwnerPosts, createOwnerPost, togglePinPost,
  fetchCommunityFeed, createCommunityMessage, deleteCommunityMessage,
} from '../../services/communityService';
import { supabase } from '../../services/supabase';
import useAuthStore from '../../store/authStore';
import { Colors, Typography, Spacing, Radius } from '../../constants/colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'owner', label: 'Owner Updates' },
  { key: 'community', label: 'Community' },
];

const MAX_PINS = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeAgo = (dateStr) => {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const uploadImage = async (asset, userId) => {
  const ext = asset.uri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    name: path,
    type: asset.mimeType ?? 'image/jpeg',
  });

  const { error } = await supabase.storage
    .from('community-images')
    .upload(path, formData, {
      contentType: asset.mimeType ?? 'image/jpeg',
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from('community-images').getPublicUrl(path);
  return data.publicUrl;
};

const pickImage = async () => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Permission required', 'Allow photo access to upload images.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: true,
  });
  if (result.canceled) return null;
  return result.assets[0];
};

// ─── AvatarCircle ─────────────────────────────────────────────────────────────

const AvatarCircle = ({ name = '', size = 36 }) => (
  <View style={[s.avatarCircle, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={[s.avatarCircleText, { fontSize: size * 0.42 }]}>
      {name.charAt(0).toUpperCase()}
    </Text>
  </View>
);

// ─── ChannelHeader ────────────────────────────────────────────────────────────

const ChannelHeader = ({ channel, isMember, isOwner, onJoin, onLeave, isJoining }) => (
  <View>
    {channel.cover_url
      ? <Image source={{ uri: channel.cover_url }} style={s.coverPhoto} resizeMode="cover" />
      : <View style={s.coverPhotoPlaceholder} />
    }

    <View style={s.header}>
      <View style={s.avatarWrapper}>
        {channel.avatar_url
          ? <Image source={{ uri: channel.avatar_url }} style={s.avatarImage} />
          : (
            <View style={s.avatarFallback}>
              <Text style={s.avatarFallbackText}>{channel.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )
        }
      </View>

      <View style={s.headerMeta}>
        <View style={s.nameRow}>
          <Text style={s.channelName}>{channel.name}</Text>
          {isOwner && (
            <View style={s.ownerPill}>
              <Text style={s.ownerPillText}>Owner</Text>
            </View>
          )}
        </View>
        {!!channel.description && (
          <Text style={s.channelDesc} numberOfLines={2}>{channel.description}</Text>
        )}
        <Text style={s.channelSubs}>
          {channel.subscribers?.toLocaleString()} member{channel.subscribers !== 1 ? 's' : ''}
        </Text>
      </View>

      {!isOwner && (
        isMember ? (
          <TouchableOpacity style={s.leaveBtn} onPress={onLeave} disabled={isJoining}>
            {isJoining
              ? <ActivityIndicator color={Colors.textSecondary} size="small" />
              : <Text style={s.leaveBtnText}>Leave</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.joinBtn} onPress={onJoin} disabled={isJoining}>
            {isJoining
              ? <ActivityIndicator color={Colors.bg} size="small" />
              : <Text style={s.joinBtnText}>Join</Text>}
          </TouchableOpacity>
        )
      )}
    </View>
  </View>
);

// ─── TabBar ───────────────────────────────────────────────────────────────────

const TabBar = ({ active, onSelect }) => (
  <View style={s.tabRow}>
    {TABS.map((t) => (
      <TouchableOpacity
        key={t.key}
        style={[s.tab, active === t.key && s.tabActive]}
        onPress={() => onSelect(t.key)}
        activeOpacity={0.8}
      >
        <Text style={[s.tabText, active === t.key && s.tabTextActive]}>
          {t.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ─── OwnerPostCard ────────────────────────────────────────────────────────────

const OwnerPostCard = ({ post, isOwner, pinnedCount, onPin, onDelete }) => {
  const canPin = post.is_pinned ? true : pinnedCount < MAX_PINS;

  return (
    <View style={[s.ownerCard, post.is_pinned && s.ownerCardPinned]}>
      {post.is_pinned && <Text style={s.pinnedLabel}>📌  Pinned</Text>}

      <View style={s.postHead}>
        <View style={s.postAuthorRow}>
          <Text style={s.ownerAuthorName}>{post.users?.name ?? 'Owner'}</Text>
          <View style={s.ownerTextBadge}>
            <Text style={s.ownerTextBadgeText}>Owner</Text>
          </View>
        </View>
        <Text style={s.postTime}>{timeAgo(post.created_at)}</Text>
      </View>

      {!!post.content && <Text style={s.postContent}>{post.content}</Text>}

      {!!post.image_url && (
        <Image source={{ uri: post.image_url }} style={s.postImage} resizeMode="cover" />
      )}

      <View style={s.postActions}>
        <Text style={s.postLikes}>♡  {post.likes_count ?? 0}</Text>
        {isOwner && (
          <>
            <TouchableOpacity onPress={() => canPin && onPin(post.id)} disabled={!canPin}>
              <Text style={[s.actionBtn, s.accentBtn, !canPin && s.actionBtnDim]}>
                {post.is_pinned ? 'Unpin' : `Pin${!canPin ? ' (max)' : ''}`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(post.id)}>
              <Text style={[s.actionBtn, s.dangerBtn]}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

// ─── MessageCard ──────────────────────────────────────────────────────────────

const MessageCard = ({ msg, currentUserId, isOwner, onReply, onDelete, isReply }) => {
  const canDelete = msg.users?.id === currentUserId || isOwner;
  const username = msg.users?.name ?? 'User';

  return (
    <View style={[s.msgCard, isReply && s.msgCardReply]}>
      <View style={s.msgTop}>
        {!isReply && <AvatarCircle name={username} size={32} />}
        <View style={[{ flex: 1 }, !isReply && { marginLeft: 10 }]}>
          <View style={s.postHead}>
            <Text style={s.msgAuthor}>{username}</Text>
            <Text style={s.postTime}>{timeAgo(msg.created_at)}</Text>
          </View>

          {!!msg.message && <Text style={s.msgContent}>{msg.message}</Text>}

          {!!msg.image_url && (
            <Image source={{ uri: msg.image_url }} style={s.postImage} resizeMode="cover" />
          )}

          {msg.replies?.length > 0 && (
            <View style={s.repliesContainer}>
              {msg.replies.map((reply) => (
                <MessageCard
                  key={reply.id}
                  msg={reply}
                  currentUserId={currentUserId}
                  isOwner={isOwner}
                  onReply={onReply}
                  onDelete={onDelete}
                  isReply
                />
              ))}
            </View>
          )}

          <View style={s.postActions}>
            <Text style={s.postLikes}>♡  {msg.likes_count ?? 0}</Text>
            {!isReply && (
              <TouchableOpacity onPress={() => onReply(msg)}>
                <Text style={[s.actionBtn, s.primaryBtn]}>Reply</Text>
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity onPress={() => onDelete(msg.id)}>
                <Text style={[s.actionBtn, s.dangerBtn]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

// ─── ComposeBar ───────────────────────────────────────────────────────────────

const ComposeBar = ({
  placeholder, value, onChangeText, onSubmit, isLoading,
  replyingTo, onCancelReply, selectedImage, onPickImage, onRemoveImage,
}) => (
  <View style={s.compose}>
    {!!replyingTo && (
      <View style={s.replyBanner}>
        <Text style={s.replyBannerText}>
          Replying to{' '}
          <Text style={{ color: Colors.primary }}>{replyingTo.users?.name}</Text>
        </Text>
        <TouchableOpacity onPress={onCancelReply}>
          <Text style={s.replyBannerX}>✕</Text>
        </TouchableOpacity>
      </View>
    )}

    {!!selectedImage && (
      <View style={s.imgPreviewWrap}>
        <Image source={{ uri: selectedImage.uri }} style={s.imgPreview} resizeMode="cover" />
        <TouchableOpacity style={s.imgRemoveBtn} onPress={onRemoveImage}>
          <Text style={s.imgRemoveText}>✕</Text>
        </TouchableOpacity>
      </View>
    )}

    <View style={s.composeRow}>
      <TouchableOpacity style={s.cameraBtn} onPress={onPickImage}>
        <Text style={s.cameraBtnText}>📷</Text>
      </TouchableOpacity>

      <TextInput
        style={s.composeInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        multiline
        maxLength={500}
      />

      <TouchableOpacity
        style={[s.sendBtn, ((!value.trim() && !selectedImage) || isLoading) && s.sendBtnOff]}
        onPress={onSubmit}
        disabled={(!value.trim() && !selectedImage) || isLoading}
      >
        {isLoading
          ? <ActivityIndicator color={Colors.bg} size="small" />
          : <Text style={s.sendBtnText}>↑</Text>}
      </TouchableOpacity>
    </View>
  </View>
);

// ─── OwnerUpdatesTab ──────────────────────────────────────────────────────────

const OwnerUpdatesTab = ({ channelId, isOwner, profile }) => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [draft, setDraft] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  const pinnedCount = posts.filter((p) => p.is_pinned).length;

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchOwnerPosts(channelId);
      if (res.success) setPosts(res.data.posts ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  useEffect(() => { load(); }, [load]);

  const handlePickImage = async () => {
    const asset = await pickImage();
    if (asset) setSelectedImage(asset);
  };

  const handlePost = async () => {
    if (!draft.trim() && !selectedImage) return;
    setIsPosting(true);
    try {
      let imageUrl = null;
      if (selectedImage) imageUrl = await uploadImage(selectedImage, profile.id);
      const res = await createOwnerPost(channelId, draft.trim() || '', imageUrl);
      if (res.success) {
        setDraft('');
        setSelectedImage(null);
        load();
      } else {
        Alert.alert('Error', res.message ?? 'Failed to post.');
      }
    } catch (e) {
      console.error('[handlePost]', e?.message ?? e);
      Alert.alert('Error', 'Failed to post — please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handlePin = async (postId) => {
    try {
      await togglePinPost(channelId, postId);
      load();
    } catch {
      Alert.alert('Error', 'Failed to update pin.');
    }
  };

  const handleDelete = (postId) => {
    Alert.alert('Delete post', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('channel_posts').delete().eq('id', postId);
            setPosts((prev) => prev.filter((p) => p.id !== postId));
          } catch {
            Alert.alert('Error', 'Failed to delete post.');
          }
        },
      },
    ]);
  };

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        renderItem={({ item }) => (
          <OwnerPostCard
            post={item}
            isOwner={isOwner}
            pinnedCount={pinnedCount}
            onPin={handlePin}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No updates yet</Text>
            <Text style={s.emptySub}>
              {isOwner ? 'Post your first update below.' : "The owner hasn't posted yet."}
            </Text>
          </View>
        }
      />
      {isOwner && (
        <ComposeBar
          placeholder="Write an update..."
          value={draft}
          onChangeText={setDraft}
          onSubmit={handlePost}
          isLoading={isPosting}
          selectedImage={selectedImage}
          onPickImage={handlePickImage}
          onRemoveImage={() => setSelectedImage(null)}
        />
      )}
    </KeyboardAvoidingView>
  );
};

// ─── CommunityFeedTab ─────────────────────────────────────────────────────────

const CommunityFeedTab = ({ channelId, isOwner, profile }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(async (pg = 1, isRefresh = false) => {
    isRefresh ? setIsRefreshing(true) : setIsLoading(true);
    try {
      const res = await fetchCommunityFeed(channelId, pg);
      if (res.success) {
        const incoming = res.data.messages ?? [];

        const withReplies = await Promise.all(
          incoming.map(async (msg) => {
            const { data: replies } = await supabase
              .from('discussion_msgs')
              .select('id, message, image_url, likes_count, created_at, users(id, name)')
              .eq('parent_id', msg.id)
              .eq('is_deleted', false)
              .order('created_at', { ascending: true });
            return { ...msg, replies: replies ?? [] };
          })
        );

        setMessages(pg === 1 ? withReplies : (prev) => [...prev, ...withReplies]);
        setPage(pg);
        setHasMore(incoming.length === 20);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [channelId]);

  useEffect(() => { load(1); }, [load]);

  const handlePickImage = async () => {
    const asset = await pickImage();
    if (asset) setSelectedImage(asset);
  };

  const handleSend = async () => {
    if (!draft.trim() && !selectedImage) return;
    setIsPosting(true);
    try {
      let imageUrl = null;
      if (selectedImage) imageUrl = await uploadImage(selectedImage, profile.id);
      const res = await createCommunityMessage(
        channelId,
        draft.trim() || '',
        replyingTo?.id ?? null,
        imageUrl,
      );
      if (res.success) {
        setDraft('');
        setSelectedImage(null);
        setReplyingTo(null);
        load(1, true);
      } else {
        Alert.alert('Error', res.message ?? 'Failed to send.');
      }
    } catch (e) {
      console.error('[handleSend]', e?.message ?? e);
      Alert.alert('Error', 'Failed to send — please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = (messageId) => {
    Alert.alert('Delete message', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteCommunityMessage(channelId, messageId);
            load(1, true);
          } catch {
            Alert.alert('Error', 'Failed to delete message.');
          }
        },
      },
    ]);
  };

  if (isLoading && messages.length === 0) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        initialNumToRender={10}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => load(1, true)}
            tintColor={Colors.primary}
          />
        }
        onEndReached={() => { if (hasMore && !isLoading && !isRefreshing) load(page + 1); }}
        onEndReachedThreshold={0.2}
        renderItem={({ item }) => (
          <MessageCard
            msg={item}
            currentUserId={profile?.id}
            isOwner={isOwner}
            onReply={setReplyingTo}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No posts yet</Text>
            <Text style={s.emptySub}>Start the conversation below.</Text>
          </View>
        }
      />
      <ComposeBar
        placeholder={replyingTo ? 'Write a reply...' : 'Write a post or message...'}
        value={draft}
        onChangeText={setDraft}
        onSubmit={handleSend}
        isLoading={isPosting}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        selectedImage={selectedImage}
        onPickImage={handlePickImage}
        onRemoveImage={() => setSelectedImage(null)}
      />
    </KeyboardAvoidingView>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ChannelScreen = ({ route, navigation }) => {
  const { channel: initialChannel } = route.params;
  const profile = useAuthStore((s) => s.profile);

  const [channel, setChannel] = useState(initialChannel);
  const [isMember, setIsMember] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [activeTab, setActiveTab] = useState('owner');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchChannel(initialChannel.id);
        if (res.success) {
          setChannel(res.data.channel);
          setIsMember(res.data.is_member);
          setIsOwner(res.data.is_owner);
        }
      } catch { /* silent */ }
    })();
  }, [initialChannel.id]);

  const handleJoin = async () => {
    setIsJoining(true);
    try {
      const res = await joinChannel(channel.id);
      if (res.success) {
        setIsMember(true);
        setChannel((prev) => ({ ...prev, subscribers: (prev.subscribers ?? 0) + 1 }));
      }
    } catch {
      Alert.alert('Error', 'Failed to join.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = () => {
    Alert.alert('Leave community', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          setIsJoining(true);
          try {
            const res = await leaveChannel(channel.id);
            if (res.success) {
              setIsMember(false);
              setChannel((prev) => ({
                ...prev,
                subscribers: Math.max(0, (prev.subscribers ?? 1) - 1),
              }));
            }
          } catch {
            Alert.alert('Error', 'Failed to leave.');
          } finally {
            setIsJoining(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <View style={s.screen}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>

        <ChannelHeader
          channel={channel}
          isMember={isMember}
          isOwner={isOwner}
          onJoin={handleJoin}
          onLeave={handleLeave}
          isJoining={isJoining}
        />

        <TabBar active={activeTab} onSelect={setActiveTab} />

        <View style={{ flex: 1 }}>
          {activeTab === 'owner'
            ? <OwnerUpdatesTab channelId={channel.id} isOwner={isOwner} profile={profile} />
            : <CommunityFeedTab channelId={channel.id} isOwner={isOwner} profile={profile} />
          }
        </View>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  screen: { flex: 1 },

  backBtn: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  backArrow: { fontSize: 22, color: Colors.textSecondary },

  coverPhoto: { width: '100%', height: 130 },
  coverPhotoPlaceholder: { width: '100%', height: 80, backgroundColor: Colors.bgElevated },

  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  avatarWrapper: { marginTop: -28 },
  avatarImage: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: Colors.bg },
  avatarFallback: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.bgElevated,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarFallbackText: { fontSize: 22, fontWeight: '700', color: Colors.textSecondary },

  headerMeta: { flex: 1, marginLeft: 12, marginTop: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  channelName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.4 },
  channelDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 3, lineHeight: 18 },
  channelSubs: { fontSize: 12, color: Colors.primary, marginTop: 4 },

  ownerPill: {
    borderWidth: 1, borderColor: Colors.borderStrong,
    borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2,
  },
  ownerPillText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },

  joinBtn: {
    backgroundColor: Colors.primary, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    alignSelf: 'center', minWidth: 64, alignItems: 'center',
  },
  joinBtnText: { fontSize: 13, fontWeight: '700', color: '#0D1117' },

  leaveBtn: {
    borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    alignSelf: 'center', minWidth: 64, alignItems: 'center',
  },
  leaveBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  tabRow: {
    flexDirection: 'row', marginHorizontal: 16, marginVertical: 10,
    backgroundColor: Colors.bgElevated, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, padding: 3,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: '#0D1117' },

  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 },

  ownerCard: {
    backgroundColor: Colors.bgElevated, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    padding: 14, marginBottom: 10,
  },
  ownerCardPinned: {
    borderLeftWidth: 3, borderLeftColor: Colors.accent,
  },
  pinnedLabel: { fontSize: 12, color: Colors.accent, marginBottom: 8, fontWeight: '500' },
  ownerAuthorName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  ownerTextBadge: {
    marginLeft: 6, borderWidth: 1, borderColor: Colors.borderStrong,
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1,
  },
  ownerTextBadgeText: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },

  avatarCircle: {
    backgroundColor: Colors.bgSunken,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarCircleText: { color: Colors.textSecondary, fontWeight: '700' },

  msgCard: {
    backgroundColor: Colors.bgElevated, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    padding: 14, marginBottom: 8,
  },
  msgCardReply: {
    backgroundColor: Colors.bgSunken,
    borderRadius: 10, borderWidth: 0,
    borderLeftWidth: 2, borderLeftColor: Colors.borderStrong,
    marginLeft: 14, marginTop: 8,
  },
  msgTop: { flexDirection: 'row', alignItems: 'flex-start' },
  msgAuthor: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  msgContent: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, lineHeight: 21 },

  repliesContainer: { marginTop: 8 },

  postHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center' },
  postTime: { fontSize: 11, color: Colors.textMuted },
  postContent: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginBottom: 10 },
  postImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 10, marginTop: 6 },

  postActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  postLikes: { fontSize: 13, color: Colors.textMuted },
  actionBtn: { fontSize: 13, fontWeight: '600' },
  primaryBtn: { color: Colors.primary },
  accentBtn: { color: Colors.accent },
  dangerBtn: { color: '#E05252' },
  actionBtnDim: { opacity: 0.4 },

  compose: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.bgElevated,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  replyBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.bgSunken, borderRadius: 8,
    borderLeftWidth: 2, borderLeftColor: Colors.primary,
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8,
  },
  replyBannerText: { fontSize: 12, color: Colors.textSecondary },
  replyBannerX: { fontSize: 14, color: Colors.textMuted, paddingLeft: 8 },

  imgPreviewWrap: { position: 'relative', marginBottom: 8, alignSelf: 'flex-start' },
  imgPreview: { width: 80, height: 80, borderRadius: 8 },
  imgRemoveBtn: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#E05252', alignItems: 'center', justifyContent: 'center',
  },
  imgRemoveText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  composeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  cameraBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cameraBtnText: { fontSize: 17 },
  composeInput: {
    flex: 1, backgroundColor: Colors.bg, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
    color: Colors.textPrimary, fontSize: 14,
    paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnOff: { opacity: 0.3 },
  sendBtnText: { fontSize: 17, color: '#0D1117', fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
});

export default ChannelScreen;