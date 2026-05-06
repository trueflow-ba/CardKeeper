import React, { useState } from "react";
import { View, StyleSheet, TextInput } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import ScanScreen from "../screens/ScanScreen";
import GalleryScreen from "../screens/GalleryScreen";
import QRImportScreen from "../screens/QRImportScreen";
import ContactDetailScreen from "../screens/ContactDetailScreen";
import ContactList from "../components/ContactList";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function ContactsTab({ navigation }: { navigation: any }) {
  const [searchQuery, setSearchQuery] = useState("");
  return (
    <View style={styles.tabContainer}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <ContactList navigation={navigation} searchQuery={searchQuery} />
    </View>
  );
}

function ContactsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ContactsList" component={ContactsTab as any} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen as any} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0a0a1a",
          borderTopColor: "#1e1e2e",
          height: 80,
          paddingBottom: 16,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#6c5ce7",
        tabBarInactiveTintColor: "#555",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        tabBarIconStyle: { marginTop: 4 },
      })}
    >
      <Tab.Screen
        name="Contacts"
        component={ContactsStack}
        options={{
          tabBarLabel: "Contacts",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={28} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel: "Scan",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera" size={28} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{
          tabBarLabel: "Gallery",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images" size={28} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="QR Import"
        component={QRImportScreen}
        options={{
          tabBarLabel: "QR Scan",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="qr-code" size={28} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabContainer: { flex: 1, backgroundColor: "#0a0a1a" },
  searchBar: { padding: 16, paddingTop: 60 },
  searchInput: {
    backgroundColor: "#1e1e2e",
    color: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
});
