import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  TextInput,
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

const FIELD_ORDER = [
  "firstName", "lastName", "title", "company",
  "phone", "phone2", "email", "website", "linkedin", "address",
] as const;

export default function GalleryScreen({ navigation }: Props) {
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [galleryPermission, setGalleryPermission] = useState<string | null>(null);
  const [permissionChecked, setPermissionChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      setGalleryPermission(status);
      setPermissionChecked(true);
    })();
  }, []);

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
      } catch (e) {}
    }

    const previewData: PreviewData = {
      rawText: result.rawText,
      contact: {
        firstName: result.contact.firstName,
        lastName: result.contact.lastName,
        title: result.contact.title,
        company: result.contact.company,
        phone: result.contact.phone,
        phone2: result.contact.phone2,
        email: result.contact.email,
        website: result.contact.website,
        linkedin: result.contact.linkedin,
        address: result.contact.address,
      },
      cardImagePath: finalImagePath,
    };

    setPreview(previewData);
    setEditFields({
      firstName: previewData.contact.firstName || "",
      lastName: previewData.contact.lastName || "",
      title: previewData.contact.title || "",
      company: previewData.contact.company || "",
      phone: previewData.contact.phone || "",
      phone2: previewData.contact.phone2 || "",
      email: previewData.contact.email || "",
      website: previewData.contact.website || "",
      linkedin: previewData.contact.linkedin || "",
      address: previewData.contact.address || "",
    });
  };

  const handlePickImage = async () => {
    if (scanning) return;

    if (galleryPermission !== "granted") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setGalleryPermission(status);
      if (status !== "granted") {
        Alert.alert(
          "Photo Access Needed",
          "Enable photo library access in Settings to import business card images",
        );
        return;
      }
    }

    setScanning(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
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
        firstName: editFields.firstName || null,
        lastName: editFields.lastName || null,
        title: editFields.title || null,
        company: editFields.company || null,
        phone: editFields.phone || null,
        phone2: editFields.phone2 || null,
        email: editFields.email || null,
        website: editFields.website || null,
        linkedin: editFields.linkedin || null,
        address: editFields.address || null,
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
          <Text style={styles.editHint}>Tap any field to correct before saving</Text>

          <View style={styles.fieldGroup}>
            {FIELD_ORDER.map((field) => {
              return (
                <View key={field} style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{FIELD_LABELS[field]}</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editFields[field] || ""}
                    onChangeText={(text) =>
                      setEditFields({ ...editFields, [field]: text })
                    }
                    placeholder={FIELD_LABELS[field]}
                    placeholderTextColor="#555"
                    autoCapitalize={
                      field === "email" || field === "website" || field === "linkedin"
                        ? "none"
                        : "words"
                    }
                    keyboardType={
                      field === "email"
                        ? "email-address"
                        : field === "phone" || field === "phone2"
                        ? "phone-pad"
                        : field === "website" || field === "linkedin"
                        ? "url"
                        : "default"
                    }
                  />
                </View>
              );
            })}
          </View>

          <View style={styles.previewActions}>
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Contact</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.retakeButton]} onPress={() => setPreview(null)}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!permissionChecked) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator color="#6c5ce7" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (galleryPermission !== "granted") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.icon}>🖼</Text>
          <Text style={styles.title}>Photo Access Needed</Text>
          <Text style={styles.subtitle}>
            CardKeeper needs photo library access to import business card images from your gallery
          </Text>
          <TouchableOpacity
            style={styles.pickButton}
            onPress={async () => {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              setGalleryPermission(status);
            }}
          >
            <Text style={styles.pickButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
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
  editHint: { color: "#6c5ce7", fontSize: 13, marginBottom: 16, fontWeight: "500" },
  fieldGroup: { gap: 8, marginBottom: 24 },
  fieldRow: {
    backgroundColor: "#1e1e2e",
    borderRadius: 10,
    padding: 12,
  },
  fieldLabel: {
    color: "#6c5ce7",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  editInput: {
    color: "#fff",
    fontSize: 15,
    paddingVertical: 2,
  },
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
