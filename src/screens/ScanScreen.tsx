import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Paths, File, Directory } from "expo-file-system";
import { insertContact } from "../db/database";
import { scanBusinessCard } from "../utils/api";

interface Props {
  navigation: any;
}

interface PreviewData {
  rawText: string;
  contact: {
    name: string | null;
    title: string | null;
    company: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: string | null;
  };
  confidence: string;
  cardImagePath: string;
}

export default function ScanScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [facing, setFacing] = useState<CameraType>("back");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<any>(null);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Camera Access Needed</Text>
        <Text style={styles.subtitle}>
          CardKeeper needs camera access to scan business cards
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
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

  const processImage = async (base64: string, mimeType: string, imagePath: string) => {
    const deviceId = `device-${Date.now()}`;
    const result = await scanBusinessCard(base64, mimeType, deviceId);
    setPreview({ ...result, cardImagePath: imagePath } as PreviewData);
  };

  const handleScan = async () => {
    if (scanning || !cameraRef.current) return;
    setScanning(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        skipProcessing: false,
      });

      if (!photo?.base64) {
        Alert.alert("Error", "Failed to capture image");
        return;
      }

      const imagePath = saveBase64Image(photo.base64, "image/jpeg");
      await processImage(photo.base64, "image/jpeg", imagePath);
    } catch (err: any) {
      Alert.alert("Scan Error", err.message || "Failed to process card");
    } finally {
      setScanning(false);
    }
  };

  const handlePickImage = async () => {
    if (scanning) return;
    setScanning(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.[0]?.base64) {
        setScanning(false);
        return;
      }

      const asset = result.assets[0];
      const mimeType = asset.mimeType || "image/jpeg";
      const base64 = asset.base64 || "";
      if (!base64) {
        Alert.alert("Error", "Could not read image data");
        setScanning(false);
        return;
      }
      const imagePath = saveBase64Image(base64, mimeType);
      await processImage(base64, mimeType, imagePath);
    } catch (err: any) {
      Alert.alert("Import Error", err.message || "Failed to import image");
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!preview || saving) return;
    setSaving(true);

    try {
      await insertContact({
        name: preview.contact.name,
        title: preview.contact.title,
        company: preview.contact.company,
        phone: preview.contact.phone,
        email: preview.contact.email,
        website: preview.contact.website,
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
          <Text style={styles.confidence}>
            Confidence: {preview.confidence}
          </Text>

          <View style={styles.fieldGroup}>
            {(["name", "title", "company", "phone", "email", "website", "address"] as const).map(
              (field) => {
                const value = preview.contact[field];
                if (!value) return null;
                const labels: Record<string, string> = {
                  name: "Name",
                  title: "Title",
                  company: "Company",
                  phone: "Phone",
                  email: "Email",
                  website: "Website",
                  address: "Address",
                };
                return (
                  <View key={field} style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>{labels[field]}</Text>
                    <Text style={styles.fieldValue}>{value}</Text>
                  </View>
                );
              }
            )}
          </View>

          <Text style={styles.rawTextLabel}>Raw OCR Text:</Text>
          <Text style={styles.rawText}>{preview.rawText}</Text>

          <View style={styles.previewActions}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save Contact</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.retakeButton]}
              onPress={() => setPreview(null)}
            >
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
            <View style={styles.scanFrame} />
          </View>
        </CameraView>
      </View>

      <View style={styles.controlsBar}>
        <TouchableOpacity style={styles.controlBtn} onPress={() => setFacing(facing === "back" ? "front" : "back")}>
          <Text style={styles.controlIcon}>🔄</Text>
          <Text style={styles.controlLabel}>Flip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shutterBtn, scanning && styles.shutterDisabled]}
          onPress={handleScan}
          disabled={scanning}
        >
          {scanning ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, styles.galleryBtn]}
          onPress={handlePickImage}
          disabled={scanning}
        >
          <Text style={styles.controlIcon}>🖼</Text>
          <Text style={[styles.controlLabel, styles.galleryLabel]}>Gallery</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  scanFrame: {
    width: 280,
    height: 160,
    borderWidth: 2,
    borderColor: "#6c5ce7",
    borderRadius: 12,
    backgroundColor: "transparent",
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
  controlIcon: { fontSize: 24, marginBottom: 2 },
  controlLabel: { color: "#888", fontSize: 11, fontWeight: "600" },
  galleryBtn: {
    backgroundColor: "#1e1e2e",
    borderWidth: 2,
    borderColor: "#6c5ce7",
  },
  galleryLabel: { color: "#6c5ce7" },
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
  previewContainer: { padding: 20, paddingBottom: 60 },
  sectionTitle: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 4 },
  confidence: {
    color: "#6c5ce7",
    fontSize: 13,
    marginBottom: 20,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  fieldGroup: { gap: 12, marginBottom: 24 },
  fieldRow: {
    backgroundColor: "#1e1e2e",
    borderRadius: 10,
    padding: 14,
  },
  fieldLabel: { color: "#6c5ce7", fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 4 },
  fieldValue: { color: "#fff", fontSize: 16 },
  rawTextLabel: { color: "#888", fontSize: 12, fontWeight: "600", marginBottom: 4 },
  rawText: { color: "#555", fontSize: 12, backgroundColor: "#1a1a2e", borderRadius: 8, padding: 12, marginBottom: 24 },
  previewActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: { backgroundColor: "#6c5ce7" },
  retakeButton: { backgroundColor: "#444" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
