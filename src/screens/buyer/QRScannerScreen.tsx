import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { colors, typography, spacing } from '../../theme';
import { Button } from '../../components/common';

export const QRScannerScreen = ({ navigation }: any) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    Alert.alert('QR Code Scanned', `Type: ${type}\nData: ${data}`, [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission denied</Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={styles.button}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      {scanned && (
        <Button
          title="Scan Again"
          onPress={() => setScanned(false)}
          style={styles.scanAgainButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.black,
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  text: {
    fontSize: typography.fontSize.base,
    color: colors.white,
    marginBottom: spacing.md,
  },
  button: {
    marginTop: spacing.md,
  },
  scanAgainButton: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
  },
});

