import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, Modal, ScrollView, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing } from '../../theme';
import { Card, EmptyState, Loading, Button, ProductPhotoPlaceholder } from '../../components/common';
import { 
  useGetMenuItemsQuery, 
  useDeleteMenuItemMutation, 
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useAddProductImageMutation,
  useDeleteProductImageMutation,
} from '../../store/api/menuApi';
import { MenuItem, Category, ProductImage } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../hooks';
import { navigate } from '../../navigation/navigationRef';
import { useRoute, useFocusEffect } from '@react-navigation/native';

export const MenuManagementScreen = () => {
  const { data: products, isLoading, refetch, error } = useGetMenuItemsQuery();
  const [deleteMenuItem] = useDeleteMenuItemMutation();
  const [createMenuItem] = useCreateMenuItemMutation();
  const [updateMenuItem] = useUpdateMenuItemMutation();
  const [addProductImage] = useAddProductImageMutation();
  const [deleteProductImage] = useDeleteProductImageMutation();
  const { user } = useAuth();
  const isAdminAccount = user?.role === 'admin';
  const route = useRoute<any>();

  console.log('📦 MenuManagement - products:', products);
  console.log('📦 MenuManagement - isLoading:', isLoading);
  console.log('📦 MenuManagement - error:', error);
  console.log('📦 MenuManagement - products length:', products?.length);
  console.log('📦 MenuManagement - first product:', products?.[0]);
  
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [sellerFilter, setSellerFilter] = useState('ALL');
  const sellerOptions = useMemo(() => {
    const source = products;
    const names = new Set<string>();
    (source || []).forEach((item) => {
      const name = item.sellerName?.trim();
      if (name) names.add(name);
    });
    return Array.from(names).sort((left, right) => left.localeCompare(right));
  }, [products]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [imagePickerLoading, setImagePickerLoading] = useState(false);
  
  // Existing + new media (for preview before saving)
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);
  const [newImages, setNewImages] = useState<string[]>([]); // base64 data URLs

  // If we navigated here from PDP with an editProductId param, open edit modal automatically.
  useFocusEffect(
    React.useCallback(() => {
      const editProductId = route?.params?.editProductId;
      if (!editProductId || !products || !Array.isArray(products)) return;
      const target = products.find((p) => p.id === editProductId);
      if (!target) return;
      handleEditProduct(target);
    }, [route?.params?.editProductId, products])
  );
  
  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'water' as 'water' | 'beverage',
    rate: '',
    image: '',
    description: '',
  });

  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            performDelete(id, name);
          },
        },
      ]
    );
  };

  const performDelete = async (id: number, name: string) => {
    try {
      console.log('🗑️ Deleting product:', id, name);
      await deleteMenuItem(id).unwrap();
      console.log('✅ Delete successful');
      
      // Show success message
      Alert.alert('Success', 'Product deleted successfully');
      
      // Force refresh the product list
      await refetch();
    } catch (error: any) {
      console.error('❌ Delete failed:', error);
      console.error('❌ Error details:', error.data || error.message);
      const errorMessage = error?.data?.message || error?.message || 'Unknown error';
      
      Alert.alert('Error', `Failed to delete product: ${errorMessage}`);
    }
  };

  const handleAddProduct = () => {
    setEditMode(false);
    setSelectedItem(null);
    setProductForm({
      name: '',
      category: 'water',
      rate: '',
      image: '',
      description: '',
    });
    setExistingImages([]);
    setImagesToDelete([]);
    setNewImages([]);
    setShowProductModal(true);
  };

  const handleEditProduct = (item: MenuItem) => {
    setEditMode(true);
    setSelectedItem(item);
    // Get image from images array first, then fallback to image field
    const imageUrl = item.images?.[0]?.imageUrl || item.image || '';
    setProductForm({
      name: item.name,
      category: item.category as 'water' | 'beverage',
      rate: item.rate.toString(),
      image: imageUrl,
      description: (item.description ?? '') as string,
    });
    setExistingImages(item.images || []);
    setImagesToDelete([]);
    setNewImages([]);
    setShowProductModal(true);
  };

  const saveProduct = async () => {
    // Validation
    if (!productForm.name.trim()) {
      Alert.alert('Error', 'Please enter product name');
      return;
    }
    
    const rate = parseFloat(productForm.rate);
    
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    try {
      if (editMode && selectedItem) {
        const remainingExistingImages = existingImages.filter((img) => !imagesToDelete.includes(img.id));
        const hasExistingPrimary = remainingExistingImages.some((img) => !!img.isPrimary);
        const primaryFromExisting = remainingExistingImages.find((img) => !!img.isPrimary)?.imageUrl;
        const primaryFromNew = newImages[0];
        const effectivePrimaryImage = hasExistingPrimary ? (primaryFromExisting ?? '') : (primaryFromNew ?? remainingExistingImages[0]?.imageUrl ?? '');

        // Update existing product
        const updateData: any = {
          name: productForm.name,
          category: productForm.category as any,
          rate,
          description: productForm.description?.trim() ? productForm.description : null,
        };
        
        // Only include image if it's provided (not empty string)
        if (effectivePrimaryImage && effectivePrimaryImage.trim() !== '') {
          updateData.image = effectivePrimaryImage;
        } else {
          // If image is empty, set it to null to clear the image
          updateData.image = null;
        }
        
        console.log('🔄 Updating product with data:', { ...updateData, image: updateData.image ? '[IMAGE_DATA]' : 'null' });
        
        const updatedItem = await updateMenuItem({
          id: selectedItem.id,
          data: updateData,
        }).unwrap();

        // Apply deletions first
        for (const imageId of imagesToDelete) {
          await deleteProductImage({ menuItemId: selectedItem.id, imageId }).unwrap().catch(() => undefined);
        }

        for (let i = 0; i < newImages.length; i++) {
          await addProductImage({
            menuItemId: selectedItem.id,
            data: { imageUrl: newImages[i], isPrimary: !hasExistingPrimary && i === 0, displayOrder: i },
          }).unwrap();
        }
        
        console.log('✅ Product updated successfully:', updatedItem);
        console.log('🖼️ Updated image URL:', updatedItem.image);
        console.log('🖼️ Updated images array:', updatedItem.images);
        
        // Show success message
        Alert.alert('Success', 'Product updated successfully');
        
        // Force refresh the product list to show updated image
        console.log('🔄 Refetching product list after update...');
        await refetch();
        console.log('✅ Product list refetched');
        
        // Small delay to ensure UI updates
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Close modal after successful update
        setShowProductModal(false);
      } else {
        const effectivePrimaryImage = newImages[0] || productForm.image || undefined;

        // Create new product
        const created = await createMenuItem({
          name: productForm.name,
          category: productForm.category as any,
          rate,
          stockQuantity: 0,
          image: effectivePrimaryImage,
          description: productForm.description?.trim() ? productForm.description : null,
        }).unwrap();

        if (created?.id) {
          for (let i = 0; i < newImages.length; i++) {
            await addProductImage({
              menuItemId: created.id,
              data: { imageUrl: newImages[i], isPrimary: i === 0, displayOrder: i },
            }).unwrap();
          }
        }
        
        // Show success message
        Alert.alert('Success', 'Product created successfully');
        
        // Force refresh the product list
        await refetch();
        
        // Close modal after successful create
        setShowProductModal(false);
      }
    } catch (error: any) {
      console.error('❌ Save product error:', error);
      const errorMessage = error?.data?.message || error?.message || 'Failed to save product';
      
      Alert.alert('Error', errorMessage);
    }
  };

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      console.log('🔄 Converting image to base64...');
      
      // Fetch the image
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Convert to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          console.log('✅ Base64 conversion complete, size:', base64String.length);
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('❌ Base64 conversion failed:', error);
      throw error;
    }
  };

  const showMsg = (title: string, message: string) => {
    Alert.alert(title, message);
  };

  const pickImagesFromGallery = async () => {
    try {
      setImagePickerLoading(true);
      
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant photo library access to upload images.',
          [{ text: 'OK' }]
        );
        setImagePickerLoading(false);
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.5, // Reduced quality to keep base64 size manageable
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const picked = result.assets;
        const base64s: string[] = [];
        for (const a of picked) {
          const uri = a.uri;
          try {
            base64s.push(await convertImageToBase64(uri));
          } catch (e) {
            console.error('❌ Failed to convert image:', e);
          }
        }
        if (base64s.length > 0) {
          setNewImages((prev) => {
            const next = [...prev, ...base64s];
            // keep productForm.image synced as primary preview
            setProductForm((pf) => ({ ...pf, image: next[0] || '' }));
            return next;
          });
          showMsg('Success', `${base64s.length} photo(s) added.`);
        }
      }
      
      setImagePickerLoading(false);
    } catch (error) {
      console.error('❌ Error picking image:', error);
      showMsg('Error', 'Failed to pick images');
      setImagePickerLoading(false);
    }
  };

  const renderProduct = ({ item }: { item: MenuItem }) => {
    // Get image URL - prioritize primary image from images array, then fallback to image field
    let imageUrl: string | null = null;
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      const primary = item.images.find((img: any) => img.isPrimary || img.primary);
      imageUrl = primary?.imageUrl || primary?.url || item.images[0]?.imageUrl || (item.images[0] as any)?.url || null;
    }
    if (!imageUrl) imageUrl = (item as any).image || null;
    
    // FILTER OUT placeholder.com URLs immediately - don't even try to load them
    if (imageUrl && imageUrl.includes('via.placeholder.com')) {
      imageUrl = null; // Set to null so we show placeholder instead
    }
    
    // Add cache-busting parameter for external URLs to force refresh after update
    // For base64 data URLs, they're already unique and don't need cache-busting
    if (imageUrl && imageUrl.startsWith('http') && !imageUrl.includes('?')) {
      // Add timestamp to force browser to reload the image
      imageUrl = `${imageUrl}?t=${item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now()}`;
    }
    
    // Check if image URL is valid (not a blob URL, can be base64 data URL)
    // Also filter out external placeholder URLs that might not be reachable
    const imageUri = typeof imageUrl === 'string' ? imageUrl : undefined;
    const isBase64 = !!imageUri && imageUri.startsWith('data:image');
    const isExternalUrl = !!imageUri && imageUri.startsWith('http');
    const isPlaceholderUrl = !!imageUri && imageUri.includes('via.placeholder.com');
    // Only show image if it's base64 or if it's a valid external URL (not placeholder.com which may fail)
    // Double-check to ensure we never try to load placeholder.com URLs
    const isValidImageUrl = !!imageUri && !isPlaceholderUrl && (isBase64 || isExternalUrl);
    const isBeverage = String(item.category || '').toLowerCase() === 'beverage';
    
    return (
      <Card style={[styles.productCard, { borderLeftColor: isBeverage ? '#F59E0B' : colors.primary }]}>
        <View style={styles.productRow}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.productMain}
            onPress={() => {
              const role = user?.role;
              const routeName = role === 'admin' ? 'AdminProductDetail' : 'SellerProductDetail';
              navigate(routeName, { productId: item.id });
            }}
          >
            {isValidImageUrl ? (
              <View style={[styles.productImageContainer, { backgroundColor: isBeverage ? '#FFF7ED' : '#EFF6FF' }]}>
                <Image
                  key={`img-${item.id}-${item.updatedAt || item.createdAt || Date.now()}-${imageUri?.substring(0, 50)}`}
                  source={{
                    uri: imageUri,
                    cache: 'reload',
                  }}
                  style={styles.productImage}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={[styles.productImageContainer, { backgroundColor: isBeverage ? '#FFF7ED' : '#EFF6FF' }]}>
                <ProductPhotoPlaceholder size={72} />
              </View>
            )}

            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              {isAdminAccount && !!item.sellerName && (
                <Text style={styles.sellerName} numberOfLines={1}>{item.sellerName}</Text>
              )}
              <View style={[styles.categoryChip, { backgroundColor: isBeverage ? '#FEF3C7' : '#DBEAFE' }]}>
                <Text style={[styles.categoryChipText, { color: isBeverage ? '#92400E' : '#1D4ED8' }]}>
                  {item.category || 'Product'}
                </Text>
              </View>
              {!!item.description?.trim() && (
                <Text style={styles.productDescription} numberOfLines={1}>
                  {item.description.trim()}
                </Text>
              )}
              <Text style={styles.price}>{formatCurrency(item.rate)}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => handleEditProduct(item)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item.id, item.name)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading products..." />;
  }

  const displayProducts = isAdminAccount && sellerFilter !== 'ALL'
    ? (products || []).filter((item) => (item.sellerName || '').trim() === sellerFilter)
    : products;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddProduct}
        >
          <Text style={styles.addButtonText}>+ Add Product</Text>
        </TouchableOpacity>
      </View>

      {isAdminAccount && sellerOptions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sellerFilterRow}
          contentContainerStyle={styles.sellerFilterContent}
        >
          {['ALL', ...sellerOptions].map((name) => (
            <TouchableOpacity
              key={name}
              style={[styles.sellerChip, sellerFilter === name && styles.sellerChipActive]}
              onPress={() => setSellerFilter(name)}
            >
              <Text style={[styles.sellerChipText, sellerFilter === name && styles.sellerChipTextActive]}>
                {name === 'ALL' ? 'All sellers' : name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      
      <FlatList
        data={displayProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No products found"
            message="Add a product with a photo so buyers can see it in the shop."
            actionLabel="Add product"
            onAction={handleAddProduct}
          />
        }
      />

      {/* Product Add/Edit Modal */}
      <Modal
        visible={showProductModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.scrollModalContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editMode ? 'Edit Product' : 'Add New Product'}
              </Text>
              
              <Text style={styles.inputLabel}>Product Name *</Text>
              <TextInput
                style={styles.input}
                value={productForm.name}
                onChangeText={(text) => setProductForm({ ...productForm, name: text })}
                placeholder="e.g., 500ml Water"
              />

              <Text style={styles.inputLabel}>Product Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={productForm.description}
                onChangeText={(text) => setProductForm({ ...productForm, description: text })}
                placeholder="Enter product description…"
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{(productForm.description || '').length}/500</Text>
              
              <Text style={styles.inputLabel}>Category *</Text>
              <View style={styles.categoryButtons}>
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    productForm.category === 'water' && styles.categoryButtonActive
                  ]}
                  onPress={() => setProductForm({ ...productForm, category: 'water' })}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    productForm.category === 'water' && styles.categoryButtonTextActive
                  ]}>Water</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    productForm.category === 'beverage' && styles.categoryButtonActive
                  ]}
                  onPress={() => setProductForm({ ...productForm, category: 'beverage' })}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    productForm.category === 'beverage' && styles.categoryButtonTextActive
                  ]}>Beverage</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.inputLabel}>Price (₹) *</Text>
              <TextInput
                style={styles.input}
                value={productForm.rate}
                onChangeText={(text) => setProductForm({ ...productForm, rate: text })}
                keyboardType="decimal-pad"
                placeholder="e.g., 10.00"
              />
              
              <Text style={styles.inputLabel}>Product Photos</Text>

              {(existingImages.filter((img) => !imagesToDelete.includes(img.id)).length > 0 || newImages.length > 0) ? (
                <View style={styles.mediaGrid}>
                  {existingImages
                    .filter((img) => !imagesToDelete.includes(img.id))
                    .map((img) => (
                      <View
                        key={`ex-img-${img.id}`}
                        style={[
                          styles.mediaThumbWrap,
                          img.isPrimary && styles.mediaThumbPrimary,
                        ]}
                      >
                        <Image source={{ uri: img.imageUrl }} style={styles.mediaThumb} resizeMode="cover" />
                        <TouchableOpacity
                          style={styles.mediaRemoveBtn}
                          onPress={() => setImagesToDelete((prev) => [...prev, img.id])}
                        >
                          <Text style={styles.mediaRemoveText}>✕</Text>
                        </TouchableOpacity>
                        {img.isPrimary && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>Primary</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  {newImages.map((uri, idx) => (
                    <View
                      key={`new-img-${idx}`}
                      style={[
                        styles.mediaThumbWrap,
                        idx === 0 && existingImages.filter((img) => !imagesToDelete.includes(img.id)).every((img) => !img.isPrimary) && styles.mediaThumbPrimary,
                      ]}
                    >
                      <Image source={{ uri }} style={styles.mediaThumb} resizeMode="cover" />
                      <TouchableOpacity
                        style={styles.mediaRemoveBtn}
                        onPress={() => {
                          setNewImages((prev) => {
                            const next = prev.filter((_, i) => i !== idx);
                            setProductForm((pf) => ({ ...pf, image: next[0] || '' }));
                            return next;
                          });
                        }}
                      >
                        <Text style={styles.mediaRemoveText}>✕</Text>
                      </TouchableOpacity>
                      {idx === 0 && existingImages.filter((img) => !imagesToDelete.includes(img.id)).every((img) => !img.isPrimary) && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>Primary</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noImagePlaceholder}>
                  <Text style={styles.noImageText}>No photos selected</Text>
                  <Text style={styles.noImageSubtext}>Add one or more product photos</Text>
                </View>
              )}

              <View style={styles.imageButtonsRow}>
                <Button
                  title="+ Add More Photos"
                  onPress={pickImagesFromGallery}
                  variant="outline"
                  style={styles.imageButton}
                  loading={imagePickerLoading}
                  fullWidth
                />
              </View>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  onPress={() => setShowProductModal(false)}
                  variant="outline"
                  style={styles.modalButton}
                />
                <Button
                  title={editMode ? 'Update' : 'Create'}
                  onPress={saveProduct}
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
  header: {
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sellerFilterRow: {
    maxHeight: 48,
    marginBottom: spacing.sm,
  },
  sellerFilterContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  sellerChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sellerChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sellerChipText: {
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
  },
  sellerChipTextActive: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
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
  addButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.success,
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  listContent: {
    padding: spacing.md,
  },
  productCard: {
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    paddingVertical: spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  productImageContainer: {
    width: 84,
    height: 84,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productImage: {
    width: 68,
    height: 68,
  },
  productPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  placeholderEmoji: {
    fontSize: 40,
  },
  blobWarning: {
    fontSize: 8,
    color: colors.error,
    fontWeight: typography.fontWeight.bold,
    marginTop: 2,
  },
  productContent: {
    flex: 1,
    minWidth: 0,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  productName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 6,
  },
  categoryChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    textTransform: 'capitalize',
  },
  sellerName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  productDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  productCategory: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    marginBottom: spacing.xs,
  },
  textArea: {
    minHeight: 90,
    paddingTop: spacing.sm,
  },
  charCount: {
    marginTop: 4,
    marginBottom: spacing.sm,
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  price: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  stockLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  stockValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  lowStockBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: '#FFA726',
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    borderRadius: 4,
  },
  actions: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
    gap: spacing.sm,
  },
  editButton: {
    minWidth: 72,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  editButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  stockButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: 4,
    marginBottom: spacing.xs,
  },
  stockButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  deleteButton: {
    minWidth: 72,
    alignItems: 'center',
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 10,
  },
  deleteButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
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
    paddingVertical: spacing.xl,
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.xl,
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
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
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    marginBottom: spacing.sm,
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  categoryButtonTextActive: {
    color: colors.white,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  imagePreview: {
    width: 150,
    height: 150,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeImageButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.error,
    borderRadius: 4,
  },
  removeImageText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  imageButtonsRow: {
    marginBottom: spacing.sm,
  },
  imageButton: {
    marginBottom: spacing.sm,
  },
  helperText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  mediaThumbWrap: {
    width: 86,
    height: 86,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray100,
  },
  mediaThumbPrimary: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  primaryBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  primaryBadgeText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  mediaRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaRemoveText: {
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
    fontSize: 12,
  },
  noImagePlaceholder: {
    height: 150,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.background,
  },
  noImageText: {
    fontSize: typography.fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  noImageSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});


