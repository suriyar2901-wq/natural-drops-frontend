import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Loading } from '../../components/common';
import { NotificationPreview } from '../../components/common/NotificationPreview';
import { useAuth } from '../../hooks';
import {
  useGetAllAdminNotificationsQuery,
  useGetBuyerNotificationsQuery,
  useMarkAdminNotificationAsReadMutation,
  useMarkBuyerNotificationAsReadMutation,
} from '../../store/api/notificationApi';
import { useGetShopInboxQuery, useMarkShopInboxReadMutation } from '../../store/api/shopApi';
import { colors, spacing, typography } from '../../theme';
import { formatDateTime } from '../../utils/formatters';

type HistoryItem = {
  key: string;
  id: number;
  message: string;
  createdAt?: string;
  isRead: boolean;
  source: 'buyer' | 'admin' | 'inbox';
};

export const NotificationHistoryScreen = () => {
  const { user, isBuyer, isSeller } = useAuth();
  const buyer = isBuyer();
  const seller = isSeller();
  const buyerQuery = useGetBuyerNotificationsQuery(user?.id || 0, { skip: !user?.id || !buyer });
  const adminQuery = useGetAllAdminNotificationsQuery(undefined, { skip: buyer });
  const inboxQuery = useGetShopInboxQuery(undefined, { skip: !seller });
  const [markBuyerRead] = useMarkBuyerNotificationAsReadMutation();
  const [markAdminRead] = useMarkAdminNotificationAsReadMutation();
  const [markInboxRead] = useMarkShopInboxReadMutation();
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const [readKeys, setReadKeys] = useState<string[]>([]);

  const buyerItems: HistoryItem[] = (buyerQuery.data || []).map((item) => ({
    key: `buyer-${item.id}`,
    id: item.id,
    message: item.message,
    createdAt: item.createdAt,
    isRead: !!item.isRead,
    source: 'buyer',
  }));
  const adminItems: HistoryItem[] = (adminQuery.data || []).map((item) => ({
    key: `admin-${item.id}`,
    id: item.id,
    message: item.message || `New order #${item.orderId} from ${item.customerName}`,
    createdAt: item.createdAt,
    isRead: !!item.isRead,
    source: 'admin',
  }));
  const inboxItems: HistoryItem[] = (inboxQuery.data || []).map((item: any) => ({
    key: `inbox-${item.id}`,
    id: item.id,
    message: item.title ? `${item.title}: ${item.message}` : item.message,
    createdAt: item.createdAt,
    isRead: !!item.isRead,
    source: 'inbox',
  }));
  const items = (buyer ? buyerItems : adminItems.concat(inboxItems))
    .map((item) => ({ ...item, isRead: item.isRead || readKeys.includes(item.key) }))
    .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')));
  const loading = buyer ? buyerQuery.isLoading : adminQuery.isLoading || inboxQuery.isLoading;

  const markRead = async (item: HistoryItem) => {
    if (item.isRead) return;
    if (item.source === 'buyer') await markBuyerRead(item.id);
    else if (item.source === 'admin') await markAdminRead(item.id);
    else await markInboxRead(item.id);
  };

  if (loading) {
    return <Loading fullScreen message="Loading notification history..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.row, item.isRead ? styles.read : styles.unread]} onPress={() => setSelected(item)}>
            <Text style={[styles.message, item.isRead && styles.messageRead]} numberOfLines={1}>{item.message}</Text>
            <Text style={styles.meta}>
              {item.createdAt ? formatDateTime(item.createdAt) : ''}
              {item.isRead ? ' · Read' : ' · New'}
            </Text>
          </TouchableOpacity>
        )}
      />
      <NotificationPreview
        visible={!!selected}
        message={selected?.message || ''}
        createdAt={selected?.createdAt}
        isRead={selected?.isRead}
        onClose={() => setSelected(null)}
        onRead={async () => {
          if (!selected) return;
          try {
            await markRead(selected);
          } catch (_error) {
            return;
          }
          setReadKeys((prev) => prev.concat(selected.key));
          setSelected({ ...selected, isRead: true });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
  row: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  read: { backgroundColor: '#EEF2F6' },
  message: { color: colors.textSecondary, fontSize: typography.fontSize.sm },
  messageRead: { color: '#1F2937', fontWeight: typography.fontWeight.bold },
  meta: { marginTop: 4, color: colors.textSecondary, fontSize: typography.fontSize.xs },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xl },
});
