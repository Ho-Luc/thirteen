import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import React, { useState } from 'react';

const CreateGroupsScreen = () => {
  const groupOne = useState({});
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text>
        test message
      </Text>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => useRouter().push('/group_calendar')}>
          <Text style={styles.addButtonText}>
            + Create New Group
          </Text>
      </TouchableOpacity>

    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#fff",
    },
    button: {
        backgroundColor: "#4287f5",
        paddingVertical: 10,
        paddingHorizontal: 10,
        paddingBottom: 10,
        borderRadius: 5,
        alignItems: "center",
    },
    noteText: {
      fontSize: 18
    },
    addButton: {
        position: "absolute",
        bottom: 20,
        right: 20,
        left: 20,  
        backgroundColor: "#4287f5",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        alignItems: "center",
        marginBottom: 10,
    },
    addButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
});

export default CreateGroupsScreen;