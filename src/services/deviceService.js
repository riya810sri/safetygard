/**
 * Suraksha Device Service
 * Handles IoT device data from Firebase Realtime Database
 * 
 * Features:
 * - Real-time device data synchronization
 * - SOS alert monitoring
 * - Sensor data (temperature, humidity, motion)
 * - GPS location tracking
 * - Battery and WiFi status
 * - Device online/offline status
 */

import { ref, onValue, update, set, get, remove } from 'firebase/database';
import { database, auth } from '../firebase';

/**
 * Device Data Structure in Firebase Realtime DB:
 * 
 * /devices/{deviceId}
 *   ├── deviceId: string
 *   ├── online: boolean
 *   └── lastSeen: timestamp
 * 
 * /devices/{deviceId}/sensors
 *   ├── temperature: number
 *   ├── humidity: number
 *   └── motion: boolean
 * 
 * /devices/{deviceId}/location
 *   ├── latitude: number
 *   ├── longitude: number
 *   ├── altitude: number
 *   ├── speed: number
 *   ├── satellites: number
 *   └── gpsValid: boolean
 * 
 * /devices/{deviceId}/status
 *   ├── online: boolean
 *   ├── wifiSignal: number
 *   ├── battery: number
 *   ├── lastUpdate: timestamp
 *   └── lastError: string
 * 
 * /devices/{deviceId}/sos
 *   ├── active: boolean
 *   ├── timestamp: timestamp
 *   ├── latitude: number
 *   ├── longitude: number
 *   └── message: string
 */

// ==================== DEVICE REGISTRATION ====================

/**
 * Register a new device
 * @param {string} deviceId - Unique device identifier
 * @param {object} deviceInfo - Device metadata
 */
export const registerDevice = async (deviceId, deviceInfo = {}) => {
  try {
    console.log('🔵 [registerDevice] Starting registration...');
    console.log('🔵 [registerDevice] DeviceId:', deviceId);
    console.log('🔵 [registerDevice] DeviceInfo:', deviceInfo);

    const user = auth.currentUser;
    console.log('🔵 [registerDevice] Current User:', user);

    if (!user) {
      console.error('❌ [registerDevice] No authenticated user');
      throw new Error('User must be authenticated to register a device. Please login first.');
    }

    const deviceRef = ref(database, `users/${user.uid}/devices/${deviceId}`);
    const statusRef = ref(database, `users/${user.uid}/devices/${deviceId}/status`);
    console.log('🔵 [registerDevice] Device Ref Path:', `users/${user.uid}/devices/${deviceId}`);

    const now = Date.now();
    
    const deviceData = {
      deviceId,
      userId: user.uid,
      name: deviceInfo.name || 'Suraksha Device',
      registeredAt: now,
      lastSeen: now,
      online: true, // Mark as online when freshly registered
      ...deviceInfo
    };

    // Initial status data - device is online when registered
    const statusData = {
      online: true,
      battery: 100,
      wifiSignal: -50,
      lastUpdate: now,
      lastError: ''
    };

    console.log('🔵 [registerDevice] Device Data:', deviceData);
    console.log('🔵 [registerDevice] Status Data:', statusData);
    console.log('🔵 [registerDevice] Writing to Firebase...');

    // Write both device data and initial status
    await set(deviceRef, deviceData);
    await set(statusRef, statusData);

    console.log('✅ [registerDevice] Device registered successfully:', deviceId);
    return { success: true, deviceId };
  } catch (error) {
    console.error('❌ [registerDevice] Device registration failed:', error);
    console.error('❌ [registerDevice] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return { success: false, error: error.message };
  }
};

/**
 * Unregister/remove a device
 * @param {string} deviceId - Device identifier to remove
 */
export const unregisterDevice = async (deviceId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const deviceRef = ref(database, `users/${user.uid}/devices/${deviceId}`);
    await remove(deviceRef);
    
    console.log('✅ Device unregistered:', deviceId);
    return { success: true };
  } catch (error) {
    console.error('❌ Device unregistration failed:', error);
    return { success: false, error: error.message };
  }
};

// ==================== REAL-TIME LISTENERS ====================

/**
 * Listen to all device data in real-time
 * @param {string} deviceId - Device identifier
 * @param {function} callback - Callback function with device data
 * @returns {function} Unsubscribe function
 */
export const subscribeToDeviceData = (deviceId, callback) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('❌ User not authenticated');
      return () => {};
    }

    const deviceRef = ref(database, `users/${user.uid}/devices/${deviceId}`);
    
    const unsubscribe = onValue(deviceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          ...data,
          lastSeen: data.lastSeen ? new Date(data.lastSeen) : null
        });
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('❌ Device data subscription error:', error);
      callback(null, error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('❌ Failed to subscribe to device:', error);
    return () => {};
  }
};

/**
 * Listen to sensor data in real-time
 * @param {string} deviceId - Device identifier
 * @param {function} callback - Callback with sensor data
 * @returns {function} Unsubscribe function
 */
export const subscribeToSensors = (deviceId, callback) => {
  try {
    const user = auth.currentUser;
    if (!user) return () => {};

    const sensorRef = ref(database, `users/${user.uid}/devices/${deviceId}/sensors`);
    
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          temperature: data.temperature || 0,
          humidity: data.humidity || 0,
          motion: data.motion || false,
          updatedAt: Date.now()
        });
      } else {
        callback(null);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error('❌ Failed to subscribe to sensors:', error);
    return () => {};
  }
};

/**
 * Listen to location data in real-time
 * @param {string} deviceId - Device identifier
 * @param {function} callback - Callback with location data
 * @returns {function} Unsubscribe function
 */
export const subscribeToLocation = (deviceId, callback) => {
  try {
    const user = auth.currentUser;
    if (!user) return () => {};

    const locationRef = ref(database, `users/${user.uid}/devices/${deviceId}/location`);
    
    const unsubscribe = onValue(locationRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          altitude: data.altitude || 0,
          speed: data.speed || 0,
          satellites: data.satellites || 0,
          gpsValid: data.gpsValid || false,
          updatedAt: Date.now()
        });
      } else {
        callback(null);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error('❌ Failed to subscribe to location:', error);
    return () => {};
  }
};

/**
 * Listen to device status (battery, WiFi, online)
 * @param {string} deviceId - Device identifier
 * @param {function} callback - Callback with status data
 * @returns {function} Unsubscribe function
 */
export const subscribeToDeviceStatus = (deviceId, callback) => {
  try {
    const user = auth.currentUser;
    if (!user) return () => {};

    const statusRef = ref(database, `users/${user.uid}/devices/${deviceId}/status`);
    
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          online: data.online || false,
          wifiSignal: data.wifiSignal || 0,
          battery: data.battery || 0,
          lastUpdate: data.lastUpdate || 0,
          lastError: data.lastError || ''
        });
      } else {
        callback(null);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error('❌ Failed to subscribe to status:', error);
    return () => {};
  }
};

/**
 * Listen to SOS alerts in real-time
 * @param {string} deviceId - Device identifier
 * @param {function} callback - Callback when SOS is triggered
 * @returns {function} Unsubscribe function
 */
export const subscribeToSOS = (deviceId, callback) => {
  try {
    const user = auth.currentUser;
    if (!user) return () => {};

    const sosRef = ref(database, `users/${user.uid}/devices/${deviceId}/sos`);
    
    const unsubscribe = onValue(sosRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.active) {
        callback({
          active: true,
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          message: data.message || 'Emergency! Need help!'
        });
      } else {
        callback({ active: false });
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error('❌ Failed to subscribe to SOS:', error);
    return () => {};
  }
};

// ==================== DEVICE CONTROL ====================

/**
 * Acknowledge/clear SOS alert
 * @param {string} deviceId - Device identifier
 */
export const clearSOSAlert = async (deviceId) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const sosRef = ref(database, `users/${user.uid}/devices/${deviceId}/sos`);
    await update(sosRef, {
      active: false,
      clearedAt: Date.now(),
      clearedBy: user.uid
    });

    console.log('✅ SOS alert cleared');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to clear SOS:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update device name
 * @param {string} deviceId - Device identifier
 * @param {string} newName - New device name
 */
export const updateDeviceName = async (deviceId, newName) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const deviceRef = ref(database, `users/${user.uid}/devices/${deviceId}`);
    await update(deviceRef, {
      name: newName,
      updatedAt: Date.now()
    });

    console.log('✅ Device name updated');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to update device name:', error);
    return { success: false, error: error.message };
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get WiFi signal strength description
 * @param {number} rssi - WiFi signal strength in dBm
 */
export const getWiFiSignalQuality = (rssi) => {
  if (rssi >= -50) return { label: 'Excellent', color: 'green' };
  if (rssi >= -60) return { label: 'Good', color: 'blue' };
  if (rssi >= -70) return { label: 'Fair', color: 'yellow' };
  if (rssi >= -80) return { label: 'Weak', color: 'orange' };
  return { label: 'Poor', color: 'red' };
};

/**
 * Get battery status description
 * @param {number} percentage - Battery percentage (0-100)
 */
export const getBatteryStatus = (percentage) => {
  if (percentage >= 80) return { label: 'Full', color: 'green', icon: '🔋' };
  if (percentage >= 50) return { label: 'Good', color: 'blue', icon: '🔋' };
  if (percentage >= 20) return { label: 'Medium', color: 'yellow', icon: '🪫' };
  if (percentage >= 10) return { label: 'Low', color: 'orange', icon: '🪫' };
  return { label: 'Critical', color: 'red', icon: '🪫' };
};

/**
 * Check if device is online (based on last seen time)
 * @param {number} lastSeen - Last seen timestamp
 * @param {number} threshold - Threshold in ms (default: 30 seconds)
 */
export const isDeviceOnline = (lastSeen, threshold = 30000) => {
  if (!lastSeen) return false;
  return Date.now() - lastSeen < threshold;
};

/**
 * Format device uptime
 * @param {number} milliseconds - Uptime in milliseconds
 */
export const formatUptime = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

/**
 * Get all user devices
 * @param {string} userId - User ID (optional, uses current user if not provided)
 */
export const getUserDevices = async () => {
  try {
    const user = auth.currentUser;
    console.log('🔵 [getUserDevices] Current User:', user);
    
    if (!user) {
      console.error('❌ [getUserDevices] User not authenticated');
      throw new Error('User must be authenticated');
    }

    const devicesRef = ref(database, `users/${user.uid}/devices`);
    console.log('🔵 [getUserDevices] Reading from:', `users/${user.uid}/devices`);
    
    const snapshot = await get(devicesRef);

    if (snapshot.exists()) {
      const devices = [];
      snapshot.forEach((childSnapshot) => {
        devices.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      console.log('✅ [getUserDevices] Found devices:', devices.length);
      return devices;
    }

    console.log('⚪ [getUserDevices] No devices found');
    return [];
  } catch (error) {
    console.error('❌ [getUserDevices] Failed to get user devices:', error);
    return [];
  }
};
