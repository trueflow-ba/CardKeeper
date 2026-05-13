import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { insertContact } from "../db/database";
import { getDisplayName } from "../types";

interface Props {
  navigation: any;
}

export default function QRImportScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Camera Access Needed</Text>
        <Text style={styles.subtitle}>
          CardKeeper needs camera access to scan QR codes
        </Text>
        <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
          <Text style={styles.grantBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    if (!data.includes("BEGIN:VCARD")) {
      Alert.alert("Invalid QR", "This QR code doesn't contain a vCard contact", [
        { text: "OK", onPress: () => setScanned(false) },
      ]);
      return;
    }

    const contact = parseVCard(data);
    const display = getDisplayName(contact as any);

    Alert.alert(
      "Import Contact?",
      `${display}${contact.company ? `\n${contact.company}` : ""}`,
      [
        { text: "Cancel", style: "cancel", onPress: () => setScanned(false) },
        {
          text: "Import",
          onPress: async () => {
            try {
              await insertContact(contact);
              navigation.navigate("Contacts");
            } catch (err: any) {
              Alert.alert("Error", err.message);
              setScanned(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />
      <View style={styles.overlay}>
        <View style={styles.scanFrame}>
          <Text style={styles.scanText}>Align QR code within frame</Text>
        </View>
      </View>
    </View>
  );
}

function parseVCard(vcard: string): {
  id: string;
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
  cardImagePath: string | null;
} {
  const get = (key: string): string | null => {
    const regex = new RegExp(`^${key}[^:]*:(.+)$`, "m");
    const match = vcard.match(regex);
    return match ? match[1].trim() : null;
  };

  const getAll = (key: string): string[] => {
    const results: string[] = [];
    const regex = new RegExp(`^${key}[^:]*:(.+)$`, "gm");
    let match;
    while ((match = regex.exec(vcard)) !== null) {
      results.push(match[1].trim());
    }
    return results;
  };

  const fn = get("FN") || "";
  const nParts = (get("N") || "").split(";");
  const lastNameFromN = nParts[0] || null;
  const firstNameFromN = nParts[1] || null;

  // Prefer N field for structured name, fall back to parsing FN
  let firstName: string | null = firstNameFromN || null;
  let lastName: string | null = lastNameFromN || null;

  if (!firstName && fn) {
    const parts = fn.trim().split(/\s+/);
    firstName = parts[0] || null;
    lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
  }

  // Phone numbers
  const tels = getAll("TEL");
  let phone: string | null = tels[0] || null;
  let phone2: string | null = tels[1] || null;

  // URLs — separate website from linkedin
  const urls = getAll("URL");
  const socials = getAll("X-SOCIALPROFILE");
  let website: string | null = null;
  let linkedin: string | null = null;

  for (const u of urls) {
    if (u.toLowerCase().includes("linkedin")) {
      linkedin = u;
    } else {
      website = u;
    }
  }
  for (const s of socials) {
    if (s.toLowerCase().includes("linkedin") && !linkedin) {
      linkedin = s;
    }
  }

  return {
    id: `ck_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    firstName,
    lastName,
    title: get("TITLE"),
    company: get("ORG"),
    phone,
    phone2,
    email: get("EMAIL"),
    website,
    linkedin,
    address: get("ADR"),
    cardImagePath: null,
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  camera: { flex: 1 },
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  scanFrame: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderColor: "#6c5ce7",
    borderRadius: 16,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 16,
  },
  scanText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  subtitle: { color: "#888", fontSize: 14, textAlign: "center", marginBottom: 24 },
  grantBtn: { backgroundColor: "#6c5ce7", borderRadius: 12, paddingHorizontal: 32, paddingVertical: 16 },
  grantBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
