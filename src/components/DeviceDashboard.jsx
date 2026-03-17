import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wifi,
  Battery,
  BatteryCharging,
  BatteryLow,
  BatteryWarning,
  Thermometer,
  Droplets,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Satellite,
  Activity,
  Shield,
  Zap,
  Navigation,
  Clock,
  Bell,
  Users
} from 'lucide-react';
import Header from './Header';
import {
  subscribeToDeviceData,
  subscribeToSensors,
  subscribeToLocation,
  subscribeToDeviceStatus,
  subscribeToSOS,
  clearSOSAlert,
  getWiFiSignalQuality,
  getBatteryStatus,
  isDeviceOnline,
  formatUptime
} from '../services/deviceService';
import { subscribeToGlobalSOSAlerts } from '../services/firestoreService';

/**
 * Suraksha Device Dashboard Component
 * Real-time IoT device monitoring with live sensor data
 */
const DeviceDashboard = () => {
  const { deviceId } = useParams();

  // Device state
  const [deviceData, setDeviceData] = useState(null);
  const [sensors, setSensors] = useState(null);
  const [location, setLocation] = useState(null);
  const [status, setStatus] = useState(null);
  const [sosAlert, setSosAlert] = useState({ active: false });
  const [globalSosAlerts, setGlobalSosAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Unsubscribe functions
  const [unsubscribeFns, setUnsubscribeFns] = useState([]);

  useEffect(() => {
    if (!deviceId) return;

    setLoading(true);

    // Subscribe to all device data streams
    const unsubDevice = subscribeToDeviceData(deviceId, (data, err) => {
      if (err) {
        setError(err.message);
        setLoading(false);
      } else {
        setDeviceData(data);
        setLoading(false);
      }
    });

    const unsubSensors = subscribeToSensors(deviceId, (data) => {
      setSensors(data);
    });

    const unsubLocation = subscribeToLocation(deviceId, (data) => {
      setLocation(data);
    });

    const unsubStatus = subscribeToDeviceStatus(deviceId, (data) => {
      setStatus(data);
    });

    const unsubSOS = subscribeToSOS(deviceId, (data) => {
      setSosAlert(data);
      if (data.active) {
        // Play alert sound or show notification
        console.log('🚨 SOS ALERT TRIGGERED!');
      }
    });

    // Subscribe to global SOS alerts (from all users/devices)
    const unsubGlobalSOS = subscribeToGlobalSOSAlerts((alerts) => {
      setGlobalSosAlerts(alerts);
      console.log('🚨 Global SOS Alerts:', alerts.length);
    });

    // Store unsubscribe functions
    setUnsubscribeFns([unsubDevice, unsubSensors, unsubLocation, unsubStatus, unsubSOS, unsubGlobalSOS]);

    // Cleanup on unmount
    return () => {
      unsubscribeFns.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [deviceId]);

  // Handle SOS clear
  const handleClearSOS = async () => {
    try {
      await clearSOSAlert(deviceId);
      setSosAlert({ active: false });
    } catch (err) {
      console.error('Failed to clear SOS:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md w-full"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Connecting to Device</h2>
          <p className="text-gray-500">Establishing real-time connection...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md w-full"
        >
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Failed</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  // Get status helpers
  const wifiQuality = status ? getWiFiSignalQuality(status.wifiSignal) : { label: 'Unknown', color: 'gray' };
  const batteryStatus = status ? getBatteryStatus(status.battery) : { label: 'Unknown', color: 'gray', icon: '🔋' };
  const online = status ? isDeviceOnline(status.lastUpdate) : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Header />
      <div className="pt-32 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1 mt-13">
                🛡️ Suraksha Device Dashboard
              </h1>
              <p className="text-gray-600 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Device ID: <code className="bg-purple-100 px-2 py-1 rounded text-purple-700">{deviceId}</code>
              </p>
            </div>
            <motion.div
              animate={{ scale: online ? [1, 1.05, 1] : 1 }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`px-6 py-3 rounded-full font-semibold flex items-center gap-2 ${
                online 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`} />
              {online ? 'Online' : 'Offline'}
            </motion.div>
          </div>
        </motion.header>

        {/* SOS Alert Banner */}
        <AnimatePresence>
          {sosAlert.active && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
              className="mb-8 bg-gradient-to-r from-red-500 via-pink-600 to-red-500 rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <AlertTriangle className="w-12 h-12 text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">🚨 SOS EMERGENCY ALERT!</h2>
                    <p className="text-red-100">
                      {sosAlert.message} • {new Date(sosAlert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClearSOS}
                  className="px-8 py-4 bg-white text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all shadow-lg"
                >
                  ✓ Clear Alert
                </button>
              </div>
              {sosAlert.latitude && sosAlert.longitude && (
                <div className="mt-4 bg-white/20 backdrop-blur rounded-xl p-4">
                  <p className="text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Location: {sosAlert.latitude.toFixed(6)}, {sosAlert.longitude.toFixed(6)}
                    <a
                      href={`https://www.google.com/maps?q=${sosAlert.latitude},${sosAlert.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline ml-2"
                    >
                      (Open in Maps)
                    </a>
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Battery Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl shadow-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-2xl">
                {status?.battery <= 20 ? (
                  <BatteryWarning className="w-8 h-8 text-purple-600" />
                ) : (
                  <Battery className="w-8 h-8 text-purple-600" />
                )}
              </div>
              <span className="text-3xl">{batteryStatus.icon}</span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Battery Level</h3>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-gray-800">{status?.battery?.toFixed(0)}%</p>
              <span className={`text-sm font-semibold text-${batteryStatus.color}-600`}>
                {batteryStatus.label}
              </span>
            </div>
            <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${status?.battery || 0}%` }}
                transition={{ duration: 1 }}
                className={`h-full ${
                  status?.battery > 50 ? 'bg-green-500' : 
                  status?.battery > 20 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              />
            </div>
          </motion.div>

          {/* WiFi Signal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl shadow-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-2xl">
                <Wifi className="w-8 h-8 text-blue-600" />
              </div>
              <span className={`text-2xl font-bold text-${wifiQuality.color}-600`}>
                {status?.wifiSignal || 0} dBm
              </span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">WiFi Signal</h3>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-gray-800">{wifiQuality.label}</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className={`w-2 rounded-full ${
                      bar <= Math.floor((status?.wifiSignal + 100) / 25) 
                        ? `bg-${wifiQuality.color}-500` 
                        : 'bg-gray-300'
                    }`}
                    style={{ height: `${bar * 6}px` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Temperature */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl shadow-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-2xl">
                <Thermometer className="w-8 h-8 text-orange-600" />
              </div>
              <span className="text-3xl">🌡️</span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Temperature</h3>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-gray-800">{sensors?.temperature?.toFixed(1) || '--'}°C</p>
              <span className="text-sm text-gray-500">{sensors?.temperature > 30 ? 'Hot' : 'Normal'}</span>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              {sensors?.temperature > 35 ? '⚠️ High temperature detected' : 
               sensors?.temperature < 15 ? '❄️ Low temperature' : '✅ Normal range'}
            </p>
          </motion.div>

          {/* Humidity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl shadow-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-cyan-100 rounded-2xl">
                <Droplets className="w-8 h-8 text-cyan-600" />
              </div>
              <span className="text-3xl">💧</span>
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">Humidity</h3>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold text-gray-800">{sensors?.humidity?.toFixed(1) || '--'}%</p>
              <span className="text-sm text-gray-500">
                {sensors?.humidity > 70 ? 'High' : sensors?.humidity < 30 ? 'Low' : 'Normal'}
              </span>
            </div>
            <div className="mt-3 bg-cyan-100 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${sensors?.humidity || 0}%` }}
                transition={{ duration: 1 }}
                className="h-full bg-cyan-500"
              />
            </div>
          </motion.div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* GPS Location */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-3xl shadow-xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-100 rounded-2xl">
                <MapPin className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">GPS Location</h3>
                <p className="text-sm text-gray-500">Real-time tracking</p>
              </div>
              {location?.gpsValid && (
                <span className="ml-auto px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                  {location.satellites} Satellites
                </span>
              )}
            </div>

            {location?.gpsValid ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-4">
                  <p className="text-lg font-mono font-semibold text-gray-800 mb-2">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm flex items-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    Open in Google Maps
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <Satellite className="w-6 h-6 mx-auto mb-1 text-purple-600" />
                    <p className="text-sm font-bold text-gray-800">{location.satellites}</p>
                    <p className="text-xs text-gray-500">Satellites</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <Activity className="w-6 h-6 mx-auto mb-1 text-blue-600" />
                    <p className="text-sm font-bold text-gray-800">{location.altitude?.toFixed(1) || 0}m</p>
                    <p className="text-xs text-gray-500">Altitude</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <Zap className="w-6 h-6 mx-auto mb-1 text-orange-600" />
                    <p className="text-sm font-bold text-gray-800">{location.speed?.toFixed(1) || 0} km/h</p>
                    <p className="text-xs text-gray-500">Speed</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <Satellite className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 font-medium">Waiting for GPS signal...</p>
                <p className="text-sm text-gray-400 mt-2">Make sure the device has clear sky view</p>
              </div>
            )}
          </motion.div>

          {/* Motion & Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-3xl shadow-xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-100 rounded-2xl">
                <Activity className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Motion Detection</h3>
                <p className="text-sm text-gray-500">PIR Sensor Status</p>
              </div>
            </div>

            <div className="mb-6">
              <motion.div
                animate={{ 
                  scale: sensors?.motion ? [1, 1.05, 1] : 1,
                  backgroundColor: sensors?.motion ? 'rgba(239, 68, 68, 0.1)' : 'rgba(243, 244, 246, 0.5)'
                }}
                transition={{ duration: 0.5, repeat: sensors?.motion ? Infinity : 0 }}
                className="rounded-2xl p-8 text-center"
              >
                {sensors?.motion ? (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-24 h-24 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center"
                    >
                      <Activity className="w-12 h-12 text-red-600" />
                    </motion.div>
                    <p className="text-2xl font-bold text-red-600">Motion Detected!</p>
                    <p className="text-red-500 mt-2">Movement detected in the area</p>
                  </>
                ) : (
                  <>
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-12 h-12 text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-400">No Motion</p>
                    <p className="text-gray-500 mt-2">Area is clear</p>
                  </>
                )}
              </motion.div>
            </div>

            {/* Device Info */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Last Update
                </span>
                <span className="font-semibold text-gray-800">
                  {status?.lastUpdate ? new Date(status.lastUpdate).toLocaleTimeString() : '--:--:--'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Uptime
                </span>
                <span className="font-semibold text-gray-800">
                  {deviceData?.lastSeen ? formatUptime(Date.now() - deviceData.lastSeen) : '--'}
                </span>
              </div>
              {status?.lastError && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-red-500 font-mono">{status.lastError}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Recent SOS Alerts from Community */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-8"
        >
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-100 rounded-2xl">
                <Bell className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Recent SOS Alerts</h3>
                <p className="text-sm text-gray-500">Live emergency alerts from your area</p>
              </div>
              {globalSosAlerts.length > 0 && (
                <span className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold animate-pulse">
                  {globalSosAlerts.length} Active
                </span>
              )}
            </div>

            {globalSosAlerts.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {globalSosAlerts.slice(0, 10).map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-2xl border-2 ${
                      alert.status === 'active'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-3 h-3 rounded-full mt-2 ${
                          alert.status === 'active' ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className={`w-5 h-5 ${
                              alert.status === 'active' ? 'text-red-600' : 'text-gray-400'
                            }`} />
                            <h4 className="font-semibold text-gray-800">
                              {alert.message || 'SOS Emergency Alert'}
                            </h4>
                          </div>
                          <p className="text-sm text-gray-600">
                            Status: <span className={`font-semibold ${
                              alert.status === 'active' ? 'text-red-600' : 'text-gray-500'
                            }`}>{alert.status}</span>
                          </p>
                          {alert.location && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4" />
                              <span>
                                {alert.location.latitude?.toFixed(4)}, {alert.location.longitude?.toFixed(4)}
                              </span>
                              <a
                                href={`https://www.google.com/maps?q=${alert.location.latitude},${alert.location.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline ml-2"
                              >
                                (View on Map)
                              </a>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {alert.contactsNotified || 0} contacts notified
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 whitespace-nowrap ml-4">
                        {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'Just now'}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <Shield className="w-16 h-16 mx-auto mb-4 text-green-400" />
                <p className="text-gray-600 font-medium">No active SOS alerts</p>
                <p className="text-sm text-gray-400 mt-2">All users are safe in your area</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center text-gray-500 text-sm pb-8"
      >
        <p>🛡️ Suraksha Smart Device • Real-time IoT Monitoring</p>
        <p className="mt-1">Last synced: {new Date().toLocaleString()}</p>
      </motion.footer>
    </div>
    </div>
  );
};

export default DeviceDashboard;
