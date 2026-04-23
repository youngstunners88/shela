import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Shield, Heart, Lock } from 'lucide-react-native';

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Shield size={64} color="#6366f1" />
        <Text style={styles.title}>Shela</Text>
        <Text style={styles.tagline}>Safety first. Then connection.</Text>
      </View>

      <View style={styles.features}>
        <View style={styles.feature}>
          <Lock size={24} color="#10b981" />
          <Text style={styles.featureText}>Verifies before matching</Text>
        </View>
        <View style={styles.feature}>
          <Shield size={24} color="#10b981" />
          <Text style={styles.featureText}>Staked meetups (skin in game)</Text>
        </View>
        <View style={styles.feature}>
          <Heart size={24} color="#10b981" />
          <Text style={styles.featureText}>Learns from every outcome</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('Interview')}
      >
        <Text style={styles.buttonText}>Start Verification</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        By continuing, you agree to our safety interview and staking terms
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  tagline: {
    fontSize: 18,
    color: '#9ca3af',
    marginTop: 8,
  },
  features: {
    marginBottom: 48,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#e5e7eb',
    marginLeft: 12,
  },
  button: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  disclaimer: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 24,
  },
});
