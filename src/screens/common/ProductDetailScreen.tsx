import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { colors, spacing, typography } from '../../theme';
import { Card, Loading, ProductPhotoPlaceholder } from '../../components/common';
import { useGetMenuItemByIdQuery, useDeleteMenuItemMutation } from '../../store/api/menuApi';
import { useAuth, useCart } from '../../hooks';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { API_BASE_URL } from '../../utils/constants';
import { navigate } from '../../navigation/navigationRef';
import { UserRole } from '../../types';

// Inject web-specific scrollbar styles
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'product-detail-scrollbar-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Vertical scrollbar for main container */
      [data-scroll-container="product-detail"]::-webkit-scrollbar {
        width: 8px;
      }
      [data-scroll-container="product-detail"]::-webkit-scrollbar-track {
        background: ${colors.gray100};
        border-radius: 4px;
      }
      [data-scroll-container="product-detail"]::-webkit-scrollbar-thumb {
        background: ${colors.primary};
        border-radius: 4px;
      }
      [data-scroll-container="product-detail"]::-webkit-scrollbar-thumb:hover {
        background: ${colors.primary};
        opacity: 0.8;
      }
      [data-scroll-container="product-detail"] {
        scrollbar-width: thin;
        scrollbar-color: ${colors.primary} ${colors.gray100};
      }
      
      /* Horizontal scrollbar for thumbnails */
      [data-scroll-container="thumbnails"]::-webkit-scrollbar {
        height: 8px;
      }
      [data-scroll-container="thumbnails"]::-webkit-scrollbar-track {
        background: ${colors.gray100};
        border-radius: 4px;
      }
      [data-scroll-container="thumbnails"]::-webkit-scrollbar-thumb {
        background: ${colors.primary};
        border-radius: 4px;
      }
      [data-scroll-container="thumbnails"]::-webkit-scrollbar-thumb:hover {
        background: ${colors.primary};
        opacity: 0.8;
      }
      [data-scroll-container="thumbnails"] {
        scrollbar-width: thin;
        scrollbar-color: ${colors.primary} ${colors.gray100};
      }
      
      /* Horizontal scrollbar for videos */
      [data-scroll-container="videos"]::-webkit-scrollbar {
        height: 8px;
      }
      [data-scroll-container="videos"]::-webkit-scrollbar-track {
        background: ${colors.gray100};
        border-radius: 4px;
      }
      [data-scroll-container="videos"]::-webkit-scrollbar-thumb {
        background: ${colors.primary};
        border-radius: 4px;
      }
      [data-scroll-container="videos"]::-webkit-scrollbar-thumb:hover {
        background: ${colors.primary};
        opacity: 0.8;
      }
      [data-scroll-container="videos"] {
        scrollbar-width: thin;
        scrollbar-color: ${colors.primary} ${colors.gray100};
      }
    `;
    document.head.appendChild(style);
  }
}

const VideoTag: any = Platform.OS === 'web' ? 'video' : null;

function resolveAbsoluteMediaUrl(raw?: string | null) {
  if (!raw || typeof raw !== 'string') return undefined;
  const url = raw.trim();
  if (!url) return undefined;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const baseServerUrl = API_BASE_URL.replace('/api', '');
  if (url.startsWith('/') && !url.startsWith('//')) return `${baseServerUrl}${url}`;
  if (!url.startsWith('/')) return `${baseServerUrl}/${url}`;
  return url;
}

function isPrimaryImage(img: any) {
  return Boolean(img?.isPrimary ?? img?.primary);
}

function imageUrl(img: any) {
  return img?.imageUrl ?? img?.url;
}

function videoUrl(v: any) {
  return v?.videoUrl ?? v?.url;
}

export const ProductDetailScreen = ({ navigation }: any) => {
  const route = useRoute<any>();
  const { user } = useAuth();
  const isBuyer = user?.role === UserRole.BUYER || user?.role === 'buyer';
  const isSeller = user?.role === UserRole.SELLER || user?.role === 'seller';
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === 'admin';
  
  const mainScrollRef = useRef<any>(null);
  const thumbScrollRef = useRef<any>(null);
  const videoScrollRef = useRef<any>(null);

  // Get product ID from route params (works for both programmatic navigation and deep linking)
  // React Navigation deep linking automatically parses URL params into route.params
  const rawId = route?.params?.productId ?? route?.params?.id ?? route?.params?.product?.id;
  const productId = typeof rawId === 'string' ? Number(rawId) : rawId;

  // Debug logging
  useEffect(() => {
    console.log('🔍 ProductDetailScreen - Product ID:', productId);
    console.log('🔍 ProductDetailScreen - Route params:', route?.params);
    console.log('🔍 ProductDetailScreen - Raw ID:', rawId);
  }, [productId, route?.params, rawId]);

  // Fetch product data - MUST be declared before any useMemo or useEffect that uses it
  const { data: product, isLoading, error, refetch } = useGetMenuItemByIdQuery(productId, {
    skip: !productId || Number.isNaN(productId),
  });
  
  // Debug logging for API response
  useEffect(() => {
    if (product) {
      console.log('✅ ProductDetailScreen - Product loaded:', product.id, product.name);
    }
    if (error) {
      console.error('❌ ProductDetailScreen - Error:', error);
      console.error('❌ ProductDetailScreen - Error status:', (error as any)?.status);
      console.error('❌ ProductDetailScreen - Error data:', (error as any)?.data);
    }
  }, [product, error]);
  
  // Apply scrollbar styles to DOM elements on web
  // This doesn't depend on product data, just applies styles when component mounts
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const applyScrollbarStyles = () => {
        // Find scroll containers by nativeID or data attributes
        const mainContainer = mainScrollRef.current?.getNode?.() || mainScrollRef.current;
        const thumbContainer = thumbScrollRef.current?.getNode?.() || thumbScrollRef.current;
        const videoContainer = videoScrollRef.current?.getNode?.() || videoScrollRef.current;
        
        if (mainContainer) {
          const element = mainContainer._component || mainContainer;
          if (element && element.setAttribute) {
            element.setAttribute('data-scroll-container', 'product-detail');
          }
        }
        if (thumbContainer) {
          const element = thumbContainer._component || thumbContainer;
          if (element && element.setAttribute) {
            element.setAttribute('data-scroll-container', 'thumbnails');
          }
        }
        if (videoContainer) {
          const element = videoContainer._component || videoContainer;
          if (element && element.setAttribute) {
            element.setAttribute('data-scroll-container', 'videos');
          }
        }
      };
      
      // Apply styles after a short delay to ensure DOM is ready
      const timer = setTimeout(applyScrollbarStyles, 100);
      return () => clearTimeout(timer);
    }
  }, []); // Empty dependency array - only run once on mount

  const [deleteMenuItem] = useDeleteMenuItemMutation();

  const { addToCart, getItemQuantity, incrementQuantity, decrementQuantity } = useCart();

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [mainImageFailed, setMainImageFailed] = useState(false);

  // Safely process images with null checks
  const imagesSorted = useMemo(() => {
    if (!product) return [];
    const imgs = (product as any)?.images && Array.isArray((product as any).images) ? (product as any).images : [];
    const withUrl = imgs
      .map((img: any) => ({ ...img, _resolvedUrl: resolveAbsoluteMediaUrl(imageUrl(img)) }))
      .filter((img: any) => Boolean(img._resolvedUrl));

    withUrl.sort((a: any, b: any) => {
      const ap = isPrimaryImage(a) ? 1 : 0;
      const bp = isPrimaryImage(b) ? 1 : 0;
      if (ap !== bp) return bp - ap; // primary first
      const ao = Number(a.displayOrder ?? 0);
      const bo = Number(b.displayOrder ?? 0);
      if (ao !== bo) return ao - bo;
      return Number(a.id ?? 0) - Number(b.id ?? 0);
    });
    return withUrl;
  }, [product]);

  // Safely process videos with null checks
  const videosSorted = useMemo(() => {
    if (!product) return [];
    const vids = (product as any)?.videos && Array.isArray((product as any).videos) ? (product as any).videos : [];
    const withUrl = vids
      .map((v: any) => ({ ...v, _resolvedUrl: resolveAbsoluteMediaUrl(videoUrl(v)) }))
      .filter((v: any) => Boolean(v._resolvedUrl));
    withUrl.sort((a: any, b: any) => Number(a.id ?? 0) - Number(b.id ?? 0));
    return withUrl;
  }, [product]);

  // Safely get main image URI with null checks
  const mainImageUri = imagesSorted[selectedImageIdx]?._resolvedUrl || (product ? resolveAbsoluteMediaUrl((product as any)?.image) : undefined);
  const qty = productId ? getItemQuantity(productId) : 0;

  // Show loading state while fetching
  if (isLoading) {
    return <Loading fullScreen message="Loading product..." />;
  }

  // Check for invalid product ID
  if (!productId || Number.isNaN(productId)) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.errorContent}>
        <Card>
          <Text style={styles.title}>Product</Text>
          <Text style={styles.muted}>Invalid product link.</Text>
        </Card>
      </ScrollView>
    );
  }

  // Check for error state - only show error if we're not loading and there's an actual error
  // Don't show "Product not found" if we're still loading or if there's no error
  if (error && !isLoading) {
    const errorStatus = (error as any)?.status;
    const isNotFound = errorStatus === 404 || errorStatus === 'FETCH_ERROR';
    const errorMessage = (error as any)?.data?.message || (error as any)?.message || 'Product not found.';
    
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.errorContent}>
        <Card>
          <Text style={styles.title}>Product</Text>
          <Text style={styles.muted}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refetch} activeOpacity={0.8}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    );
  }

  // Check if product exists - only show "not found" if we've finished loading and product is null
  // This handles the case where the API returns success but with null/undefined data
  if (!product && !isLoading && !error) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.errorContent}>
        <Card>
          <Text style={styles.title}>Product</Text>
          <Text style={styles.muted}>Product not found.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refetch} activeOpacity={0.8}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    );
  }

  // If we're still loading or product is not yet available, show loading
  if (!product) {
    return <Loading fullScreen message="Loading product..." />;
  }

  const statusText = (product as any)?.status || 'ACTIVE';
  const sellerName = (product as any)?.seller?.name || (product as any)?.sellerName || 'Natural Drops';

  return (
    <ScrollView 
      ref={mainScrollRef}
      style={styles.container} 
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
      showsHorizontalScrollIndicator={false}
      bounces={true}
      scrollEnabled={true}
      nestedScrollEnabled={true}
      alwaysBounceVertical={false}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={styles.galleryCard}>
        <View style={styles.galleryWrap}>
          <View style={styles.mainImageWrap}>
            {mainImageUri && !mainImageFailed ? (
              <Image
                source={{ uri: mainImageUri }}
                style={styles.mainImage}
                resizeMode="contain"
                onError={() => setMainImageFailed(true)}
                onLoad={() => setMainImageFailed(false)}
              />
            ) : (
              <View style={styles.mainPlaceholder}>
                <ProductPhotoPlaceholder size={160} />
              </View>
            )}
          </View>

          {imagesSorted.length > 1 ? (
            <ScrollView 
              ref={thumbScrollRef}
              horizontal 
              showsHorizontalScrollIndicator={true}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.thumbRow}
              style={styles.thumbScrollView}
              nestedScrollEnabled={true}
              scrollEnabled={true}
              bounces={false}
              decelerationRate="fast"
            >
              {imagesSorted.map((img: any, idx: number) => {
                const uri = img._resolvedUrl;
                const selected = idx === selectedImageIdx;
                return (
                  <TouchableOpacity
                    key={`${img.id ?? uri}-${idx}`}
                    style={[styles.thumbWrap, selected && styles.thumbWrapSelected]}
                    onPress={() => {
                      setSelectedImageIdx(idx);
                      setMainImageFailed(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
        </View>

        <View style={styles.detailsWrap}>
          <Text style={styles.name}>{(product as any).name}</Text>
          {isAdmin && !!(product as any).sellerName && (
            <Text style={styles.meta}>Seller: {(product as any).sellerName}</Text>
          )}
          <Text style={styles.price}>{formatCurrency((product as any).rate || (product as any).price || 0)}</Text>
          <Text style={styles.meta}>
            Category: {(product as any).category || '—'}
            {'  '}|{'  '}
            Stock: {typeof (product as any).stockQuantity === 'number' ? (product as any).stockQuantity : (product as any).stock || '—'}
          </Text>
          <Text style={styles.meta}>
            Status: {statusText}
            {'  '}|{'  '}
            Created: {formatDateTime((product as any).createdAt)}
          </Text>

          {!!(product as any).description?.trim() && (
            <Text style={styles.desc}>{(product as any).description.trim()}</Text>
          )}

          <Text style={styles.seller}>Seller: {sellerName}</Text>

          {/* Buyer actions */}
          {isBuyer && (
            <>
              <View style={styles.qtyRow}>
                <Text style={styles.inCart}>In Cart: {qty}</Text>
                <View style={styles.qtyControl}>
                  <TouchableOpacity
                    style={[styles.qtyBtn, qty === 0 && styles.qtyBtnDisabled]}
                    onPress={() => {
                      if (qty > 0) decrementQuantity(productId);
                    }}
                    disabled={qty === 0}
                  >
                    <Text style={[styles.qtyBtnText, qty === 0 && styles.qtyBtnTextDisabled]}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{qty}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => {
                      if (qty === 0) addToCart(product as any, 1);
                      else incrementQuantity(productId);
                    }}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => {
                    if (qty === 0) addToCart(product as any, 1);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>Add to Cart</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => {
                    if (qty === 0) addToCart(product as any, 1);
                    const parentNav = navigation?.getParent?.();
                    if (parentNav?.navigate) parentNav.navigate('Cart');
                    else navigation.navigate('Cart');
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.secondaryBtnText}>Buy Now</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Seller/Admin actions */}
          {(isSeller || isAdmin) && (
            <View style={styles.adminActionRow}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  // Jump to product management tab and open edit modal
                  navigate('AdminApp', { screen: 'MenuManagement', params: { editProductId: productId } });
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Edit Product</Text>
              </TouchableOpacity>

              {isAdmin && (
                <TouchableOpacity
                  style={styles.dangerBtn}
                  onPress={async () => {
                    const doDelete = async () => {
                      try {
                        await deleteMenuItem(productId).unwrap();
                        navigate('AdminApp', { screen: 'MenuManagement' });
                      } catch (e: any) {
                        Alert.alert('Error', e?.data?.message || e?.message || 'Failed to delete product');
                      }
                    };

                    Alert.alert('Delete Product', 'Are you sure you want to delete this product?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: doDelete },
                    ]);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </Card>

      <Card style={styles.videoCard}>
        <Text style={styles.sectionTitle}>Product Videos</Text>
        {videosSorted.length > 0 ? (
          <ScrollView 
            ref={videoScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={true}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.videoList}
            style={styles.videoScrollView}
            nestedScrollEnabled={true}
            scrollEnabled={true}
            bounces={false}
            decelerationRate="fast"
          >
            {videosSorted.map((v: any, idx: number) => {
              const uri = v._resolvedUrl;
              if (!uri) return null;
              if (Platform.OS !== 'web' || !VideoTag) {
                return (
                  <View key={`${idx}`} style={styles.videoItem}>
                    <Text style={styles.muted} numberOfLines={1}>
                      🎥 {uri}
                    </Text>
                  </View>
                );
              }
              return (
                <View key={`${v.id ?? uri}-${idx}`} style={styles.videoItem}>
                  <VideoTag
                    src={uri}
                    controls
                    preload="none"
                    onError={() => {
                      // keep UI stable
                    }}
                    style={styles.videoPlayer}
                  />
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={styles.muted}>No videos</Text>
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    ...(Platform.OS === 'web' && {
      overflowY: 'auto',
      overflowX: 'hidden',
      WebkitOverflowScrolling: 'touch',
      height: '100%',
      minHeight: '100%',
      maxHeight: '100vh',
      position: 'relative',
      // Ensure container takes full viewport height minus header
      display: 'flex',
      flexDirection: 'column',
    } as any),
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2, // Extra padding at bottom for better scrolling
    flexGrow: 1,
    ...(Platform.OS === 'web' && {
      minHeight: 'auto', // Changed from '100%' to allow natural content height
      width: '100%',
      boxSizing: 'border-box',
    } as any),
  },
  errorContent: {
    padding: spacing.md,
    paddingTop: spacing.xl,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
    ...(Platform.OS === 'web' && {
      width: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    } as any),
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  muted: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  retryBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 10,
  },
  retryText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  galleryCard: {
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
    } as any),
  },
  galleryWrap: {
    gap: spacing.md,
  },
  mainImageWrap: {
    width: '100%',
    height: 320,
    maxHeight: 320,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray100,
    ...(Platform.OS === 'web' && {
      maxWidth: '100%',
      boxSizing: 'border-box',
    } as any),
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  mainPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 44,
  },
  thumbScrollView: {
    ...(Platform.OS === 'web' && {
      overflowX: 'auto',
      overflowY: 'hidden',
      WebkitOverflowScrolling: 'touch',
    } as any),
  },
  thumbRow: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    ...(Platform.OS === 'web' && {
      display: 'flex',
      flexDirection: 'row',
      whiteSpace: 'nowrap',
    } as any),
  },
  thumbWrap: {
    width: 74,
    height: 74,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.gray100,
  },
  thumbWrapSelected: {
    borderColor: colors.primary,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  detailsWrap: {
    marginTop: spacing.md,
    ...(Platform.OS === 'web' && {
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
    } as any),
  },
  name: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  price: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  meta: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  desc: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  seller: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  inCart: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
    fontWeight: typography.fontWeight.medium,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 999,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: {
    backgroundColor: colors.gray300,
  },
  qtyBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: typography.fontWeight.bold,
    lineHeight: 18,
  },
  qtyBtnTextDisabled: {
    color: colors.white,
    opacity: 0.9,
  },
  qtyValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginHorizontal: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  adminActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.base,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.base,
  },
  dangerBtn: {
    flex: 1,
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoCard: {
    marginTop: spacing.md,
    ...(Platform.OS === 'web' && {
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
    } as any),
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  videoScrollView: {
    ...(Platform.OS === 'web' && {
      overflowX: 'auto',
      overflowY: 'hidden',
      WebkitOverflowScrolling: 'touch',
    } as any),
  },
  videoList: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    ...(Platform.OS === 'web' && {
      display: 'flex',
      flexDirection: 'row',
      gap: spacing.md,
    } as any),
  },
  videoItem: {
    ...(Platform.OS === 'web' && {
      flexShrink: 0,
      width: '100%',
      maxWidth: '100%',
    } as any),
    ...(Platform.OS !== 'web' && {
      width: '100%',
      marginBottom: spacing.md,
    } as any),
  },
  videoPlayer: {
    width: '100%',
    maxHeight: 320,
    borderRadius: 12,
    marginTop: 10,
    ...(Platform.OS === 'web' && {
      width: '100%',
      maxWidth: '100%',
    } as any),
  },
});


