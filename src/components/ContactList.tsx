import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
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
    Alert.alert("Delete Contact", `Remove ${contact.name || "this contact"}?`, [
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

  const getInitials = (name: string | null): string => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name || "Unknown"}</Text>
        {item.title && <Text style={styles.subtitle}>{item.title}</Text>}
        {item.company && (
          <Text style={styles.subtitle}>{item.company}</Text>
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
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 100 },
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
  subtitle: { color: "#888", fontSize: 13, marginTop: 2 },
  badge: { padding: 4 },
  badgeText: { fontSize: 16 },
  empty: { alignItems: "center", marginTop: 80 },
  emptyText: { color: "#888", fontSize: 18, fontWeight: "600" },
  emptySubtext: { color: "#555", fontSize: 14, marginTop: 8, textAlign: "center" },
});
