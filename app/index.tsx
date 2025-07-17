import React from 'react'
import { Text, View, StyleSheet, Image, TouchableOpacity} from 'react-native';
import { useRouter } from 'expo-router';
import Bible from '../assets/images/bible.png'; 

const HomeScreen = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Image source={ Bible } style={styles.image} />
      <Text style={styles.title}>Welcome to Thirteen!</Text>
      <Text style={styles.subtitle}>Draw near to God and mark your progress today</Text>

      <TouchableOpacity 
        style={styles.button}
        onPress={() => useRouter().push('/my-groups')}
      >
        <Text style={styles.buttonText}>My Groups</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  image: {
    width: 100,
    height: 100,
    marginBottom: 20,
    borderRadius: 20
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#4287f5",
    paddingVertical: 10,
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default HomeScreen;