import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Modal, ScrollView, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing } from '../../theme';
import { Card, Loading, Button } from '../../components/common';
import { useGetAllUsersQuery, useDeleteUserMutation, useUpdateUserMutation, useActivateUserMutation, useDeactivateUserMutation } from '../../store/api/userApi';
import { User, UserRole } from '../../types';
import { formatDateTime } from '../../utils/formatters';
import { useAuth } from '../../hooks';

export const UserManagementScreen = () => {
  const navigation = useNavigation();
  const { user: currentUser, isStrictAdmin } = useAuth();
  const { data: users, isLoading, refetch, error } = useGetAllUsersQuery(undefined, {
    skip: !isStrictAdmin(), // Skip API call if not admin
  });
  const [deleteUser] = useDeleteUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [activateUser] = useActivateUserMutation();
  const [deactivateUser] = useDeactivateUserMutation();
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    email: '',
    phone: '',
    address: '',
    role: UserRole.BUYER,
    isActive: true, // Account Status: ACTIVE/INACTIVE
  });

  // Check if current user is admin (strict check - only ADMIN role)
  const isAdmin = isStrictAdmin();

  // Redirect if not admin
  useEffect(() => {
    if (currentUser && !isAdmin) {
      Alert.alert(
        'Access Denied',
        'You do not have permission to access this page. Only administrators can view and manage users.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to dashboard
              navigation.goBack();
            },
          },
        ]
      );
    }
  }, [currentUser, isAdmin, navigation]);

  // Don't render content if not admin
  if (!currentUser || !isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedText}>Access Denied</Text>
          <Text style={styles.accessDeniedSubtext}>
            You do not have permission to access this page.
          </Text>
          <Text style={styles.accessDeniedSubtext}>
            Only administrators can view and manage users.
          </Text>
        </View>
      </View>
    );
  }

  console.log('👥 UserManagement - users:', users);
  console.log('👥 UserManagement - isLoading:', isLoading);
  console.log('👥 UserManagement - error:', error);
  console.log('👥 UserManagement - users length:', users?.length);
  console.log('👥 UserManagement - first user:', users?.[0]);
  console.log('👥 UserManagement - users type:', typeof users, Array.isArray(users));

  const handleEditUser = (user: User) => {
    if (!isAdmin) {
      Alert.alert('Permission Denied', 'Only administrators can edit users.');
      return;
    }
    
    setSelectedUser(user);
    setEditForm({
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      role: user.role,
      isActive: user.isActive !== false, // Default to true if undefined (backward compatibility)
    });
    setShowEditModal(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    // Validation
    if (!editForm.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    try {
      console.log('✏️ Updating user:', selectedUser.id, editForm);
      
      // Prepare update data - backend expects User object but we only send fields to update
      const updateData: any = {
        email: editForm.email.trim(),
        role: editForm.role,
        isActive: editForm.isActive, // Account Status: ACTIVE/INACTIVE
      };

      // Include phone (can be empty string)
      updateData.phone = editForm.phone ? editForm.phone.trim() : null;

      // Include address (can be empty string)
      updateData.address = editForm.address ? editForm.address.trim() : null;
      
      // Prevent deactivating Admin accounts
      if (selectedUser.role === 'admin' && !editForm.isActive) {
        Alert.alert('Error', 'Cannot deactivate admin accounts. Admin accounts always have full access.');
        return;
      }

      console.log('📤 Sending update data:', updateData);

      await updateUser({
        id: selectedUser.id,
        data: updateData,
      }).unwrap();

      console.log('✅ User updated successfully');
      Alert.alert('Success', 'User updated successfully');
      setShowEditModal(false);
      refetch();
    } catch (error: any) {
      console.error('❌ Update failed:', error);
      Alert.alert('Error', `Failed to update user: ${error.data?.message || error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteUser = (id: number, username: string) => {
    if (!isAdmin) {
      Alert.alert('Permission Denied', 'Only administrators can delete users.');
      return;
    }

    Alert.alert(
      'Delete User',
      `Are you sure you want to delete user "${username}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting user:', id, username);
              await deleteUser(id).unwrap();
              console.log('✅ Delete successful');
              Alert.alert('Success', 'User deleted successfully');
              refetch();
            } catch (error: any) {
              console.error('❌ Delete failed:', error);
              Alert.alert('Error', `Failed to delete user: ${error.data?.message || error.message || 'Unknown error'}`);
            }
          },
        },
      ]
    );
  };

  const handleActivateUser = (id: number, username: string) => {
    if (!isAdmin) {
      Alert.alert('Permission Denied', 'Only administrators can activate users.');
      return;
    }

    Alert.alert(
      'Activate User',
      `Are you sure you want to activate user "${username}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            try {
              console.log('✅ Activating user:', id, username);
              await activateUser(id).unwrap();
              console.log('✅ Activation successful');
              Alert.alert('Success', 'User activated successfully');
              refetch();
            } catch (error: any) {
              console.error('❌ Activation failed:', error);
              Alert.alert('Error', `Failed to activate user: ${error.data?.message || error.message || 'Unknown error'}`);
            }
          },
        },
      ]
    );
  };

  const handleDeactivateUser = (id: number, username: string) => {
    if (!isAdmin) {
      Alert.alert('Permission Denied', 'Only administrators can deactivate users.');
      return;
    }

    // Safety check: Prevent deactivating Admin accounts
    const user = users?.find(u => u.id === id);
    if (user && user.role === 'admin') {
      Alert.alert('Permission Denied', 'Cannot deactivate admin accounts. Admin accounts always have full access.');
      return;
    }

    Alert.alert(
      'Deactivate User',
      `Are you sure you want to deactivate user "${username}"? This will immediately block their access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('❌ Deactivating user:', id, username);
              await deactivateUser(id).unwrap();
              console.log('✅ Deactivation successful');
              Alert.alert('Success', 'User deactivated successfully');
              refetch();
            } catch (error: any) {
              console.error('❌ Deactivation failed:', error);
              Alert.alert('Error', `Failed to deactivate user: ${error.data?.message || error.message || 'Unknown error'}`);
            }
          },
        },
      ]
    );
  };

  const getRoleBadgeColor = (role: string | UserRole) => {
    const roleStr = typeof role === 'string' ? role.toUpperCase() : String(role).toUpperCase();
    switch (roleStr) {
      case 'ADMIN':
        return colors.error;
      case 'SELLER':
        return colors.warning;
      case 'BUYER':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const getRoleIcon = (role: string | UserRole) => {
    const roleStr = typeof role === 'string' ? role.toUpperCase() : String(role).toUpperCase();
    switch (roleStr) {
      case 'ADMIN':
        return '👑';
      case 'SELLER':
        return '🏪';
      case 'BUYER':
        return '🛒';
      default:
        return '👤';
    }
  };

  const filteredUsers = selectedRole === 'ALL' 
    ? users 
    : users?.filter(u => {
        const userRole = typeof u.role === 'string' ? u.role.toUpperCase() : String(u.role).toUpperCase();
        return userRole === selectedRole;
      });

  const renderUser = ({ item }: { item: User }) => {
    const isActive = item.isActive !== false; // Default to true if undefined (backward compatibility)
    const status = item.status || 'APPROVED'; // Default status
    
    return (
    <Card style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <View style={styles.userTitleRow}>
            <Text style={styles.roleIcon}>{getRoleIcon(item.role)}</Text>
            <Text style={styles.username}>{item.username}</Text>
          </View>
          <View style={styles.badgeContainer}>
            <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.role) }]}>
              <Text style={styles.roleBadgeText}>
                {typeof item.role === 'string' ? item.role.toUpperCase() : String(item.role).toUpperCase()}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isActive ? colors.success : colors.error }]}>
              <Text style={styles.statusBadgeText}>
                {isActive ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.userDetails}>
        {!!item.shopName && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>🏪 Shop:</Text>
            <Text style={styles.detailValue}>{item.shopName}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📧 Email:</Text>
          <Text style={styles.detailValue}>{item.email || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📱 Phone:</Text>
          <Text style={styles.detailValue}>{item.phone || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📍 Address:</Text>
          <Text style={styles.detailValue} numberOfLines={2}>
            {item.address || 'N/A'}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>📅 Created:</Text>
          <Text style={styles.detailValue}>
            {item.createdAt ? formatDateTime(item.createdAt) : 'N/A'}
          </Text>
        </View>
        
        {item.createdBy && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>👤 Created By:</Text>
            <Text style={styles.detailValue}>{item.createdBy}</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {isAdmin && (
          <>
            {/* Activate/Deactivate buttons - Only for Seller and Buyer accounts */}
            {/* Admin accounts always have full access and cannot be deactivated */}
            {item.role !== 'admin' && (
              <>
                {!isActive ? (
                  <TouchableOpacity
                    style={styles.activateButton}
                    onPress={() => handleActivateUser(item.id, item.username)}
                  >
                    <Text style={styles.activateButtonText}>✅ Activate</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.deactivateButton}
                    onPress={() => handleDeactivateUser(item.id, item.username)}
                  >
                    <Text style={styles.deactivateButtonText}>❌ Deactivate</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditUser(item)}
            >
              <Text style={styles.editButtonText}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteUser(item.id, item.username)}
            >
              <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Card>
    );
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading users..." />;
  }

  if (error) {
    console.error('❌ UserManagement Error:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>❌ Failed to load users</Text>
        <Text style={styles.errorDetails}>{(error as any)?.data?.message || (error as any)?.message || 'Unknown error'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>🔄 Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Debug: Show raw data if users is not an array
  if (users && !Array.isArray(users)) {
    console.error('❌ Users is not an array!', users);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>⚠️ Data Format Error</Text>
        <Text style={styles.errorDetails}>
          Expected array but got: {typeof users}
        </Text>
        <Text style={styles.errorDetails}>
          {JSON.stringify(users, null, 2).substring(0, 200)}...
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>🔄 Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = {
    total: users?.length || 0,
    admins: users?.filter(u => u.role.toUpperCase() === 'ADMIN').length || 0,
    sellers: users?.filter(u => u.role.toUpperCase() === 'SELLER').length || 0,
    buyers: users?.filter(u => u.role.toUpperCase() === 'BUYER').length || 0,
  };

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.error }]}>
          <Text style={styles.statValue}>{stats.admins}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.warning }]}>
          <Text style={styles.statValue}>{stats.sellers}</Text>
          <Text style={styles.statLabel}>Sellers</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.success }]}>
          <Text style={styles.statValue}>{stats.buyers}</Text>
          <Text style={styles.statLabel}>Buyers</Text>
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {['ALL', 'ADMIN', 'SELLER', 'BUYER'].map((role) => (
          <TouchableOpacity
            key={role}
            style={[
              styles.filterButton,
              selectedRole === role && styles.filterButtonActive
            ]}
            onPress={() => setSelectedRole(role)}
          >
            <Text style={[
              styles.filterButtonText,
              selectedRole === role && styles.filterButtonTextActive
            ]}>
              {role === 'ALL' ? `All (${stats.total})` : `${role}S (${stats[role.toLowerCase() + 's' as keyof typeof stats]})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* User List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>👥 No users found</Text>
            <Text style={styles.emptySubtext}>
              {selectedRole !== 'ALL' ? `No ${selectedRole.toLowerCase()}s in the system` : 'No users registered yet'}
            </Text>
          </View>
        }
      />

      {/* Edit User Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.scrollModalContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit User</Text>
              <Text style={styles.modalSubtitle}>{selectedUser?.username}</Text>

              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                value={editForm.email}
                onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                placeholder="user@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={editForm.phone}
                onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                placeholder="1234567890"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editForm.address}
                onChangeText={(text) => setEditForm({ ...editForm, address: text })}
                placeholder="123 Main Street, City"
                multiline
                numberOfLines={3}
              />

              {isAdmin && (
                <>
                  <Text style={styles.inputLabel}>Role *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={editForm.role}
                      onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                      style={styles.picker}
                    >
                      <Picker.Item label="Buyer" value={UserRole.BUYER} />
                      <Picker.Item label="Seller" value={UserRole.SELLER} />
                      <Picker.Item label="Admin" value={UserRole.ADMIN} />
                    </Picker>
                  </View>

                  {/* Account Status - Only for Seller and Buyer */}
                  {selectedUser && selectedUser.role !== 'admin' && (
                    <>
                      <Text style={styles.inputLabel}>Account Status *</Text>
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={editForm.isActive ? 'ACTIVE' : 'INACTIVE'}
                          onValueChange={(value) => setEditForm({ ...editForm, isActive: value === 'ACTIVE' })}
                          style={styles.picker}
                        >
                          <Picker.Item label="ACTIVE" value="ACTIVE" />
                          <Picker.Item label="INACTIVE" value="INACTIVE" />
                        </Picker>
                      </View>
                    </>
                  )}
                </>
              )}

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  onPress={() => setShowEditModal(false)}
                  variant="outline"
                  style={styles.modalButton}
                />
                <Button
                  title="Update"
                  onPress={handleSaveUser}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.white,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.md,
  },
  userCard: {
    marginBottom: spacing.md,
  },
  userHeader: {
    marginBottom: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  userTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
    minWidth: 0,
  },
  roleIcon: {
    fontSize: typography.fontSize['2xl'],
  },
  username: {
    flexShrink: 1,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  userDetails: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
    width: 100,
  },
  detailValue: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  activateButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: 6,
  },
  activateButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  deactivateButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.warning,
    borderRadius: 6,
  },
  deactivateButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  deleteButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollModalContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  picker: {
    height: 50,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  accessDeniedText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  accessDeniedSubtext: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorDetails: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
});
