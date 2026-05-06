import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Paths, File, Directory } from "expo-file-system";
import { insertContact } from "../db/database";
import { scanBusinessCard } from "../utils/api";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

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
  cardImagePath: string;
}

export default function GalleryScreen({ navigation }: Props) {
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [saving, setSaving] = useState(false);

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
    
    // Auto-rotate image if OCR detected it's sideways
    let finalImagePath = imagePath;
    const rotation = (result as any).imageRotation || 0;
    if (rotation === 90 || rotation === 180 || rotation === 270) {
      try {
        const manipulated = await manipulateAsync(
          imagePath,
          [{ rotate: rotation }],
          { format: SaveFormat.JPEG, compress: 0.9 }
        );
        finalImagePath = manipulated.uri;
      } catch (e) {
        // If rotation fails, keep original
      }
    }
    
    setPreview({ ...result, cardImagePath: finalImagePath } as PreviewData);
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
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContent}>
        <Text style={styles.icon}>🖼</Text>
        <Text style={styles.title}>Import from Gallery</Text>
        <Text style={styles.subtitle}>
          Select a photo of a business card from your phone's gallery
        </Text>
        <TouchableOpacity
          style={styles.pickButton}
          onPress={handlePickImage}
          disabled={scanning}
        >
          {scanning ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <Text style={styles.pickButtonText}>Choose Photo</Text>
          )}
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
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 8 },
  subtitle: {
    color: "#888",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  pickButton: {
    backgroundColor: "#6c5ce7",
    borderRadius: 16,
    paddingHorizontal: 40,
    paddingVertical: 18,
  },
  pickButtonText: { color: "#fff", fontWeight: "700", fontSize: 18 },
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
  fieldLabel: {
    color: "#6c5ce7",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  fieldValue: { color: "#fff", fontSize: 16 },
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
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 10, 26, 0.8)",
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
