import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./src/navigation/AppNavigator";
import PermissionsScreen from "./src/screens/PermissionsScreen";

export default function App() {
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  if (!permissionsGranted) {
    return (
      <>
        <PermissionsScreen onAllGranted={() => setPermissionsGranted(true)} />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <NavigationContainer>
      <AppNavigator />
      <StatusBar style="light" />
    </NavigationContainer>
  );
}
