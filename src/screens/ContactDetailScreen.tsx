import React, { useState, useEffect, useRef } from "react";
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
  Modal,
  Dimensions,
  Animated,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { getContactById, updateContact, updateCardImageRotation } from "../db/database";
import { getDisplayName, getInitials } from "../types";
import { generateVCard } from "../utils/api";
import QRCode from "react-native-qrcode-svg";

const APP_DOWNLOAD_URL = "https://mrjm.zo.space/cardkeeper";

interface ContactData {
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
  cardImageRotation: number;
  createdAt: number;
  updatedAt: number;
}

interface Props {
  navigation: any;
  route: { params: { contactId: string } };
}

const FIELD_DEFS = [
  { key: "firstName", label: "First Name", icon: "👤", action: false },
  { key: "lastName", label: "Last Name", icon: "👤", action: false },
  { key: "title", label: "Title", icon: "💼", action: false },
  { key: "company", label: "Company", icon: "🏢", action: false },
  { key: "phone", label: "Phone", icon: "📞", action: true },
  { key: "phone2", label: "Phone 2", icon: "📱", action: true },
  { key: "email", label: "Email", icon: "✉️", action: true },
  { key: "website", label: "Website", icon: "🌐", action: true },
  { key: "linkedin", label: "LinkedIn", icon: "🔗", action: true },
  { key: "address", label: "Address", icon: "📍", action: true },
] as const;

type FieldKey = (typeof FIELD_DEFS)[number]["key"];

export default function ContactDetailScreen({ navigation, route }: Props) {
  const { contactId } = route.params;
  const [contact, setContact] = useState<ContactData | null>(null);
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [showQR, setShowQR] = useState(false);
  const [showAppQR, setShowAppQR] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [imageRotation, setImageRotation] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  // Pinch zoom state
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const baseScaleRef = useRef(1);
  const pinchStartDistRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const wasPinchingRef = useRef(false);
  const lastTapTimeRef = useRef(0);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapStartTimeRef = useRef(0);
  const tapStartXRef = useRef(0);
  const tapStartYRef = useRef(0);

  useEffect(() => {
    loadContact();
  }, [contactId]);

  const loadContact = async () => {
    const result = await getContactById(contactId);
    if (result) {
      const c: ContactData = {
        id: result.id,
        firstName: result.first_name,
        lastName: result.last_name,
        title: result.title,
        company: result.company,
        phone: result.phone,
        phone2: result.phone2,
        email: result.email,
        website: result.website,
        linkedin: result.linkedin,
        address: result.address,
        cardImagePath: result.card_image_path,
        cardImageRotation: result.card_image_rotation || 0,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      };
      setContact(c);
      setImageRotation(c.cardImageRotation);
      setEditFields({
        firstName: c.firstName || "",
        lastName: c.lastName || "",
        title: c.title || "",
        company: c.company || "",
        phone: c.phone || "",
        phone2: c.phone2 || "",
        email: c.email || "",
        website: c.website || "",
        linkedin: c.linkedin || "",
        address: c.address || "",
      });
    }
  };

  const closeFullscreenImage = () => {
    setFullscreenImage(null);
    setIsZoomed(false);
    scaleAnim.setValue(1);
    baseScaleRef.current = 1;
    if (singleTapTimeoutRef.current) {
      clearTimeout(singleTapTimeoutRef.current);
      singleTapTimeoutRef.current = null;
    }
  };

  const getTwoFingerDistance = (touches: any[]) => {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onImageTouchStart = (e: any) => {
    if (e.nativeEvent.touches.length === 2) {
      wasPinchingRef.current = true;
      pinchStartDistRef.current = getTwoFingerDistance(e.nativeEvent.touches);
      pinchStartScaleRef.current = baseScaleRef.current;
    } else if (e.nativeEvent.touches.length === 1) {
      tapStartTimeRef.current = Date.now();
      tapStartXRef.current = e.nativeEvent.touches[0].pageX;
      tapStartYRef.current = e.nativeEvent.touches[0].pageY;
    }
  };

  const onImageTouchMove = (e: any) => {
    if (e.nativeEvent.touches.length === 2 && pinchStartDistRef.current > 0) {
      wasPinchingRef.current = true;
      const currentDist = getTwoFingerDistance(e.nativeEvent.touches);
      const scaleRatio = currentDist / pinchStartDistRef.current;
      const newScale = Math.max(0.5, Math.min(5, pinchStartScaleRef.current * scaleRatio));
      scaleAnim.setValue(newScale);
      baseScaleRef.current = newScale;
    }
  };

  const onImageTouchEnd = (e: any) => {
    // If still touching with other fingers, don't process taps yet
    if (e.nativeEvent.touches.length > 0) return;

    const wasPinching = wasPinchingRef.current;
    wasPinchingRef.current = false;
    pinchStartDistRef.current = 0;

    if (wasPinching) {
      // Snap back if zoomed out too much
      if (baseScaleRef.current < 0.9) {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        baseScaleRef.current = 1;
        setIsZoomed(false);
      } else {
        setIsZoomed(baseScaleRef.current > 1.05);
      }
      return;
    }

    // Single/double tap detection
    const elapsed = Date.now() - tapStartTimeRef.current;
    if (elapsed > 300) return; // Not a tap (was a long press or drag)

    const now = Date.now();
    if (now - lastTapTimeRef.current < 300) {
      // Double tap — reset zoom
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
      baseScaleRef.current = 1;
      setIsZoomed(false);
      lastTapTimeRef.current = 0;
      return;
    }

    lastTapTimeRef.current = now;
    // Single tap — close after delay (to check for double tap)
    const tapTime = now;
    singleTapTimeoutRef.current = setTimeout(() => {
      if (lastTapTimeRef.current === tapTime) {
        closeFullscreenImage();
      }
    }, 320);
  };

  if (!contact) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  const displayName = getDisplayName(contact as any);
  const initials = getInitials(contact as any);

  const vCardData = generateVCard({
    firstName: contact.firstName,
    lastName: contact.lastName,
    title: contact.title,
    company: contact.company,
    phone: contact.phone,
    phone2: contact.phone2,
    email: contact.email,
    website: contact.website,
    linkedin: contact.linkedin,
    address: contact.address,
  });

  const getAction = (key: FieldKey): (() => void) | undefined => {
    if (editing) return undefined;
    switch (key) {
      case "phone":
      case "phone2":
        return () => {
          const raw = (contact as any)[key] as string | null;
          if (raw) {
            const digits = raw.replace(/^[A-Za-z]+[:.\s]*/i, "").trim();
            Linking.openURL(`tel:${digits}`);
          }
        };
      case "email":
        return () => { if (contact.email) Linking.openURL(`mailto:${contact.email}`); };
      case "website":
        return () => {
          if (contact.website) {
            let url = contact.website;
            if (!url.startsWith("http")) url = `https://${url}`;
            Linking.openURL(url);
          }
        };
      case "linkedin":
        return () => {
          if (contact.linkedin) {
            let url = contact.linkedin;
            if (!url.startsWith("http")) url = `https://${url}`;
            Linking.openURL(url);
          }
        };
      case "address":
        return () => {
          if (contact.address) {
            Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(contact.address!)}`);
          }
        };
      default:
        return undefined;
    }
  };

  const handleSaveToDevice = async () => {
    try {
      const fileName = `CardKeeper_${displayName.replace(/[^a-zA-Z0-9]/g, "_")}.vcf`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, vCardData);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(filePath, {
          mimeType: "text/vcard",
          dialogTitle: `Save ${displayName} to contacts`,
          UTI: "public.vcard",
        });
      } else {
        await Share.share({
          message: vCardData,
          title: displayName,
        });
        Alert.alert(
          "Save Manually",
          "Share the vCard to your contacts app to save it."
        );
      }
    } catch (err: any) {
      console.error("Save contact error:", err);
      Alert.alert(
        "Could Not Save",
        `Error: ${err?.message || "Unknown error"}.\n\nTry using "Share vCard" instead.`
      );
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
      });
      await loadContact();
      setEditing(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleRotateImage = async () => {
    const newRotation = (imageRotation + 90) % 360;
    setImageRotation(newRotation);
    if (contact) {
      try {
        await updateCardImageRotation(contact.id, newRotation);
      } catch (e) {
        console.warn("Failed to save rotation:", e);
      }
    }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          {contact.company && <Text style={styles.companyText}>{contact.company}</Text>}
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
                firstName: contact.firstName || "",
                lastName: contact.lastName || "",
                title: contact.title || "",
                company: contact.company || "",
                phone: contact.phone || "",
                phone2: contact.phone2 || "",
                email: contact.email || "",
                website: contact.website || "",
                linkedin: contact.linkedin || "",
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
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setFullscreenImage(contact.cardImagePath!);
                setIsZoomed(false);
                scaleAnim.setValue(1);
                baseScaleRef.current = 1;
              }}
            >
              <Image
                source={{ uri: contact.cardImagePath }}
                style={[styles.cardImage, { transform: [{ rotate: `${imageRotation}deg` }] }]}
                resizeMode="contain"
              />
              <View style={styles.tapHintOverlay}>
                <Text style={styles.tapHintText}>Tap to view full size</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.fieldsContainer}>
          {FIELD_DEFS.map((field) => {
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
                      autoCapitalize={
                        field.key === "email" || field.key === "website" || field.key === "linkedin"
                          ? "none"
                          : "words"
                      }
                      keyboardType={
                        field.key === "email"
                          ? "email-address"
                          : field.key === "phone" || field.key === "phone2"
                          ? "phone-pad"
                          : field.key === "website" || field.key === "linkedin"
                          ? "url"
                          : "default"
                      }
                    />
                  </View>
                </View>
              );
            }

            const action = getAction(field.key);
            return (
              <TouchableOpacity
                key={field.key}
                style={styles.fieldCard}
                onPress={action}
                activeOpacity={action ? 0.6 : 1}
              >
                <Text style={styles.fieldIcon}>{field.icon}</Text>
                <View style={styles.fieldContent}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <Text style={[styles.fieldValue, action && styles.fieldValueLinked]}>
                    {value}
                  </Text>
                </View>
                {action && <Text style={styles.fieldArrow}>›</Text>}
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
              onPress={() => Share.share({ message: `Scan this QR to add ${displayName} to CardKeeper!\n\n${vCardData}` })}
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
          <Text style={styles.footerText}>Powered by TrueFlow</Text>
          <Text style={styles.footerTagline}>Your local AI partner</Text>
        </View>
      </ScrollView>

      <Modal
        visible={!!fullscreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={closeFullscreenImage}
      >
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={closeFullscreenImage}
          >
            <Text style={styles.fullscreenCloseText}>✕</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rotateBtn}
            onPress={handleRotateImage}
          >
            <Text style={styles.rotateBtnText}>↻</Text>
          </TouchableOpacity>

          {fullscreenImage && (
            <View
              style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
              onTouchStart={onImageTouchStart}
              onTouchMove={onImageTouchMove}
              onTouchEnd={onImageTouchEnd}
            >
              <Animated.Image
                source={{ uri: fullscreenImage }}
                style={[
                  styles.fullscreenImage,
                  {
                    transform: [
                      { scale: scaleAnim },
                      { rotate: `${imageRotation}deg` },
                    ],
                  },
                ]}
                resizeMode="contain"
              />
              {!isZoomed && (
                <Text style={styles.pinchHint}>Pinch to zoom • Double-tap to reset</Text>
              )}
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a1a" },
  content: { padding: 20, paddingBottom: 60 },
  loading: { color: "#888", textAlign: "center", marginTop: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backBtn: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#1e1e2e",
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, gap: 6,
  },
  backIcon: { color: "#6c5ce7", fontSize: 18, fontWeight: "700" },
  backText: { color: "#6c5ce7", fontSize: 14, fontWeight: "600" },
  header: { alignItems: "center", marginBottom: 24 },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: "#6c5ce7",
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  avatarLargeText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  name: { color: "#fff", fontSize: 24, fontWeight: "700" },
  titleText: { color: "#6c5ce7", fontSize: 14, marginTop: 4 },
  companyText: { color: "#888", fontSize: 15, marginTop: 2, fontWeight: "500" },
  editToggle: {
    backgroundColor: "#6c5ce7", borderRadius: 12, padding: 14,
    alignItems: "center", marginBottom: 16,
  },
  editToggleText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelEditBtn: {
    backgroundColor: "#2a2a4a", borderRadius: 12, padding: 12,
    alignItems: "center", marginBottom: 16,
  },
  cancelEditText: { color: "#888", fontWeight: "600", fontSize: 14 },
  cardImageContainer: { marginBottom: 24 },
  sectionLabel: {
    color: "#6c5ce7", fontSize: 11, fontWeight: "600",
    textTransform: "uppercase", marginBottom: 8,
  },
  cardImage: { width: "100%", height: 220, borderRadius: 12, backgroundColor: "#1e1e2e" },
  tapHintOverlay: {
    position: "absolute", bottom: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  tapHintText: { color: "#ccc", fontSize: 10, fontWeight: "500" },
  fieldsContainer: { gap: 8, marginBottom: 24 },
  fieldCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#1e1e2e",
    borderRadius: 10, padding: 14, gap: 12,
  },
  fieldIcon: { fontSize: 20, width: 28 },
  fieldContent: { flex: 1 },
  fieldLabel: {
    color: "#6c5ce7", fontSize: 11, fontWeight: "600",
    textTransform: "uppercase", marginBottom: 2,
  },
  fieldValue: { color: "#ccc", fontSize: 15 },
  fieldValueLinked: { color: "#fff" },
  fieldArrow: { color: "#6c5ce7", fontSize: 22, fontWeight: "300" },
  editFieldCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#1e1e2e",
    borderRadius: 10, padding: 14, gap: 12,
    borderWidth: 1, borderColor: "#6c5ce7",
  },
  editFieldContent: { flex: 1 },
  editInput: {
    color: "#fff", fontSize: 15, paddingVertical: 4,
    borderBottomWidth: 1, borderBottomColor: "#6c5ce7",
  },
  qrToggle: {
    backgroundColor: "#1e1e2e", borderRadius: 10, padding: 14,
    alignItems: "center", marginBottom: 12,
  },
  appQrToggle: { borderWidth: 1, borderColor: "#6c5ce7", borderStyle: "dashed" },
  qrToggleText: { color: "#6c5ce7", fontWeight: "600", fontSize: 15 },
  qrContainer: {
    alignItems: "center", backgroundColor: "#fff",
    borderRadius: 16, padding: 24, marginBottom: 16,
  },
  qrTitle: { color: "#1a1a2e", fontSize: 16, fontWeight: "700", marginBottom: 16 },
  qrHint: { color: "#888", fontSize: 12, marginTop: 12, textAlign: "center" },
  shareQRButton: {
    marginTop: 12, backgroundColor: "#6c5ce7", borderRadius: 8,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  shareQRButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  actionButton: {
    flex: 1, backgroundColor: "#6c5ce7", borderRadius: 12,
    padding: 16, alignItems: "center",
  },
  actionSecondary: { backgroundColor: "#2a2a4a" },
  actionButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  footer: {
    alignItems: "center", justifyContent: "center",
    marginTop: 50, paddingTop: 24, paddingBottom: 40,
    borderTopWidth: 1, borderTopColor: "#1e1e2e",
  },
  footerLogo: { width: 120, height: 120, marginBottom: 2 },
  footerText: { color: "#888", fontSize: 12, fontWeight: "600" },
  footerTagline: { color: "#6c5ce7", fontSize: 11, fontWeight: "500", marginTop: 2 },
  fullscreenContainer: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center", alignItems: "center",
  },
  fullscreenClose: {
    position: "absolute", top: 50, right: 20, zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20,
    width: 40, height: 40, justifyContent: "center", alignItems: "center",
  },
  fullscreenCloseText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  rotateBtn: {
    position: "absolute", top: 50, left: 20, zIndex: 10,
    backgroundColor: "rgba(108, 92, 231, 0.5)", borderRadius: 20,
    width: 44, height: 44, justifyContent: "center", alignItems: "center",
  },
  rotateBtnText: { color: "#fff", fontSize: 24, fontWeight: "700" },
  fullscreenImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8 },
  pinchHint: {
    position: "absolute",
    bottom: 40,
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "500",
  },
});
