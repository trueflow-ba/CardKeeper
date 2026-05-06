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
  TextInput,
} from "react-native";
import * as Contacts from "expo-contacts";
import { getContactById, updateContact } from "../db/database";
import { generateVCard } from "../utils/api";
import QRCode from "react-native-qrcode-svg";

const APP_DOWNLOAD_URL = "https://mrjm.zo.space/cardkeeper";

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
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [showQR, setShowQR] = useState(false);
  const [showAppQR, setShowAppQR] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContact();
  }, [contactId]);

  const loadContact = async () => {
    const result = await getContactById(contactId);
    if (result) {
      const c: ContactData = {
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
      };
      setContact(c);
      setEditFields({
        name: c.name || "",
        title: c.title || "",
        company: c.company || "",
        phone: c.phone || "",
        email: c.email || "",
        website: c.website || "",
        address: c.address || "",
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

  const displayName = contact.name || contact.company || "Unknown";
  const avatarInitials = contact.name
    ? contact.name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : contact.company
    ? contact.company.trim().split(/\s+/).filter((w) => !["the","and","of","inc","llc","ltd","corp","co"].includes(w.toLowerCase().replace(".",""))).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || contact.company[0].toUpperCase()
    : "?";

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
      name: contact.name || contact.company || "",
      firstName: contact.name?.split(" ")[0] || contact.company?.split(" ")[0] || "",
      lastName: contact.name?.split(" ").slice(1).join(" ") || "",
      company: contact.company || undefined,
      jobTitle: contact.title || undefined,
      phoneNumbers: contact.phone ? [{ label: "work", number: contact.phone, id: "1" }] : undefined,
      emails: contact.email ? [{ label: "work", email: contact.email, id: "1" }] : undefined,
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
      await Share.share({ message: vCardData, title: displayName });
    } catch {}
  };

  const handleSaveEdits = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateContact(contact.id, {
        name: editFields.name || null,
        title: editFields.title || null,
        company: editFields.company || null,
        phone: editFields.phone || null,
        email: editFields.email || null,
        website: editFields.website || null,
        address: editFields.address || null,
      });
      await loadContact();
      setEditing(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const fieldDefs = [
    { key: "name", label: "Name", icon: "👤", action: undefined as (() => void) | undefined },
    { key: "title", label: "Title", icon: "💼", action: undefined },
    { key: "company", label: "Company", icon: "🏢", action: undefined },
    { key: "phone", label: "Phone", icon: "📞", action: editing ? undefined : handleCall },
    { key: "email", label: "Email", icon: "✉️", action: editing ? undefined : handleEmail },
    { key: "website", label: "Website", icon: "🌐", action: editing ? undefined : handleWebsite },
    { key: "address", label: "Address", icon: "📍", action: editing ? undefined : handleAddress },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{avatarInitials}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        {contact.name && contact.company && (
          <Text style={styles.companyText}>{contact.company}</Text>
        )}
        {contact.title && <Text style={styles.titleText}>{contact.title}</Text>}
      </View>

      <TouchableOpacity
        style={styles.editToggle}
        onPress={() => {
          if (editing) {
            handleSaveEdits();
          } else {
            setEditing(true);
          }
        }}
        disabled={saving}
      >
        <Text style={styles.editToggleText}>
          {editing ? (saving ? "Saving..." : "✓ Save Changes") : "✏️ Edit Contact"}
        </Text>
      </TouchableOpacity>

      {editing && (
        <TouchableOpacity
          style={styles.cancelEditBtn}
          onPress={() => {
            setEditFields({
              name: contact.name || "",
              title: contact.title || "",
              company: contact.company || "",
              phone: contact.phone || "",
              email: contact.email || "",
              website: contact.website || "",
              address: contact.address || "",
            });
            setEditing(false);
          }}
        >
          <Text style={styles.cancelEditText}>Cancel</Text>
        </TouchableOpacity>
      )}

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
        {fieldDefs.map((field) => {
          const value = (contact as any)[field.key];
          if (!value && !editing) return null;

          if (editing) {
            return (
              <View key={field.key} style={styles.editFieldCard}>
                <Text style={styles.fieldIcon}>{field.icon}</Text>
                <View style={styles.editFieldContent}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editFields[field.key] || ""}
                    onChangeText={(text) =>
                      setEditFields({ ...editFields, [field.key]: text })
                    }
                    placeholder={field.label}
                    placeholderTextColor="#555"
                    autoCapitalize={field.key === "email" || field.key === "website" ? "none" : "words"}
                    keyboardType={
                      field.key === "email" ? "email-address" :
                      field.key === "phone" ? "phone-pad" :
                      field.key === "website" ? "url" : "default"
                    }
                  />
                </View>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={field.key}
              style={styles.fieldCard}
              onPress={field.action}
              activeOpacity={field.action ? 0.6 : 1}
            >
              <Text style={styles.fieldIcon}>{field.icon}</Text>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <Text style={[styles.fieldValue, field.action && styles.fieldValueLinked]}>
                  {value}
                </Text>
              </View>
              {field.action && <Text style={styles.fieldArrow}>›</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.qrToggle}
        onPress={() => setShowQR(!showQR)}
      >
        <Text style={styles.qrToggleText}>
          {showQR ? "Hide Contact QR Code" : "Show Contact QR Code"}
        </Text>
      </TouchableOpacity>

      {showQR && (
        <View style={styles.qrContainer}>
          <Text style={styles.qrTitle}>Share Contact</Text>
          <QRCode value={vCardData} size={220} color="#1a1a2e" backgroundColor="#fff" />
          <Text style={styles.qrHint}>
            Other CardKeeper users can scan this to import this contact
          </Text>
          <TouchableOpacity
            style={styles.shareQRButton}
            onPress={() => Share.share({ message: `Scan this QR to add ${displayName} to CardKeeper!`, url: vCardData })}
          >
            <Text style={styles.shareQRButtonText}>Share QR</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.qrToggle, styles.appQrToggle]}
        onPress={() => setShowAppQR(!showAppQR)}
      >
        <Text style={styles.qrToggleText}>
          {showAppQR ? "Hide App Download QR" : "Show App Download QR"}
        </Text>
      </TouchableOpacity>

      {showAppQR && (
        <View style={styles.qrContainer}>
          <Text style={styles.qrTitle}>Get CardKeeper</Text>
          <QRCode value={APP_DOWNLOAD_URL} size={220} color="#6c5ce7" backgroundColor="#fff" />
          <Text style={styles.qrHint}>Scan to download CardKeeper</Text>
          <TouchableOpacity
            style={styles.shareQRButton}
            onPress={() => Share.share({ message: `Get CardKeeper: ${APP_DOWNLOAD_URL}` })}
          >
            <Text style={styles.shareQRButtonText}>Share Download Link</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleSaveToDevice}>
          <Text style={styles.actionButtonText}>Save to Phone</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.actionSecondary]} onPress={handleShare}>
          <Text style={styles.actionButtonText}>Share vCard</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Image
          source={require("../../assets/images/trueflow-logo.png")}
          style={styles.footerLogo}
          resizeMode="contain"
        />
        <Text style={styles.footerText}>Powered by TrueFlow Business Automations</Text>
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
  companyText: { color: "#888", fontSize: 15, marginTop: 2, fontWeight: "500" },
  editToggle: {
    backgroundColor: "#6c5ce7",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  editToggleText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelEditBtn: {
    backgroundColor: "#2a2a4a",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  cancelEditText: { color: "#888", fontWeight: "600", fontSize: 14 },
  cardImageContainer: { marginBottom: 24 },
  sectionLabel: { color: "#6c5ce7", fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 8 },
  cardImage: { width: "100%", height: 180, borderRadius: 12, backgroundColor: "#1e1e2e" },
  fieldsContainer: { gap: 8, marginBottom: 24 },
  fieldCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e2e",
    borderRadius: 10,
    padding: 14,
    gap: 12,
  },
  fieldIcon: { fontSize: 20, width: 28 },
  fieldContent: { flex: 1 },
  fieldLabel: { color: "#6c5ce7", fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 2 },
  fieldValue: { color: "#ccc", fontSize: 15 },
  fieldValueLinked: { color: "#fff" },
  fieldArrow: { color: "#6c5ce7", fontSize: 22, fontWeight: "300" },
  editFieldCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e2e",
    borderRadius: 10,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#6c5ce7",
  },
  editFieldContent: { flex: 1 },
  editInput: {
    color: "#fff",
    fontSize: 15,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#6c5ce7",
  },
  qrToggle: {
    backgroundColor: "#1e1e2e",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  appQrToggle: { borderWidth: 1, borderColor: "#6c5ce7", borderStyle: "dashed" },
  qrToggleText: { color: "#6c5ce7", fontWeight: "600", fontSize: 15 },
  qrContainer: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  qrTitle: { color: "#1a1a2e", fontSize: 16, fontWeight: "700", marginBottom: 16 },
  qrHint: { color: "#888", fontSize: 12, marginTop: 12, textAlign: "center" },
  shareQRButton: {
    marginTop: 12,
    backgroundColor: "#6c5ce7",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  shareQRButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    paddingTop: 16,
    borderTopColor: "#1e1e2e",
    borderTopWidth: 1,
    gap: 10,
  },
  footerLogo: { width: 50, height: 50 },
  footerText: { color: "#555", fontSize: 12, fontWeight: "500", flex: 1 },
});
