import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { Card, Loading, DatePicker, StatusPill, DashboardRevenueChart, EarningsPieChart, HeaderBrand } from '../../components/common';
import { useAuth } from '../../hooks';
import { useGetDashboardStatsQuery } from '../../store/api/dashboardApi';
import { useGetPlatformDashboardQuery } from '../../store/api/platformAdminApi';
import { useCreateTodayRegularOrdersMutation, useGetRegularOrderPromptQuery, useGetSellerSubscriptionQuery, useGetShopCompanyQuery, useGetShopInboxQuery, useMarkShopInboxReadMutation, useSubscribeSellerMutation } from '../../store/api/shopApi';
import { showErrorToast, showSuccessToast } from '../../utils/toast';
import { 
  useGetUnreadAdminNotificationsQuery, 
  useGetUnreadAdminNotificationCountQuery,
  useMarkAdminNotificationAsReadMutation 
} from '../../store/api/notificationApi';
import { formatCurrency } from '../../utils/formatters';
import { NotificationPreview } from '../../components/common/NotificationPreview';
import { useNotifications } from '../../hooks/useNotifications';
import { DashboardQueryParams, OrderStatus } from '../../types';

export const AdminDashboardScreen = ({ navigation }: any) => {
  const { user, isStrictAdmin, isSeller } = useAuth();
  const { data: sellerSub } = useGetSellerSubscriptionQuery(undefined, { skip: !isSeller() });
  const { data: shopCompany } = useGetShopCompanyQuery(undefined, { skip: !isSeller() });
  const { data: shopInbox = [] } = useGetShopInboxQuery(undefined, { skip: !isSeller() });
  const { data: regularPrompt } = useGetRegularOrderPromptQuery(undefined, { skip: !isSeller() });
  const [createRegularOrders, { isLoading: creatingRegular }] = useCreateTodayRegularOrdersMutation();
  const [markInboxRead] = useMarkShopInboxReadMutation();
  const [dismissedInboxIds, setDismissedInboxIds] = useState<number[]>([]);
  const [renewSeller, { isLoading: renewing }] = useSubscribeSellerMutation();
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
  const [preview, setPreview] = useState<any>(null);
  const [inboxPreview, setInboxPreview] = useState<any>(null);
  const { showNotification } = useNotifications();
  const previousCountRef = useRef<number>(0);

  // Extract metrics from dashboard stats
  const totalOrders = dashboardStats?.totalOrders || 0;
  const pendingOrders = dashboardStats?.pendingOrders || 0;
  const totalRevenue = dashboardStats?.totalRevenue || 0;
  const productsCount = dashboardStats?.productsCount || 0;
  const dateRangeLabel = dashboardStats?.dateRangeLabel || 'All Time';
  const { data: platform } = useGetPlatformDashboardQuery('this_month', { skip: !isStrictAdmin() });
  
  // When no filter, show today's orders; when filtered, show orders in range
  const ordersInRange = dateFilterParams 
    ? dashboardStats?.totalOrders || 0
    : dashboardStats?.todayOrders || 0;

  // Show push notification when new order arrives
  useEffect(() => {
    if (unreadCount > previousCountRef.current && previousCountRef.current > 0) {
      const newNotificationsCount = unreadCount - previousCountRef.current;
      const latestMessage = notifications?.[0]?.message?.trim();
      showNotification(
        latestMessage ? 'Delivery reminder' : 'New Order Received!',
        latestMessage || `You have ${newNotificationsCount} new order${newNotificationsCount > 1 ? 's' : ''} from customer${newNotificationsCount > 1 ? 's' : ''}`,
        { type: 'order' }
      );
    }
    previousCountRef.current = unreadCount;
  }, [unreadCount, showNotification, notifications]);

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
        {isSeller() ? (
          <>
            <View style={styles.shopBrand}>
              <HeaderBrand
                name={shopCompany?.companyName}
                photo={shopCompany?.profilePhoto || user?.profilePhoto}
                light
              />
            </View>
            <Text style={styles.greeting}>Welcome, {user?.fullName || user?.username}!</Text>
            <Text style={styles.role}>Seller Dashboard</Text>
          </>
        ) : (
          <>
            <Text style={styles.greeting}>Welcome, {user?.fullName}!</Text>
            <Text style={styles.role}>Admin Dashboard</Text>
          </>
        )}
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

      {isSeller() && shopCompany?.companyCode && (
        <Card style={styles.companyCard}>
          <Text style={styles.reminderTitle}>Your company code</Text>
          <Text style={styles.companyCode}>{shopCompany.companyCode}</Text>
          <Text style={styles.reminderCopy}>
            Buyers who register with this code see only your products. Buyers: {shopCompany.buyerCount}
          </Text>
          <TouchableOpacity
            style={styles.reminderButton}
            onPress={() => navigation.getParent()?.navigate('ShopBuyers') || navigation.navigate('ShopBuyers')}
          >
            <Text style={styles.reminderButtonText}>View buyers</Text>
          </TouchableOpacity>
        </Card>
      )}

      {isSeller() && (regularPrompt?.buyerCount || 0) > 0 && (
        <Card style={styles.reminderCard}>
          <Text style={styles.reminderTitle}>Today's regular orders</Text>
          <Text style={styles.reminderCopy}>
            Create regular orders for {regularPrompt?.buyerNames?.join(', ')}? Seller and buyer both get a notification.
          </Text>
          <TouchableOpacity
            style={styles.reminderButton}
            disabled={creatingRegular}
            onPress={async () => {
              try {
                const result = await createRegularOrders().unwrap();
                showSuccessToast(`${result.created} regular order${result.created === 1 ? '' : 's'} created`);
              } catch (error: any) {
                showErrorToast(error?.data?.message || 'Could not create regular orders');
              }
            }}
          >
            <Text style={styles.reminderButtonText}>{creatingRegular ? 'Creating...' : 'Yes, create orders'}</Text>
          </TouchableOpacity>
        </Card>
      )}

      {isSeller() && shopInbox.filter((item) => !item.isRead && !dismissedInboxIds.includes(item.id)).length > 0 && (
        <TouchableOpacity
          style={styles.noticeBar}
          onPress={() => setInboxPreview(shopInbox.find((item) => !item.isRead && !dismissedInboxIds.includes(item.id)))}
        >
          <Text style={styles.noticeText}>
            {shopInbox.filter((item) => !item.isRead && !dismissedInboxIds.includes(item.id)).length} new message
            {shopInbox.filter((item) => !item.isRead && !dismissedInboxIds.includes(item.id)).length > 1 ? 's' : ''}
          </Text>
          <Text style={styles.noticeAction}>Open</Text>
        </TouchableOpacity>
      )}

      {isSeller() && sellerSub?.showExpiryReminder && sellerSub.canWork && (
        <Card style={styles.reminderCard}>
          <Text style={styles.reminderTitle}>Subscription reminder</Text>
          <Text style={styles.reminderCopy}>{sellerSub.reminderMessage}</Text>
          <TouchableOpacity
            style={styles.reminderButton}
            onPress={async () => {
              try {
                await renewSeller({ plan: sellerSub.plan || 'MONTHLY', method: 'UPI' }).unwrap();
                showSuccessToast('Subscription renewed. Reminder cleared.');
              } catch (error: any) {
                showErrorToast(error?.data?.message || 'Could not renew subscription');
              }
            }}
          >
            <Text style={styles.reminderButtonText}>{renewing ? 'Renewing…' : 'Renew now'}</Text>
          </TouchableOpacity>
        </Card>
      )}

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

      {isSeller() && (
        <Card style={styles.chartCard}>
          <Text style={styles.filterTitle}>Earnings</Text>
          <Text style={styles.chartHint}>
            Fully paid earnings, partial amount collected, and what is still due
            {dashboardStats?.dateRangeLabel ? ` · ${dashboardStats.dateRangeLabel}` : ''}
          </Text>
          <EarningsPieChart
            paid={Number(dashboardStats?.paidEarnings || 0)}
            partial={Number(dashboardStats?.partialCollected || 0)}
            due={Number(dashboardStats?.balanceDue || 0)}
          />
        </Card>
      )}

      {isStrictAdmin() && (
        <Card style={styles.chartCard}>
          <Text style={styles.filterTitle}>Revenue Overview</Text>
          <Text style={styles.chartHint}>Last 6 months — order revenue and seller subscription collections</Text>
          <DashboardRevenueChart points={dashboardStats?.monthlyRevenue || []} />
        </Card>
      )}

      {/* Recent Notifications Section */}
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.noticeBar} onPress={() => setPreview(notifications?.[0])}>
          <Text style={styles.noticeText}>
            {unreadCount} new update{unreadCount > 1 ? 's' : ''}
          </Text>
          <Text style={styles.noticeAction}>Open</Text>
        </TouchableOpacity>
      )}
      <NotificationPreview
        visible={!!preview}
        message={preview?.message?.trim() || (preview ? `New order #${preview.orderId} from ${preview.customerName}` : '')}
        createdAt={preview?.createdAt}
        isRead={false}
        onClose={() => setPreview(null)}
        onRead={async () => {
          if (!preview) return;
          try {
            await markAsRead(preview.id);
            setPreview(null);
          } catch (error) {
            console.error('Error marking notification as read:', error);
          }
        }}
      />
      <NotificationPreview
        visible={!!inboxPreview}
        message={inboxPreview ? `${inboxPreview.title}: ${inboxPreview.message}` : ''}
        createdAt={inboxPreview?.createdAt}
        isRead={false}
        onClose={() => setInboxPreview(null)}
        onRead={async () => {
          if (!inboxPreview) return;
          setDismissedInboxIds((prev) => prev.concat(inboxPreview.id));
          try {
            await markInboxRead(inboxPreview.id).unwrap();
            setInboxPreview(null);
          } catch (_error) {
            setDismissedInboxIds((prev) => prev.filter((id) => id !== inboxPreview.id));
            showErrorToast('Could not mark the buyer message as read');
          }
        }}
      />

      {isStrictAdmin() && platform && (
        <View style={styles.platformSection}>
          <Text style={styles.sectionTitle}>Platform Admin</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity style={styles.statCardTouchable} onPress={() => navigation.navigate('SellerList')}>
              <Card style={styles.platformStatCard}>
                <Text style={styles.statValue}>{platform.totalSellers}</Text>
                <Text style={styles.statLabel}>Total Sellers</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCardTouchable} onPress={() => navigation.navigate('SubscriptionList', { filter: 'Active' })}>
              <Card style={styles.platformStatCard}>
                <Text style={styles.statValue}>{platform.activeSubscribers}</Text>
                <Text style={styles.statLabel}>Active Subscribers {platform.activeRate}</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statCardTouchable} onPress={() => navigation.navigate('PaymentList')}>
              <Card style={styles.platformStatCard}>
                <Text style={styles.statValue}>{formatCurrency(platform.revenueThisMonth)}</Text>
                <Text style={styles.statLabel}>Subscription Revenue</Text>
              </Card>
            </TouchableOpacity>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{formatCurrency(platform.yetToReceive)}</Text>
              <Text style={styles.statLabel}>Yet to Receive</Text>
            </Card>
          </View>

          <Card style={styles.healthCard}>
            <Text style={styles.filterTitle}>Subscription Health</Text>
            <View style={styles.healthRow}>
              <HealthBtn label="Active" value={platform.activeSubscriptions} onPress={() => navigation.navigate('SubscriptionList', { filter: 'Active' })} />
              <HealthBtn label="Expiring" value={platform.expiringSoon} onPress={() => navigation.navigate('SubscriptionList', { filter: 'Expiring Soon' })} />
              <HealthBtn label="Expired" value={platform.expired} onPress={() => navigation.navigate('SubscriptionList', { filter: 'Expired' })} />
              <HealthBtn label="Pending" value={platform.paymentPending} onPress={() => navigation.navigate('SubscriptionList', { filter: 'Payment Pending' })} />
            </View>
          </Card>

          {platform.attentionItems?.length > 0 && (
            <Card style={styles.healthCard}>
              <Text style={styles.filterTitle}>Needs Attention</Text>
              {platform.attentionItems.map((item) => (
                <Text key={item} style={styles.attentionItem}>• {item}</Text>
              ))}
            </Card>
          )}

          {platform.recentPayments?.length > 0 && (
            <Card style={styles.healthCard}>
              <View style={styles.notificationsHeader}>
                <Text style={styles.filterTitle}>Recent Subscription Payments</Text>
                <TouchableOpacity onPress={() => navigation.navigate('PaymentList')}>
                  <Text style={styles.viewAllText}>View all</Text>
                </TouchableOpacity>
              </View>
              {platform.recentPayments.map((payment) => (
                <View key={payment.id} style={styles.payRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notificationTitle}>{payment.businessName || payment.sellerName}</Text>
                    <Text style={styles.notificationDetails}>{payment.plan} • {formatCurrency(payment.amount)} • {payment.method}</Text>
                  </View>
                  <StatusPill label={payment.status} />
                </View>
              ))}
            </Card>
          )}
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

        {isStrictAdmin() && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AppSettings')}
          >
            <Text style={styles.actionButtonText}>⚙️ App Settings</Text>
          </TouchableOpacity>
        )}

        {isStrictAdmin() && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('SellerList')}
            >
              <Text style={styles.actionButtonText}>🏪 Manage Sellers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('SubscriptionList')}
            >
              <Text style={styles.actionButtonText}>🔁 Subscriptions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('PaymentList')}
            >
              <Text style={styles.actionButtonText}>💳 Subscription Payments</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.getParent()?.navigate('ShopCustomers') || navigation.navigate('ShopCustomers')}
        >
          <Text style={styles.actionButtonText}>👥 Shop Customers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.getParent()?.navigate('IssuedCans') || navigation.navigate('IssuedCans')}
        >
          <Text style={styles.actionButtonText}>🧴 20 Litre Cans</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.getParent()?.navigate('ShopBuyers') || navigation.navigate('ShopBuyers')}
        >
          <Text style={styles.actionButtonText}>🧑‍🤝‍🧑 My Buyers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.getParent()?.navigate('PhoneOrder') || navigation.navigate('PhoneOrder')}
        >
          <Text style={styles.actionButtonText}>📞 Phone Order</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.getParent()?.navigate('ShopProfile') || navigation.navigate('ShopProfile')}
        >
          <Text style={styles.actionButtonText}>🧾 Shop Profile / QR</Text>
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
  companyCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: '#E8F1FC',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  companyCode: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginVertical: spacing.xs,
  },
  reminderCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  reminderTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  reminderCopy: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  dismissHint: {
    color: colors.warning,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
  },
  reminderButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warning,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  reminderButtonText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shopBrand: {
    marginBottom: spacing.sm,
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
  noticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeText: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  noticeAction: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
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
  chartCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  chartHint: {
    color: colors.textSecondary,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.md,
  },
  platformStatCard: {
    width: '100%',
    alignItems: 'center',
    padding: spacing.lg,
  },
  platformSection: {
    marginBottom: spacing.lg,
  },
  healthCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  healthRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  attentionItem: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
});

const HealthBtn = ({ label, value, onPress }: { label: string; value: number; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={{ flexGrow: 1, minWidth: '45%', backgroundColor: colors.gray50, borderRadius: 8, padding: spacing.md }}>
    <Text style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.primary }}>{value}</Text>
    <Text style={{ color: colors.textSecondary }}>{label}</Text>
  </TouchableOpacity>
);

