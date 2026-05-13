import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Paths, File, Directory } from "expo-file-system";
import { insertContact } from "../db/database";
import { scanBusinessCard } from "../utils/api";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Props {
  navigation: any;
}

interface PreviewData {
  rawText: string;
  contact: {
    firstName: string | null;
    lastName: string | null;
    title: string | null;
    company: string | null;
    phone: string | null;
    phone2: string | null;
    email: string | null;
    website: string | null;
    linkedin: string | null;
    address: string | null;
  };
  cardImagePath: string;
}

const FIELD_LABELS: Record<string, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  title: "Title",
  company: "Company",
  phone: "Phone",
  phone2: "Phone 2",
  email: "Email",
  website: "Website",
  linkedin: "LinkedIn",
  address: "Address",
};

export default function ScanScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [facing, setFacing] = useState<CameraType>("back");
  const [portraitMode, setPortraitMode] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<any>(null);

  const FRAME_WIDTH = portraitMode ? 180 : 300;
  const FRAME_HEIGHT = portraitMode ? 300 : 180;

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Camera Access Needed</Text>
        <Text style={styles.subtitle}>
          CardKeeper needs camera access to scan business cards
        </Text>
        <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
          <Text style={styles.grantBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const saveBase64Image = (base64: string, mimeType: string): string => {
    const cardsDir = new Directory(Paths.document, "cards");
    if (!cardsDir.exists) {
      cardsDir.create({ intermediates: true });
    }
    const ext = mimeType.includes("png") ? "png" : "jpg";
    const fileName = `card_${Date.now()}.${ext}`;
    const cardFile = new File(cardsDir, fileName);
    cardFile.write(base64, { encoding: "base64" });
    return cardFile.uri;
  };

  const handleScan = async () => {
    if (scanning || !cameraRef.current) return;
    setScanning(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: true,
        skipProcessing: false,
      });

      if (!photo?.base64 || !photo?.uri) {
        Alert.alert("Error", "Failed to capture image");
        setScanning(false);
        return;
      }

      const cameraHeight = SCREEN_HEIGHT - 120 - 44;
      const cameraWidth = SCREEN_WIDTH;

      const frameX = (cameraWidth - FRAME_WIDTH) / 2;
      const frameY = (cameraHeight - FRAME_HEIGHT) / 2;

      const photoWidth = photo.width || 3024;
      const photoHeight = photo.height || 4032;

      const scaleX = photoWidth / cameraWidth;
      const scaleY = photoHeight / cameraHeight;

      const cropX = Math.max(0, Math.floor(frameX * scaleX));
      const cropY = Math.max(0, Math.floor(frameY * scaleY));
      const cropWidth = Math.floor(FRAME_WIDTH * scaleX);
      const cropHeight = Math.floor(FRAME_HEIGHT * scaleY);

      let croppedUri = photo.uri;
      try {
        const cropped = await manipulateAsync(
          photo.uri,
          [{ crop: { originX: cropX, originY: cropY, width: cropWidth, height: cropHeight } }],
          { format: SaveFormat.JPEG, compress: 0.9 }
        );
        croppedUri = cropped.uri;
      } catch (cropError) {
        console.warn("Crop failed, using full image:", cropError);
      }

      let base64ForOCR = photo.base64;
      try {
        const croppedFile = new File(croppedUri);
        base64ForOCR = await croppedFile.base64();
      } catch {}

      const deviceId = `device-${Date.now()}`;
      const result = await scanBusinessCard(base64ForOCR, "image/jpeg", deviceId);

      let finalImagePath = croppedUri;
      const rotation = result.imageRotation || 0;
      if (rotation === 90 || rotation === 180 || rotation === 270) {
        try {
          const manipulated = await manipulateAsync(
            croppedUri,
            [{ rotate: rotation }],
            { format: SaveFormat.JPEG, compress: 0.9 }
          );
          finalImagePath = manipulated.uri;
        } catch {}
      }

      setPreview({ ...result, cardImagePath: finalImagePath } as PreviewData);
    } catch (err: any) {
      Alert.alert("Scan Error", err.message || "Failed to process card");
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!preview || saving) return;
    setSaving(true);

    try {
      await insertContact({
        firstName: preview.contact.firstName,
        lastName: preview.contact.lastName,
        title: preview.contact.title,
        company: preview.contact.company,
        phone: preview.contact.phone,
        phone2: preview.contact.phone2,
        email: preview.contact.email,
        website: preview.contact.website,
        linkedin: preview.contact.linkedin,
        address: preview.contact.address,
        cardImagePath: preview.cardImagePath,
      });
      setPreview(null);
      navigation.navigate("Contacts");
    } catch (err: any) {
      Alert.alert("Save Error", err.message || "Failed to save contact");
    } finally {
      setSaving(false);
    }
  };

  if (preview) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.previewContainer}>
          <Text style={styles.sectionTitle}>Scanned Information</Text>

          <View style={styles.fieldGroup}>
            {(
              ["firstName", "lastName", "title", "company", "phone", "phone2", "email", "website", "linkedin", "address"] as const
            ).map((field) => {
              const value = preview.contact[field];
              if (!value) return null;
              return (
                <View key={field} style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{FIELD_LABELS[field]}</Text>
                  <Text style={styles.fieldValue}>{value}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.previewActions}>
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Contact</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.retakeButton]} onPress={() => setPreview(null)}>
              <Text style={styles.buttonText}>Retake</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
          <View style={styles.overlay}>
            <View style={[styles.scanFrame, { width: FRAME_WIDTH, height: FRAME_HEIGHT }]} />
            <Text style={styles.frameHint}>Position card inside frame</Text>
          </View>
        </CameraView>
      </View>

      <View style={styles.controlsBar}>
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => setFacing(facing === "back" ? "front" : "back")}
        >
          <Text style={styles.controlIcon}>🔄</Text>
          <Text style={styles.controlLabel}>Flip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shutterBtn, scanning && styles.shutterDisabled]}
          onPress={handleScan}
          disabled={scanning}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, portraitMode && styles.portraitActive]}
          onPress={() => setPortraitMode(!portraitMode)}
        >
          <Text style={styles.controlIcon}>{portraitMode ? "📱" : "📐"}</Text>
          <Text style={[styles.controlLabel, portraitMode && styles.portraitLabel]}>Portrait</Text>
        </TouchableOpacity>
      </View>

      {scanning && (
        <View style={styles.scanningOverlay}>
          <ActivityIndicator color="#6c5ce7" size="large" />
          <Text style={styles.scanningText}>Analyzing Card...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scanFrame: {
    borderWidth: 3,
    borderColor: "#6c5ce7",
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  frameHint: {
    color: "#6c5ce7",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
  },
  controlsBar: {
    height: 120,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    backgroundColor: "#0a0a1a",
    borderTopWidth: 1,
    borderTopColor: "#1e1e2e",
    paddingHorizontal: 20,
  },
  controlBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: "#1e1e2e",
  },
  portraitActive: {
    backgroundColor: "#6c5ce7",
    borderWidth: 2,
    borderColor: "#fff",
  },
  portraitLabel: {
    color: "#fff",
  },
  controlIcon: { fontSize: 24, marginBottom: 2 },
  controlLabel: { color: "#888", fontSize: 11, fontWeight: "600" },
  shutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#6c5ce7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  shutterDisabled: { opacity: 0.5 },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#6c5ce7",
  },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  subtitle: { color: "#888", fontSize: 14, textAlign: "center", marginBottom: 24 },
  grantBtn: {
    backgroundColor: "#6c5ce7",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  grantBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  previewContainer: { padding: 20, paddingBottom: 60 },
  sectionTitle: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 16 },
  fieldGroup: { gap: 12, marginBottom: 24 },
  fieldRow: { backgroundColor: "#1e1e2e", borderRadius: 10, padding: 14 },
  fieldLabel: { color: "#6c5ce7", fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 4 },
  fieldValue: { color: "#fff", fontSize: 16 },
  previewActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  button: { flex: 1, padding: 16, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  saveButton: { backgroundColor: "#6c5ce7" },
  retakeButton: { backgroundColor: "#444" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 10, 26, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  scanningText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 20,
  },
});
