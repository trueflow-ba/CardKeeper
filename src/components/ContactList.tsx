import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getAllContacts, searchContacts, deleteContact } from "../db/database";
import type { Contact } from "../types";

interface Props {
  navigation: any;
  searchQuery: string;
}

export default function ContactList({ navigation, searchQuery }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadContacts = useCallback(async () => {
    try {
      const result = searchQuery
        ? await searchContacts(searchQuery)
        : await getAllContacts();
      setContacts(
        result.map((r: any) => ({
          id: r.id,
          name: r.name,
          title: r.title,
          company: r.company,
          phone: r.phone,
          email: r.email,
          website: r.website,
          address: r.address,
          cardImagePath: r.card_image_path,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }))
      );
    } catch (err) {
      console.error("Failed to load contacts:", err);
    }
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [loadContacts])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  }, [loadContacts]);

  const handleDelete = (contact: Contact) => {
    const displayName = contact.name || contact.company || "this contact";
    Alert.alert("Delete Contact", `Remove ${displayName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteContact(contact.id);
          loadContacts();
        },
      },
    ]);
  };

  const getDisplayName = (contact: Contact): string => {
    if (contact.name) return contact.name;
    if (contact.company) return contact.company;
    return "Unknown";
  };

  const getInitials = (contact: Contact): string => {
    if (contact.name) {
      const parts = contact.name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0][0].toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (contact.company) {
      const words = contact.company.trim().split(/\s+/);
      const meaningful = words.filter(
        (w) => !["the", "and", "of", "inc", "llc", "ltd", "corp", "co"].includes(w.toLowerCase().replace(".", ""))
      );
      if (meaningful.length >= 2) return (meaningful[0][0] + meaningful[1][0]).toUpperCase();
      return words[0][0].toUpperCase();
    }
    return "?";
  };

  const renderItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("ContactDetail", { contactId: item.id })
      }
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(item)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{getDisplayName(item)}</Text>
        {item.name && item.company && (
          <Text style={styles.subtitle}>{item.company}</Text>
        )}
        {!item.name && item.title && (
          <Text style={styles.subtitle}>{item.title}</Text>
        )}
        {item.name && item.title && (
          <Text style={styles.subtitleLight}>{item.title}</Text>
        )}
      </View>
      {item.phone && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>📞</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrapper}>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No contacts yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the camera button to scan a business card
            </Text>
          </View>
        }
      />
      <View style={styles.footer}>
        <Image
          source={require("../../assets/images/trueflow-logo.png")}
          style={styles.footerLogo}
          resizeMode="contain"
        />
        <Text style={styles.footerText}>Powered by TrueFlow</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#0a0a1a" },
  list: { padding: 16, paddingBottom: 80 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e2e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6c5ce7",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  info: { flex: 1 },
  name: { color: "#fff", fontSize: 16, fontWeight: "600" },
  subtitle: { color: "#6c5ce7", fontSize: 13, marginTop: 2, fontWeight: "500" },
  subtitleLight: { color: "#888", fontSize: 13, marginTop: 2 },
  badge: { padding: 4 },
  badgeText: { fontSize: 16 },
  empty: { alignItems: "center", marginTop: 80 },
  emptyText: { color: "#888", fontSize: 18, fontWeight: "600" },
  emptySubtext: { color: "#555", fontSize: 14, marginTop: 8, textAlign: "center" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#0a0a1a",
    borderTopWidth: 1,
    borderTopColor: "#1e1e2e",
    gap: 8,
  },
  footerLogo: { width: 56, height: 56 },
  footerText: { color: "#888", fontSize: 13, fontWeight: "500" },
});
