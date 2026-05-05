import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
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

      // Save image using new expo-file-system API
      const cardsDir = new Directory(Paths.document, "cards");
      if (!cardsDir.exists) {
        cardsDir.create({ intermediates: true });
      }

      const fileName = `card_${Date.now()}.jpg`;
      const cardFile = new File(cardsDir, fileName);
      cardFile.write(photo.base64, { encoding: "base64" });

      const deviceId = `device-${Date.now()}`;
      const result = await scanBusinessCard(photo.base64, "image/jpeg", deviceId);
      setPreview({ ...result, cardImagePath: cardFile.uri } as PreviewData);
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
      const id = `ck_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await insertContact({
        id,
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
      <ScrollView style={styles.container} contentContainerStyle={styles.previewContainer}>
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
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
        </View>
      </CameraView>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.flipButton}
          onPress={() => setFacing(facing === "back" ? "front" : "back")}
        >
          <Text style={styles.flipText}>Flip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.scanButton, scanning && styles.scanButtonDisabled]}
          onPress={handleScan}
          disabled={scanning}
        >
          {scanning ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <View style={styles.scanButtonInner} />
          )}
        </TouchableOpacity>

        <View style={{ width: 60 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  subtitle: { color: "#888", fontSize: 14, textAlign: "center", marginBottom: 24 },
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
  controls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#0a0a1a",
  },
  scanButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#6c5ce7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  scanButtonDisabled: { opacity: 0.5 },
  scanButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#6c5ce7",
  },
  flipButton: { padding: 12 },
  flipText: { color: "#fff", fontSize: 14 },
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
