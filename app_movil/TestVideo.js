import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Video } from 'expo-av';

export default function TestVideo() {
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const testVideo = require('./assets/videos/escoliosis lumbar/Puente.mp4');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test Video Playback</Text>
      <Text style={styles.info}>Video type: {typeof testVideo}</Text>
      <Text style={styles.info}>Loaded: {loaded ? 'Yes' : 'No'}</Text>
      {error && <Text style={styles.error}>Error: {JSON.stringify(error)}</Text>}
      
      <Video
        source={testVideo}
        style={styles.video}
        rate={1.0}
        volume={1.0}
        resizeMode="contain"
        shouldPlay={true}
        useNativeControls={true}
        isLooping={true}
        onLoad={() => {
          console.log('Video loaded successfully');
          setLoaded(true);
          setError(null);
        }}
        onError={(err) => {
          console.error('Video error:', err);
          setError(err);
          Alert.alert('Error', JSON.stringify(err));
        }}
        onLoadStart={() => {
          console.log('Video load started');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  info: {
    fontSize: 14,
    marginBottom: 10,
  },
  error: {
    fontSize: 12,
    color: 'red',
    marginBottom: 10,
  },
  video: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
  },
});
