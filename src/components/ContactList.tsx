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
import { getDisplayName, getInitials } from "../types";
import type { Contact } from "../types";

interface Props {
  navigation: any;
  searchQuery: string;
}

function mapRow(r: any): Contact {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    title: r.title,
    company: r.company,
    phone: r.phone,
    phone2: r.phone2,
    email: r.email,
    website: r.website,
    linkedin: r.linkedin,
    address: r.address,
    cardImagePath: r.card_image_path,
    cardImageRotation: r.card_image_rotation || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export default function ContactList({ navigation, searchQuery }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadContacts = useCallback(async () => {
    try {
      const result = searchQuery
        ? await searchContacts(searchQuery)
        : await getAllContacts();
      setContacts(result.map(mapRow));
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
    const dn = getDisplayName(contact);
    Alert.alert("Delete Contact", `Remove ${dn}?`, [
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
        {item.company && <Text style={styles.subtitle}>{item.company}</Text>}
        {item.title && <Text style={styles.subtitleLight}>{item.title}</Text>}
      </View>
      {item.cardImagePath ? (
        <Image
          source={{ uri: item.cardImagePath }}
          style={[
            styles.thumbnail,
            { transform: [{ rotate: `${item.cardImageRotation}deg` }] },
          ]}
          resizeMode="contain"
        />
      ) : item.phone ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>📞</Text>
        </View>
      ) : null}
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
        <Text style={styles.footerTagline}>Your local AI partner</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#0a0a1a" },
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
  subtitle: { color: "#6c5ce7", fontSize: 13, marginTop: 2, fontWeight: "500" },
  subtitleLight: { color: "#888", fontSize: 13, marginTop: 2 },
  badge: { padding: 4 },
  badgeText: { fontSize: 16 },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#2a2a4a",
  },
  empty: { alignItems: "center", marginTop: 80 },
  emptyText: { color: "#888", fontSize: 18, fontWeight: "600" },
  emptySubtext: { color: "#555", fontSize: 14, marginTop: 8, textAlign: "center" },
  footer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingBottom: 10,
    backgroundColor: "#0a0a1a",
    borderTopWidth: 1,
    borderTopColor: "#1e1e2e",
  },
  footerLogo: { width: 120, height: 120, marginBottom: 2 },
  footerText: { color: "#888", fontSize: 12, fontWeight: "600" },
  footerTagline: { color: "#6c5ce7", fontSize: 11, fontWeight: "500", marginTop: 2 },
});
