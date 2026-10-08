import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'qrcode';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { appShareLink, appShareMessage } from '../../utils/appShare';
import { openContact } from '../../utils/openContact';
import { showSuccessToast } from '../../utils/toast';

type Props = {
  companyCode?: string | null;
  companyName?: string | null;
  tone?: 'light' | 'solid';
};

export const ShareAppButton = ({ companyCode, companyName, tone = 'solid' }: Props) => {
  const code = String(companyCode || '').trim();
  const [showQr, setShowQr] = useState(false);
  const [qrImage, setQrImage] = useState('');
  const link = code ? appShareLink(code) : '';
  const message = code ? appShareMessage(companyName, code, link) : '';
  const light = tone === 'light';

  useEffect(() => {
    if (!showQr || !link) {
      return;
    }
    let active = true;
    QRCode.toDataURL(link, { width: 240, margin: 1, color: { dark: '#0232AA', light: '#FFFFFF' } })
      .then((image) => {
        if (active) {
          setQrImage(image);
        }
      })
      .catch(() => {
        if (active) {
          setQrImage('');
        }
      });
    return () => {
      active = false;
    };
  }, [showQr, link]);

  if (!code) {
    return null;
  }

  const copyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        showSuccessToast('Application link copied');
        return;
      }
    } catch (_error) {
      // Fall through to the share sheet.
    }
    showSuccessToast('Use WhatsApp to send this application link');
  };

  const downloadQr = async () => {
    if (!link) {
      return;
    }
    const image = await QRCode.toDataURL(link, {
      width: 768,
      margin: 2,
      color: { dark: '#0232AA', light: '#FFFFFF' },
    });
    const fileName = `natural-drops-${code}-qr.png`;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const anchor = document.createElement('a');
      anchor.href = image;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      showSuccessToast('QR code downloaded');
      return;
    }
    showSuccessToast('Open this page in the browser to download the QR code');
  };

  const shareLink = async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Natural Drops', text: message, url: link });
        return;
      } catch (_error) {
        // The user closed the share sheet.
        return;
      }
    }
    await copyLink();
    openContact(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  return (
    <>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.button, light ? styles.lightButton : styles.solidButton]}
          onPress={shareLink}
          accessibilityLabel="Share application link"
        >
          <Ionicons name="share-social-outline" size={18} color={light ? colors.white : colors.white} />
          <Text style={styles.buttonText}>Share app</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, light ? styles.lightButton : styles.solidButton]}
          onPress={() => setShowQr(true)}
          accessibilityLabel="Show application QR code"
        >
          <Ionicons name="qr-code-outline" size={18} color={colors.white} />
          <Text style={styles.buttonText}>QR code</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showQr} transparent animationType="fade" onRequestClose={() => setShowQr(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Share this seller</Text>
            <Text style={styles.copy}>
              Anyone who opens this link or scans this QR can create a buyer account only under {companyName || 'this seller'} ({code}).
            </Text>
            {!!qrImage && <Image source={{ uri: qrImage }} style={styles.qr} />}
            <Text style={styles.link} selectable>{link}</Text>
            <TouchableOpacity
              style={styles.sheetButton}
              onPress={downloadQr}
              accessibilityLabel="Download QR code"
            >
              <Text style={styles.sheetButtonText}>Download QR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetButton} onPress={shareLink}>
              <Text style={styles.sheetButtonText}>Share link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetButton} onPress={copyLink}>
              <Text style={styles.sheetButtonText}>Copy link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowQr(false)}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  button: {
    flex: 1,
    minHeight: 44,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  solidButton: {
    backgroundColor: colors.primary,
  },
  lightButton: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  buttonText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,17,17,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  copy: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  qr: {
    width: 220,
    height: 220,
    marginBottom: spacing.md,
  },
  link: {
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  sheetButton: {
    alignSelf: 'stretch',
    minHeight: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  sheetButtonText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  closeButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  closeText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
});
