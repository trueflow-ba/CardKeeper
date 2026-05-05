import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { CameraView } from "expo-camera";
import { insertContact } from "../db/database";
import { generateVCard } from "../utils/api";
import type { Contact } from "../types";

interface Props {
  navigation: any;
}

export default function QRImportScreen({ navigation }: Props) {
  const [scanned, setScanned] = useState(false);

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
    Alert.alert(
      "Import Contact?",
      `${contact.name || "Unknown"}${contact.company ? `\n${contact.company}` : ""}`,
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
  name: string | null;
  title: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  cardImagePath: string | null;
} {
  const get = (key: string): string | null => {
    const regex = new RegExp(`^${key}[^:]*:(.+)$`, "m");
    const match = vcard.match(regex);
    return match ? match[1].trim() : null;
  };

  return {
    id: `ck_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: get("FN"),
    title: get("TITLE"),
    company: get("ORG"),
    phone: get("TEL"),
    email: get("EMAIL"),
    website: get("URL"),
    address: get("ADR"),
    cardImagePath: null,
  };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  camera: { flex: 1 },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
});
