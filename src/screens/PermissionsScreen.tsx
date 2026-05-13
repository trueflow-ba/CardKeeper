import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import * as Contacts from "expo-contacts";
import { useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PERMISSIONS_KEY = "cardkeeper_permissions_granted";

interface PermissionItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  request: () => Promise<boolean>;
}

interface Props {
  onAllGranted: () => void;
}

export default function PermissionsScreen({ onAllGranted }: Props) {
  const [cameraPerm, requestCameraPerm] = useCameraPermissions();
  const [contactsStatus, setContactsStatus] = useState<string>("undetermined");
  const [galleryStatus, setGalleryStatus] = useState<string>("undetermined");
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    checkExistingPermissions();
  }, []);

  const checkExistingPermissions = async () => {
    try {
      const alreadyGranted = await AsyncStorage.getItem(PERMISSIONS_KEY);
      if (alreadyGranted === "true") {
        onAllGranted();
        return;
      }
    } catch {}

    const { status: contactsStatusVal } = await Contacts.getPermissionsAsync();
    setContactsStatus(contactsStatusVal);

    const { status: galleryStatusVal } =
      await ImagePicker.getMediaLibraryPermissionsAsync();
    setGalleryStatus(galleryStatusVal);

    if (
      cameraPerm?.granted &&
      contactsStatusVal === "granted" &&
      galleryStatusVal === "granted"
    ) {
      await AsyncStorage.setItem(PERMISSIONS_KEY, "true");
      onAllGranted();
    }
  };

  const requestContacts = async (): Promise<boolean> => {
    setRequesting("contacts");
    const { status } = await Contacts.requestPermissionsAsync();
    setContactsStatus(status);
    setRequesting(null);
    return status === "granted";
  };

  const requestGallery = async (): Promise<boolean> => {
    setRequesting("gallery");
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    setGalleryStatus(status);
    setRequesting(null);
    return status === "granted";
  };

  const requestCamera = async (): Promise<boolean> => {
    setRequesting("camera");
    const result = await requestCameraPerm();
    setRequesting(null);
    return result.granted;
  };

  const permissions: PermissionItem[] = [
    {
      id: "camera",
      icon: "📷",
      title: "Camera",
      description: "Scan business cards and QR codes to capture contact info",
      request: requestCamera,
    },
    {
      id: "contacts",
      icon: "📇",
      title: "Contacts",
      description: "Save scanned contacts directly to your phone's contact list",
      request: requestContacts,
    },
    {
      id: "gallery",
      icon: "🖼️",
      title: "Photo Library",
      description: "Import business card photos from your gallery",
      request: requestGallery,
    },
  ];

  const getStatus = (id: string): string => {
    if (id === "camera") return cameraPerm?.granted ? "granted" : cameraPerm?.status || "undetermined";
    if (id === "contacts") return contactsStatus;
    if (id === "gallery") return galleryStatus;
    return "undetermined";
  };

  const allGranted =
    cameraPerm?.granted &&
    contactsStatus === "granted" &&
    galleryStatus === "granted";

  const handleContinue = async () => {
    await AsyncStorage.setItem(PERMISSIONS_KEY, "true");
    onAllGranted();
  };

  const handleGrantAll = async () => {
    setRequesting("all");
    await requestCamera();
    await requestContacts();
    await requestGallery();
    setRequesting(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Image
            source={require("../../assets/images/trueflow-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>CardKeeper</Text>
          <Text style={styles.tagline}>Smart Business Card Scanner</Text>
        </View>

        <Text style={styles.sectionTitle}>Permissions Required</Text>
        <Text style={styles.sectionSub}>
          CardKeeper needs the following permissions to work properly. You can
          also grant them later from your phone's Settings.
        </Text>

        <View style={styles.permissionsList}>
          {permissions.map((perm) => {
            const status = getStatus(perm.id);
            const isGranted = status === "granted";
            const isRequesting =
              requesting === perm.id || requesting === "all";

            return (
              <View
                key={perm.id}
                style={[
                  styles.permCard,
                  isGranted && styles.permCardGranted,
                ]}
              >
                <Text style={styles.permIcon}>{perm.icon}</Text>
                <View style={styles.permInfo}>
                  <Text style={styles.permTitle}>{perm.title}</Text>
                  <Text style={styles.permDesc}>{perm.description}</Text>
                </View>
                {isGranted ? (
                  <View style={styles.grantedBadge}>
                    <Text style={styles.grantedText}>✓</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.grantBtn}
                    onPress={perm.request}
                    disabled={isRequesting}
                  >
                    {isRequesting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.grantBtnText}>Allow</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.noteBox}>
          <Text style={styles.noteIcon}>ℹ️</Text>
          <Text style={styles.noteText}>
            If you deny a permission, some features won't work until you enable
            them in Settings → Apps → CardKeeper → Permissions.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.continueBtn, !allGranted && styles.continueBtnPartial]}
          onPress={allGranted ? handleContinue : handleGrantAll}
          disabled={requesting !== null}
        >
          {requesting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.continueBtnText}>
              {allGranted ? "Continue" : "Grant All Permissions"}
            </Text>
          )}
        </TouchableOpacity>

        {!allGranted && (
          <TouchableOpacity onPress={handleContinue} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  content: { padding: 24, paddingBottom: 60 },
  hero: { alignItems: "center", marginBottom: 32, marginTop: 20 },
  logo: { width: 100, height: 100, marginBottom: 8 },
  appName: { color: "#fff", fontSize: 28, fontWeight: "800" },
  tagline: {
    color: "#6c5ce7",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  sectionSub: { color: "#888", fontSize: 14, lineHeight: 20, marginBottom: 20 },
  permissionsList: { gap: 14, marginBottom: 24 },
  permCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e2e",
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "#2a2a4a",
  },
  permCardGranted: { borderColor: "#6c5ce7", borderWidth: 1.5 },
  permIcon: { fontSize: 28, width: 38 },
  permInfo: { flex: 1 },
  permTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 2 },
  permDesc: { color: "#888", fontSize: 12, lineHeight: 17 },
  grantedBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#6c5ce7",
    justifyContent: "center",
    alignItems: "center",
  },
  grantedText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  grantBtn: {
    backgroundColor: "#6c5ce7",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 70,
    alignItems: "center",
  },
  grantBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  noteBox: {
    flexDirection: "row",
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#2a2a3e",
  },
  noteIcon: { fontSize: 18 },
  noteText: { color: "#777", fontSize: 12, lineHeight: 18, flex: 1 },
  continueBtn: {
    backgroundColor: "#6c5ce7",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  continueBtnPartial: { backgroundColor: "#4a3db5" },
  continueBtnText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  skipBtn: { alignSelf: "center", marginTop: 14, padding: 10 },
  skipBtnText: { color: "#666", fontSize: 14, fontWeight: "500" },
});
