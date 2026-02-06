import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { Card, Loading, DatePicker } from '../../components/common';
import { useAuth } from '../../hooks';
import { useGetDashboardStatsQuery } from '../../store/api/dashboardApi';
import { 
  useGetUnreadAdminNotificationsQuery, 
  useGetUnreadAdminNotificationCountQuery,
  useMarkAdminNotificationAsReadMutation 
} from '../../store/api/notificationApi';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useNotifications } from '../../hooks/useNotifications';
import { DashboardQueryParams, OrderStatus } from '../../types';

export const AdminDashboardScreen = ({ navigation }: any) => {
  const { user, isStrictAdmin } = useAuth();
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [dateFilterParams, setDateFilterParams] = useState<DashboardQueryParams | undefined>(undefined);
  
  // Use dashboard API with date range filter
  const { 
    data: dashboardStats, 
    isLoading: dashboardLoading, 
    isFetching: dashboardFetching,
    refetch: refetchDashboard,
    error: dashboardError 
  } = useGetDashboardStatsQuery(
    dateFilterParams,
    {
      // Refetch when dateFilterParams changes
      skip: false,
    }
  );

  // Log dashboard data for debugging
  useEffect(() => {
    if (dashboardStats) {
      console.log('📊 Dashboard stats updated:', {
        totalOrders: dashboardStats.totalOrders,
        pendingOrders: dashboardStats.pendingOrders,
        totalRevenue: dashboardStats.totalRevenue,
        dateRangeLabel: dashboardStats.dateRangeLabel,
        filterParams: dateFilterParams,
      });
    }
    if (dashboardError) {
      console.error('❌ Dashboard error:', dashboardError);
    }
  }, [dashboardStats, dashboardError, dateFilterParams]);
  
  const { data: notifications, isLoading: notificationsLoading, refetch: refetchNotifications } = useGetUnreadAdminNotificationsQuery(
    undefined
  );
  const { data: unreadCount = 0 } = useGetUnreadAdminNotificationCountQuery(
    undefined
  );
  const [markAsRead] = useMarkAdminNotificationAsReadMutation();
  const { showNotification } = useNotifications();
  const previousCountRef = useRef<number>(0);

  // Extract metrics from dashboard stats
  const totalOrders = dashboardStats?.totalOrders || 0;
  const pendingOrders = dashboardStats?.pendingOrders || 0;
  const totalRevenue = dashboardStats?.totalRevenue || 0;
  const productsCount = dashboardStats?.productsCount || 0;
  const dateRangeLabel = dashboardStats?.dateRangeLabel || 'All Time';
  
  // When no filter, show today's orders; when filtered, show orders in range
  const ordersInRange = dateFilterParams 
    ? dashboardStats?.totalOrders || 0
    : dashboardStats?.todayOrders || 0;

  // Show push notification when new order arrives
  useEffect(() => {
    if (unreadCount > previousCountRef.current && previousCountRef.current > 0) {
      const newNotificationsCount = unreadCount - previousCountRef.current;
      showNotification(
        'New Order Received!',
        `You have ${newNotificationsCount} new order${newNotificationsCount > 1 ? 's' : ''} from customer${newNotificationsCount > 1 ? 's' : ''}`,
        { type: 'order' }
      );
    }
    previousCountRef.current = unreadCount;
  }, [unreadCount, showNotification]);

  const handleNotificationPress = async (notification: any) => {
    try {
      await markAsRead(notification.id);
      navigation.navigate('OrderManagement');
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Auto-fetch when both dates are selected
  useEffect(() => {
    if (fromDate && toDate) {
      // Parse dates properly (YYYY-MM-DD format)
      const fromParts = fromDate.split('-').map(Number);
      const toParts = toDate.split('-').map(Number);
      
      if (fromParts.length !== 3 || toParts.length !== 3) {
        console.warn('Invalid date format:', { fromDate, toDate });
        setDateFilterParams(undefined);
        return;
      }
      
      const from = new Date(fromParts[0], fromParts[1] - 1, fromParts[2]);
      const to = new Date(toParts[0], toParts[1] - 1, toParts[2]);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      // Reset filter if dates are invalid
      if (from > to) {
        console.warn('From date is after To date');
        setDateFilterParams(undefined);
        return;
      }
      
      if (to > today) {
        console.warn('To date is in the future');
        setDateFilterParams(undefined);
        return;
      }
      
      // Auto-apply filter when both dates are selected and valid
      console.log('📅 Applying date filter:', { fromDate, toDate });
      setDateFilterParams({
        fromDate,
        toDate,
      });
    } else {
      // Clear filter if one date is cleared
      console.log('📅 Clearing date filter');
      setDateFilterParams(undefined);
    }
  }, [fromDate, toDate]);

  const handleResetFilter = () => {
    setFromDate('');
    setToDate('');
    setDateFilterParams(undefined);
  };

  // Get today's date in YYYY-MM-DD format for max date (using local timezone)
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Show loading only on initial load, not during refetch
  if (dashboardLoading && !dashboardStats) {
    return <Loading fullScreen message="Loading dashboard..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
        <Text style={styles.greeting}>Welcome, {user?.fullName}!</Text>
        <Text style={styles.role}>Admin Dashboard</Text>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.notificationBadge}
              onPress={() => navigation.navigate('OrderManagement')}
            >
              <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Date Range Filter Section */}
      <Card style={styles.filterCard}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>📅 Filter by Date Range</Text>
          {(fromDate || toDate || dateFilterParams) && (
            <TouchableOpacity
              style={styles.clearFilterButton}
              onPress={handleResetFilter}
            >
              <Text style={styles.clearFilterButtonText}>🔄 Clear Filter</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {dashboardFetching && (
          <View style={styles.loadingIndicator}>
            <Text style={styles.loadingText}>🔄 Updating dashboard...</Text>
          </View>
        )}
        
        {dashboardError && (
          <View style={styles.errorIndicator}>
            <Text style={styles.errorText}>⚠️ Error loading dashboard data. Please try again.</Text>
          </View>
        )}
        
        <View style={styles.datePickerContainer}>
          <View style={styles.datePickerWrapper}>
            <DatePicker
              label="From Date"
              value={fromDate}
              onChange={(date) => {
                setFromDate(date);
                // If new fromDate is after toDate, clear toDate
                if (toDate && date > toDate) {
                  setToDate('');
                }
              }}
              maxDate={toDate || getTodayDateString()}
              placeholder="Select start date"
            />
          </View>
          <View style={styles.datePickerWrapper}>
            <DatePicker
              label="To Date"
              value={toDate}
              onChange={(date) => {
                setToDate(date);
                // If new toDate is before fromDate, clear fromDate
                if (fromDate && date < fromDate) {
                  setFromDate('');
                }
              }}
              maxDate={getTodayDateString()}
              placeholder="Select end date"
            />
          </View>
        </View>
        
        {/* Show validation message if dates are invalid */}
        {fromDate && toDate && new Date(fromDate) > new Date(toDate) && (
          <View style={styles.validationMessage}>
            <Text style={styles.validationText}>
              ⚠️ From date must be before or equal to To date
            </Text>
          </View>
        )}
        
        {dateRangeLabel && (
          <View style={styles.dateRangeLabelContainer}>
            <Text style={styles.dateRangeLabel}>📊 Showing: {dateRangeLabel}</Text>
          </View>
        )}
      </Card>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{ordersInRange}</Text>
          <Text style={styles.statLabel}>
            {dateFilterParams ? 'Orders in Range' : 'New Orders'}
          </Text>
        </Card>

        <TouchableOpacity
          onPress={() => navigation.navigate('OrderManagement', { initialStatus: OrderStatus.PENDING })}
          activeOpacity={0.8}
          style={styles.statCardTouchable}
        >
          <Card style={[styles.statCard, styles.statCardInnerFullWidth]}>
            <Text style={styles.statValue}>{pendingOrders}</Text>
            <Text style={styles.statLabel}>Pending Orders</Text>
          </Card>
        </TouchableOpacity>

        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{totalOrders}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{formatCurrency(totalRevenue)}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </Card>

        <TouchableOpacity
          onPress={() => navigation.navigate('MenuManagement')}
          activeOpacity={0.8}
          style={styles.statCardTouchable}
        >
          <Card style={[styles.statCard, styles.statCardInnerFullWidth]}>
            <Text style={styles.statValue}>{productsCount}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </Card>
        </TouchableOpacity>
      </View>

      {/* Recent Notifications Section */}
      {notifications && notifications.length > 0 && (
        <View style={styles.notificationsSection}>
          <View style={styles.notificationsHeader}>
            <Text style={styles.sectionTitle}>🔔 New Orders ({unreadCount})</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OrderManagement')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {notifications.slice(0, 3).map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.isRead && styles.notificationCardUnread
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>
                  New Order #{notification.orderId}
                </Text>
                <Text style={styles.notificationCustomer}>
                  Customer: {notification.customerName}
                </Text>
                <Text style={styles.notificationDetails}>
                  {notification.itemCount} item{notification.itemCount > 1 ? 's' : ''} • {formatCurrency(notification.total)}
                </Text>
                <Text style={styles.notificationTime}>
                  {formatDateTime(notification.createdAt)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('OrderManagement')}
        >
          <View style={styles.actionButtonContent}>
          <Text style={styles.actionButtonText}>📦 Manage Orders</Text>
            {unreadCount > 0 && (
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('MenuManagement')}
        >
          <Text style={styles.actionButtonText}>🛒 Manage Products</Text>
        </TouchableOpacity>

        {/* Users management - Only visible for ADMIN role, not for SELLER */}
        {isStrictAdmin() && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('UserManagement')}
          >
            <Text style={styles.actionButtonText}>👥 Manage Users</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AppSettings')}
        >
          <Text style={styles.actionButtonText}>⚙️ App Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: spacing.md,
    marginBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  role: {
    fontSize: typography.fontSize.base,
    color: colors.white,
  },
  notificationBadge: {
    backgroundColor: colors.error,
    borderRadius: 20,
    minWidth: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  notificationBadgeText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '47%',
    alignItems: 'center',
    padding: spacing.lg,
  },
  statCardTouchable: {
    width: '47%',
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  statCardInnerFullWidth: {
    width: '100%',
  },
  statValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  quickActions: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: spacing.md,
    marginBottom: spacing.md,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  },
  actionButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  actionButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBadge: {
    backgroundColor: colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  actionBadgeText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  notificationsSection: {
    marginBottom: spacing.lg,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  viewAllText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  notificationCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...{
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  },
  notificationCardUnread: {
    backgroundColor: colors.gray50,
    borderLeftColor: colors.error,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  notificationCustomer: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  notificationDetails: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  notificationTime: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  filterCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  filterTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  clearFilterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
    backgroundColor: colors.gray200,
  },
  clearFilterButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  datePickerContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  datePickerWrapper: {
    flex: 1,
  },
  dateRangeLabelContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  dateRangeLabel: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
  },
  validationMessage: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.error + '20',
    borderRadius: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  validationText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    fontWeight: typography.fontWeight.medium,
  },
  loadingIndicator: {
    padding: spacing.sm,
    backgroundColor: colors.primary + '20',
    borderRadius: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
  errorIndicator: {
    padding: spacing.sm,
    backgroundColor: colors.error + '20',
    borderRadius: spacing.sm,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    fontWeight: typography.fontWeight.medium,
  },
});

