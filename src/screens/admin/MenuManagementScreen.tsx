import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, Modal, ScrollView, Image, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { EmptyState, Loading, Button } from '../../components/common';
import { 
  useGetMenuItemsQuery, 
  useDeleteMenuItemMutation, 
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useUpdateStockMutation,
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
  const [updateStock] = useUpdateStockMutation();
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
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'water' | 'beverage'>('ALL');
  const [togglingStockId, setTogglingStockId] = useState<number | null>(null);
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

  const handleToggleStock = async (item: MenuItem, nextInStock: boolean) => {
    setTogglingStockId(item.id);
    try {
      const nextQuantity = nextInStock
        ? Math.max(item.stockQuantity || 0, 100)
        : 0;
      await updateStock({
        id: item.id,
        data: {
          quantity: nextQuantity,
          changedBy: user?.username || user?.role || 'seller',
          notes: nextInStock ? 'Marked in stock' : 'Marked out of stock',
        },
      }).unwrap();
      await refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to update stock';
      Alert.alert('Error', errorMessage);
    } finally {
      setTogglingStockId(null);
    }
  };

  const showProductActions = (item: MenuItem) => {
    Alert.alert(item.name, 'Choose an action', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Edit', onPress: () => handleEditProduct(item) },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item.id, item.name) },
    ]);
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
    const inStock = (item.stockQuantity ?? 0) > 0;
    const categoryLabel = isBeverage ? 'Beverage' : 'Water';
    const iconBg = isBeverage ? colors.warningTint : colors.secondary;
    
    return (
      <View style={styles.productRowCard}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.productRowMain}
          onPress={() => {
            const role = user?.role;
            const routeName = role === 'admin' ? 'AdminProductDetail' : 'SellerProductDetail';
            navigate(routeName, { productId: item.id });
          }}
          onLongPress={() => showProductActions(item)}
        >
          <View style={[styles.productIconBox, { backgroundColor: iconBg }]}>
            {isValidImageUrl ? (
              <Image
                key={`img-${item.id}-${item.updatedAt || item.createdAt || Date.now()}-${imageUri?.substring(0, 50)}`}
                source={{ uri: imageUri, cache: 'reload' }}
                style={styles.productIconImage}
                resizeMode="cover"
              />
            ) : (
              <Ionicons
                name={isBeverage ? 'cafe-outline' : 'water-outline'}
                size={24}
                color={colors.primary}
              />
            )}
          </View>

          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            {isAdminAccount && !!item.sellerName && (
              <Text style={styles.sellerName} numberOfLines={1}>{item.sellerName}</Text>
            )}
            <Text style={styles.productMetaLine} numberOfLines={1}>
              {categoryLabel} • {formatCurrency(item.rate)}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.stockToggleWrap}>
          <Text style={[styles.stockToggleLabel, !inStock && styles.stockToggleLabelOff]}>
            {inStock ? 'In stock' : 'Out of stock'}
          </Text>
          <Switch
            value={inStock}
            onValueChange={(value) => handleToggleStock(item, value)}
            disabled={togglingStockId === item.id}
            trackColor={{ false: colors.gray300, true: colors.primaryLight }}
            thumbColor={colors.white}
            ios_backgroundColor={colors.gray300}
          />
        </View>
      </View>
    );
  };

  const displayProducts = useMemo(() => (
    isAdminAccount && sellerFilter !== 'ALL'
      ? (products || []).filter((item) => (item.sellerName || '').trim() === sellerFilter)
      : (products || [])
  ), [isAdminAccount, sellerFilter, products]);

  const categoryCounts = useMemo(() => {
    const water = displayProducts.filter((item) => String(item.category || '').toLowerCase() === 'water').length;
    const beverage = displayProducts.filter((item) => String(item.category || '').toLowerCase() === 'beverage').length;
    return { all: displayProducts.length, water, beverage };
  }, [displayProducts]);

  const filteredProducts = useMemo(() => {
    if (categoryFilter === 'ALL') return displayProducts;
    return displayProducts.filter((item) => String(item.category || '').toLowerCase() === categoryFilter);
  }, [displayProducts, categoryFilter]);

  if (isLoading) {
    return <Loading fullScreen message="Loading products..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Products</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryTabsScroll}
        contentContainerStyle={styles.categoryTabsRow}
      >
        {([
          { id: 'ALL' as const, label: 'All', count: categoryCounts.all },
          { id: 'water' as const, label: 'Water', count: categoryCounts.water },
          { id: 'beverage' as const, label: 'Beverage', count: categoryCounts.beverage },
        ]).map((tab) => {
          const selected = categoryFilter === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.categoryTab, selected && styles.categoryTabActive]}
              onPress={() => setCategoryFilter(tab.id)}
            >
              <Text style={[styles.categoryTabText, selected && styles.categoryTabTextActive]}>{tab.label}</Text>
              <View style={[styles.categoryTabCount, selected && styles.categoryTabCountActive]}>
                <Text style={[styles.categoryTabCountText, selected && styles.categoryTabCountTextActive]}>
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
        data={filteredProducts}
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

      <TouchableOpacity style={styles.fab} onPress={handleAddProduct} activeOpacity={0.88}>
        <View style={styles.fabIcon}>
          <Ionicons name="add" size={18} color={colors.primary} />
        </View>
        <Text style={styles.fabText}>Add product</Text>
      </TouchableOpacity>

      {/* Product Add/Edit Modal — pro sheet */}
      <Modal
        visible={showProductModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={styles.dropMark}>
                  <View style={styles.dropMarkInner} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {editMode ? 'Edit product' : 'Add product'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {editMode ? 'Update name, price, and photos' : 'Name, category, price, and photos'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.sheetClose}
                onPress={() => setShowProductModal(false)}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollModalContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.sectionLabel}>Basics</Text>
              <Text style={styles.inputLabel}>Product name *</Text>
              <TextInput
                style={styles.input}
                value={productForm.name}
                onChangeText={(text) => setProductForm({ ...productForm, name: text })}
                placeholder="e.g., 500ml Water"
                placeholderTextColor={colors.gray400}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={productForm.description}
                onChangeText={(text) => setProductForm({ ...productForm, description: text })}
                placeholder="Short product description…"
                placeholderTextColor={colors.gray400}
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
                    productForm.category === 'water' && styles.categoryButtonActive,
                  ]}
                  onPress={() => setProductForm({ ...productForm, category: 'water' })}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      productForm.category === 'water' && styles.categoryButtonTextActive,
                    ]}
                  >
                    Water
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.categoryButton,
                    productForm.category === 'beverage' && styles.categoryButtonActive,
                  ]}
                  onPress={() => setProductForm({ ...productForm, category: 'beverage' })}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      productForm.category === 'beverage' && styles.categoryButtonTextActive,
                    ]}
                  >
                    Beverage
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionLabel}>Pricing</Text>
              <Text style={styles.inputLabel}>Price (₹) *</Text>
              <TextInput
                style={styles.input}
                value={productForm.rate}
                onChangeText={(text) => setProductForm({ ...productForm, rate: text })}
                keyboardType="decimal-pad"
                placeholder="e.g., 30.00"
                placeholderTextColor={colors.gray400}
              />

              <Text style={styles.sectionLabel}>Photos</Text>
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
                        idx === 0 &&
                          existingImages
                            .filter((img) => !imagesToDelete.includes(img.id))
                            .every((img) => !img.isPrimary) &&
                          styles.mediaThumbPrimary,
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
                      {idx === 0 &&
                        existingImages
                          .filter((img) => !imagesToDelete.includes(img.id))
                          .every((img) => !img.isPrimary) && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>Primary</Text>
                          </View>
                        )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noImagePlaceholder}>
                  <Ionicons name="image-outline" size={28} color={colors.blue300} />
                  <Text style={styles.noImageText}>No photos yet</Text>
                  <Text style={styles.noImageSubtext}>Add at least one product photo</Text>
                </View>
              )}

              <View style={styles.imageButtonsRow}>
                <Button
                  title="+ Add photos"
                  onPress={pickImagesFromGallery}
                  variant="outline"
                  style={styles.imageButton}
                  loading={imagePickerLoading}
                  fullWidth
                />
              </View>
            </ScrollView>

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
  screenHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  screenTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  categoryTabsScroll: {
    maxHeight: 56,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryTabsRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryTabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
  categoryTabTextActive: {
    color: colors.white,
  },
  categoryTabCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  categoryTabCountText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  categoryTabCountTextActive: {
    color: colors.white,
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
  listContent: {
    padding: spacing.md,
    paddingBottom: 96,
  },
  productRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  productRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 0,
    paddingRight: spacing.sm,
  },
  productIconBox: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productIconImage: {
    width: '100%',
    height: '100%',
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
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  productMetaLine: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  stockToggleWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 72,
  },
  stockToggleLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.success,
    marginBottom: 4,
    fontWeight: typography.fontWeight.semibold,
  },
  stockToggleLabelOff: {
    color: colors.error,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingLeft: 10,
    paddingRight: spacing.lg,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    ...shadows.lg,
  },
  fabIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.2,
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
    backgroundColor: 'rgba(17, 17, 17, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sheet,
    paddingTop: spacing.sm,
    overflow: 'hidden',
    ...shadows.xl,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray200,
    marginBottom: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  dropMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropMarkInner: {
    width: 14,
    height: 14,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 7,
    borderBottomRightRadius: 7,
    borderBottomLeftRadius: 7,
    transform: [{ rotate: '45deg' }],
  },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollModalContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: typography.fontSize.base,
    marginBottom: spacing.sm,
    backgroundColor: colors.gray50,
    color: colors.textPrimary,
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray50,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  categoryButtonTextActive: {
    color: colors.white,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  modalButton: {
    flex: 1,
  },
  imageButtonsRow: {
    marginBottom: spacing.sm,
  },
  imageButton: {
    marginBottom: spacing.xs,
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
    borderRadius: borderRadius.md,
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
    backgroundColor: colors.primary,
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
    backgroundColor: 'rgba(17,17,17,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaRemoveText: {
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
    fontSize: 12,
  },
  noImagePlaceholder: {
    minHeight: 120,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.blue300,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: '#F0F9FF',
    gap: 4,
    paddingVertical: spacing.lg,
  },
  noImageText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  noImageSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});


