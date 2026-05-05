import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Linking,
  Share,
} from "react-native";
import * as Contacts from "expo-contacts";
import { getContactById } from "../db/database";
import { generateVCard } from "../utils/api";
import QRCode from "react-native-qrcode-svg";

interface ContactData {
  id: string;
  name: string | null;
  title: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  cardImagePath: string | null;
  createdAt: number;
  updatedAt: number;
}

interface Props {
  navigation: any;
  route: { params: { contactId: string } };
}

export default function ContactDetailScreen({ navigation, route }: Props) {
  const { contactId } = route.params;
  const [contact, setContact] = useState<ContactData | null>(null);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    loadContact();
  }, [contactId]);

  const loadContact = async () => {
    const result = await getContactById(contactId);
    if (result) {
      setContact({
        id: result.id,
        name: result.name,
        title: result.title,
        company: result.company,
        phone: result.phone,
        email: result.email,
        website: result.website,
        address: result.address,
        cardImagePath: result.card_image_path,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      });
    }
  };

  if (!contact) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  const vCardData = generateVCard({
    name: contact.name,
    title: contact.title,
    company: contact.company,
    phone: contact.phone,
    email: contact.email,
    website: contact.website,
    address: contact.address,
  });

  const handleCall = () => {
    if (contact.phone) Linking.openURL(`tel:${contact.phone}`);
  };

  const handleEmail = () => {
    if (contact.email) Linking.openURL(`mailto:${contact.email}`);
  };

  const handleWebsite = () => {
    if (contact.website) {
      let url = contact.website;
      if (!url.startsWith("http")) url = `https://${url}`;
      Linking.openURL(url);
    }
  };

  const handleAddress = () => {
    if (contact.address) {
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(contact.address)}`);
    }
  };

  const handleSaveToDevice = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Enable contacts permission to save");
      return;
    }

    const newContact: Contacts.Contact = {
      contactType: Contacts.ContactTypes.Person,
      name: contact.name || "",
      firstName: contact.name?.split(" ")[0] || "",
      lastName: contact.name?.split(" ").slice(1).join(" ") || "",
      company: contact.company || undefined,
      jobTitle: contact.title || undefined,
      phoneNumbers: contact.phone
        ? [{ label: "work", number: contact.phone, id: "1" }]
        : undefined,
      emails: contact.email
        ? [{ label: "work", email: contact.email, id: "1" }]
        : undefined,
      note: contact.address || undefined,
    };

    try {
      await Contacts.addContactAsync(newContact);
      Alert.alert("Saved", "Contact added to your phone");
    } catch {
      Alert.alert("Error", "Could not save to device contacts");
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: vCardData,
        title: contact.name || "Business Card",
      });
    } catch {}
  };

  const fields = [
    { label: "Phone", value: contact.phone, icon: "📞", action: handleCall },
    { label: "Email", value: contact.email, icon: "✉️", action: handleEmail },
    { label: "Website", value: contact.website, icon: "🌐", action: handleWebsite },
    { label: "Address", value: contact.address, icon: "📍", action: handleAddress },
    { label: "Title", value: contact.title, icon: "💼", action: undefined },
    { label: "Company", value: contact.company, icon: "🏢", action: undefined },
  ].filter((f) => f.value);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>
            {contact.name
              ? contact.name
                  .trim()
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "?"}
          </Text>
        </View>
        <Text style={styles.name}>{contact.name || "Unknown"}</Text>
        {contact.title && <Text style={styles.titleText}>{contact.title}</Text>}
        {contact.company && (
          <Text style={styles.companyText}>{contact.company}</Text>
        )}
      </View>

      {contact.cardImagePath && (
        <View style={styles.cardImageContainer}>
          <Text style={styles.sectionLabel}>Business Card</Text>
          <Image
            source={{ uri: contact.cardImagePath }}
            style={styles.cardImage}
            resizeMode="contain"
          />
        </View>
      )}

      <View style={styles.fieldsContainer}>
        {fields.map((field) => (
          <TouchableOpacity
            key={field.label}
            style={styles.fieldCard}
            onPress={field.action}
            activeOpacity={field.action ? 0.6 : 1}
          >
            <Text style={styles.fieldIcon}>{field.icon}</Text>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>{field.label}</Text>
              <Text
                style={[
                  styles.fieldValue,
                  field.action && styles.fieldValueLinked,
                ]}
              >
                {field.value}
              </Text>
            </View>
            {field.action && <Text style={styles.fieldArrow}>›</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.qrToggle}
        onPress={() => setShowQR(!showQR)}
      >
        <Text style={styles.qrToggleText}>
          {showQR ? "Hide QR Code" : "Show QR Code"}
        </Text>
      </TouchableOpacity>

      {showQR && (
        <View style={styles.qrContainer}>
          <QRCode
            value={vCardData}
            size={220}
            color="#1a1a2e"
            backgroundColor="#fff"
          />
          <Text style={styles.qrHint}>
            Scan this QR to import contact
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleSaveToDevice}>
          <Text style={styles.actionButtonText}>Save to Phone</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionSecondary]}
          onPress={handleShare}
        >
          <Text style={styles.actionButtonText}>Share vCard</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  content: { padding: 20, paddingBottom: 60 },
  loading: { color: "#888", textAlign: "center", marginTop: 40 },
  header: { alignItems: "center", marginBottom: 24 },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#6c5ce7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarLargeText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  name: { color: "#fff", fontSize: 24, fontWeight: "700" },
  titleText: { color: "#6c5ce7", fontSize: 14, marginTop: 4 },
  companyText: { color: "#888", fontSize: 14, marginTop: 2 },
  cardImageContainer: { marginBottom: 24 },
  sectionLabel: {
    color: "#6c5ce7",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  cardImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: "#1e1e2e",
  },
  fieldsContainer: { gap: 8, marginBottom: 24 },
  fieldCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e2e",
    borderRadius: 10,
    padding: 14,
    gap: 12,
  },
  fieldIcon: { fontSize: 18 },
  fieldContent: { flex: 1 },
  fieldLabel: {
    color: "#6c5ce7",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  fieldValue: { color: "#ccc", fontSize: 15 },
  fieldValueLinked: { color: "#fff" },
  fieldArrow: { color: "#6c5ce7", fontSize: 22, fontWeight: "300" },
  qrToggle: {
    backgroundColor: "#1e1e2e",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  qrToggleText: { color: "#6c5ce7", fontWeight: "600", fontSize: 15 },
  qrContainer: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  qrHint: { color: "#888", fontSize: 12, marginTop: 12 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  actionButton: {
    flex: 1,
    backgroundColor: "#6c5ce7",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  actionSecondary: { backgroundColor: "#2a2a4a" },
  actionButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
