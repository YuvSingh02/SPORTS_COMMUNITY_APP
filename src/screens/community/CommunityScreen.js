// screens/community/CommunityScreen.js
// Social-first community list — clean, minimal, scroll-friendly

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, SafeAreaView, StatusBar,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
  Image, ScrollView, Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { fetchAllChannels, createChannel } from '../../services/communityService';
import { supabase } from '../../services/supabase';
import useAuthStore from '../../store/authStore';
import { Colors, Typography, Spacing, Radius } from '../../constants/colors';

// ─── Image helpers ────────────────────────────────────────────────────────────

const pickImage = async () => {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission required', 'Allow photo access to upload images.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], quality: 0.8, allowsEditing: true,
  });
  if (result.canceled) return null;
  return result.assets[0];
};

const uploadImage = async (asset, userId) => {
  const ext = asset.uri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const formData = new FormData();
  formData.append('file', { uri: asset.uri, name: path, type: asset.mimeType ?? 'image/jpeg' });
  const { error } = await supabase.storage
    .from('community-images')
    .upload(path, formData, { contentType: asset.mimeType ?? 'image/jpeg', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('community-images').getPublicUrl(path);
  return data.publicUrl;
};

// ─── Community card ───────────────────────────────────────────────────────────

const CommunityCard = ({ channel, onPress }) => (
  <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
    {/* Avatar */}
    {channel.avatar_url ? (
      <Image source={{ uri: channel.avatar_url }} style={s.cardAvatar} />
    ) : (
      <View style={s.cardAvatarFallback}>
        <Text style={s.cardAvatarLetter}>{channel.name?.charAt(0).toUpperCase()}</Text>
      </View>
    )}

    <View style={s.cardBody}>
      <View style={s.cardTopRow}>
        <Text style={s.cardName} numberOfLines={1}>{channel.name}</Text>
        <Text style={s.cardChevron}>›</Text>
      </View>
      {!!channel.description && (
        <Text style={s.cardDesc} numberOfLines={2}>{channel.description}</Text>
      )}
      <Text style={s.cardMeta}>
        {channel.subscribers?.toLocaleString()} members
      </Text>
    </View>
  </TouchableOpacity>
);

// ─── Create modal ─────────────────────────────────────────────────────────────

const CreateModal = ({ visible, onClose, onCreated, userId }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarAsset, setAvatarAsset] = useState(null);
  const [coverAsset, setCoverAsset] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const reset = () => { setName(''); setDescription(''); setAvatarAsset(null); setCoverAsset(null); };

  const handleClose = () => { reset(); onClose(); };

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Name required', 'Please enter a community name.'); return; }
    setIsLoading(true);
    try {
      const [avatarUrl, coverUrl] = await Promise.all([
        avatarAsset ? uploadImage(avatarAsset, userId) : Promise.resolve(null),
        coverAsset ? uploadImage(coverAsset, userId) : Promise.resolve(null),
      ]);
      const res = await createChannel(name.trim(), description.trim(), avatarUrl, coverUrl);
      if (res.success) { reset(); onCreated(res.data.channel); }
      else Alert.alert('Error', res.message ?? 'Failed to create community.');
    } catch (e) {
      console.error('[CreateModal]', e?.message ?? e);
      Alert.alert('Error', 'Failed to create community — please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={s.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <View style={s.modalSheet}>
            {/* Handle bar */}
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>New Community</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {/* Cover */}
              <Text style={s.fieldLabel}>Cover Photo</Text>
              <View style={{ marginBottom: Spacing.base }}>
                <Pressable
                  onPress={async () => { const a = await pickImage(); if (a) setCoverAsset(a); }}
                  style={coverAsset ? s.coverPreviewWrap : s.coverEmpty}
                >
                  {coverAsset
                    ? <Image source={{ uri: coverAsset.uri }} style={s.coverPreview} resizeMode="cover" />
                    : <>
                      <Text style={s.coverEmptyIcon}>🖼️</Text>
                      <Text style={s.coverEmptyText}>Tap to add cover photo</Text>
                    </>
                  }
                </Pressable>
                {coverAsset && (
                  <Pressable
                    onPress={() => setCoverAsset(null)}
                    style={s.coverRemoveBtn}
                    hitSlop={12}
                  >
                    <Text style={s.coverRemoveText}>✕</Text>
                  </Pressable>
                )}
              </View>

              {/* Avatar */}
              <Text style={s.fieldLabel}>Profile Photo</Text>
              <View style={s.avatarRow}>
                <Pressable
                  onPress={async () => { const a = await pickImage(); if (a) setAvatarAsset(a); }}
                >
                  {avatarAsset
                    ? <Image source={{ uri: avatarAsset.uri }} style={s.avatarPreview} />
                    : <View style={s.avatarEmpty}>
                      <Text style={s.avatarEmptyIcon}>📷</Text>
                    </View>
                  }
                </Pressable>
                <View style={{ flex: 1, paddingLeft: Spacing.md }}>
                  <Text style={s.avatarHint}>
                    {avatarAsset ? 'Tap to change' : 'Tap to add profile photo'}
                  </Text>
                  {avatarAsset && (
                    <Pressable onPress={() => setAvatarAsset(null)}>
                      <Text style={s.avatarRemove}>Remove</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Name */}
              <Text style={s.fieldLabel}>Name *</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. RCB Fans"
                placeholderTextColor={Colors.textMuted}
                maxLength={60}
              />

              {/* Description */}
              <Text style={s.fieldLabel}>Description</Text>
              <TextInput
                style={[s.input, s.inputMulti]}
                value={description}
                onChangeText={setDescription}
                placeholder="What is this community about?"
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={200}
              />
            </ScrollView>

            {/* Actions */}
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={handleClose}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.createBtn, isLoading && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={isLoading}
              >
                {isLoading
                  ? <ActivityIndicator color={Colors.textInverse} size="small" />
                  : <Text style={s.createBtnText}>Create</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

const CommunityScreen = ({ navigation }) => {
  const profile = useAuthStore((s) => s.profile);

  const [channels, setChannels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setIsRefreshing(true) : setIsLoading(true);
    try {
      const res = await fetchAllChannels();
      if (res.success) setChannels(res.data.channels);
    } catch { }
    finally { setIsLoading(false); setIsRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const filtered = query.trim()
    ? channels.filter(c =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.description?.toLowerCase().includes(query.toLowerCase())
    )
    : channels;

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Community</Text>
          <Text style={s.headerSub}>{channels.length} communities</Text>
        </View>
        <TouchableOpacity style={s.createFabInline} onPress={() => setShowCreate(true)}>
          <Text style={s.createFabInlineText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search communities…"
          placeholderTextColor={Colors.textMuted}
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={s.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => load(true)}
            tintColor={Colors.primary}
          />
        }
        renderItem={({ item }) => (
          <CommunityCard
            channel={item}
            onPress={() => navigation.navigate('Channel', { channel: item })}
          />
        )}
        ItemSeparatorComponent={() => <View style={s.separator} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>💬</Text>
            <Text style={s.emptyTitle}>{query ? 'No results' : 'No communities yet'}</Text>
            <Text style={s.emptySub}>
              {query ? 'Try a different term' : 'Be the first to create one'}
            </Text>
            {!query && (
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)}>
                <Text style={s.emptyBtnText}>Create Community</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      <CreateModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(ch) => {
          setChannels(prev => [ch, ...prev]);
          setShowCreate(false);
          navigation.navigate('Channel', { channel: ch });
        }}
        userId={profile?.id}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: -0.5,
  },
  headerSub: { color: Colors.textMuted, fontSize: Typography.fontSizes.sm, marginTop: 3 },

  createFabInline: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  createFabInlineText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.fontSizes.base },
  searchClear: { color: Colors.textMuted, fontSize: 15, paddingLeft: 8 },

  listContent: { paddingHorizontal: Spacing.base, paddingBottom: 100 },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 72 },

  // Community card — Reddit/Telegram style
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  cardAvatar: {
    width: 52, height: 52, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardAvatarFallback: {
    width: 52, height: 52, borderRadius: Radius.full,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cardAvatarLetter: {
    color: Colors.primary,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
  },
  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    flex: 1,
  },
  cardChevron: { color: Colors.textMuted, fontSize: 20 },
  cardDesc: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    marginTop: 2,
    lineHeight: 19,
  },
  cardMeta: { color: Colors.textMuted, fontSize: Typography.fontSizes.xs, marginTop: 4 },

  // Empty state
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 42, marginBottom: Spacing.md },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: 6,
  },
  emptySub: { color: Colors.textMuted, fontSize: Typography.fontSizes.sm, textAlign: 'center' },
  emptyBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 11,
  },
  emptyBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: Colors.bgOverlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.bgElevated,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: 40,
    maxHeight: '92%',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.borderStrong,
    alignSelf: 'center', marginBottom: Spacing.lg,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing.lg,
  },

  fieldLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 8,
  },

  // Cover
  coverEmpty: {
    height: 100,
    backgroundColor: Colors.bgSunken,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  coverEmptyIcon: { fontSize: 26, marginBottom: 4 },
  coverEmptyText: { color: Colors.textMuted, fontSize: Typography.fontSizes.sm },
  coverPreviewWrap: { borderRadius: Radius.md, overflow: 'hidden' },
  coverPreview: { width: '100%', height: 100, borderRadius: Radius.md },
  coverRemoveBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.error,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10, elevation: 5,
  },
  coverRemoveText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Avatar
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.base },
  avatarEmpty: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.bgSunken,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmptyIcon: { fontSize: 22 },
  avatarPreview: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 2, borderColor: Colors.primary,
  },
  avatarHint: { color: Colors.textMuted, fontSize: Typography.fontSizes.sm },
  avatarRemove: { color: Colors.error, fontSize: Typography.fontSizes.sm, marginTop: 4, fontWeight: '600' },

  input: {
    backgroundColor: Colors.bgSunken,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    marginBottom: Spacing.base,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },

  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.semibold },
  createBtn: {
    flex: 1, paddingVertical: 13, borderRadius: Radius.lg,
    backgroundColor: Colors.primary, alignItems: 'center',
  },
  createBtnText: { color: Colors.textInverse, fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.bold },
});

export default CommunityScreen;