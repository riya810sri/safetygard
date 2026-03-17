import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  Plus, 
  Smartphone, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  XCircle,
  Wifi,
  Battery,
  MapPin,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Settings,
  Shield
} from 'lucide-react';
import { auth } from '../firebase';
import { 
  getUserDevices, 
  registerDevice, 
  unregisterDevice,
  isDeviceOnline,
  subscribeToDeviceData
} from '../services/deviceService';
import Header from '../components/Header';
import Footer from '../components/Footer';

/**
 * My Devices Page
 * Manage and monitor all Suraksha IoT devices
 */
const MyDevices = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [deviceStatuses, setDeviceStatuses] = useState({});

  useEffect(() => {
    loadDevices();
  }, []);

  // Load user devices
  const loadDevices = async () => {
    try {
      console.log('🔵 Loading devices...');
      
      // Check if user is authenticated
      if (!auth.currentUser) {
        console.log('🔵 No authenticated user, redirecting to login');
        navigate('/login');
        return;
      }
      
      setLoading(true);
      const userDevices = await getUserDevices();
      console.log('🔵 Loaded devices:', userDevices);
      setDevices(userDevices);

      // Subscribe to real-time updates for each device
      userDevices.forEach(device => {
        const unsubscribe = subscribeToDeviceData(device.id, (data) => {
          if (data) {
            setDeviceStatuses(prev => ({
              ...prev,
              [device.id]: data
            }));
          }
        });
      });

      setLoading(false);
    } catch (error) {
      console.error('❌ Failed to load devices:', error);
      setLoading(false);
      alert('Failed to load devices: ' + error.message);
    }
  };

  // Handle add new device
  const handleAddDevice = async (e) => {
    e.preventDefault();

    console.log('🔵 Add Device Button Clicked!');
    console.log('🔵 Current User:', auth.currentUser);
    console.log('🔵 Device ID:', newDeviceId);
    console.log('🔵 Device Name:', newDeviceName);

    // Check if user is authenticated
    if (!auth.currentUser) {
      alert('❌ Please login to register a device');
      navigate('/login');
      return;
    }

    if (!newDeviceId.trim()) {
      alert('Please enter a Device ID');
      return;
    }

    try {
      console.log('🔵 Calling registerDevice...');
      const result = await registerDevice(newDeviceId.trim(), {
        name: newDeviceName.trim() || 'Suraksha Device'
      });

      console.log('🔵 Register Device Result:', result);

      if (result.success) {
  Swal.fire({
    title: 'Success!',
    text: 'Device registered successfully',
    imageUrl: '/hack.png',
    imageWidth: 100,
    imageHeight: 100,
    confirmButtonText: 'OK'
  });
} else {
        alert('❌ Failed to register device: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Device Registration Error:', error);
      alert('Error: ' + error.message);
    }
  };

  // Handle remove device
  const handleRemoveDevice = async (deviceId) => {
    if (!confirm(`Are you sure you want to remove device "${deviceId}"?`)) {
      return;
    }

    try {
      const result = await unregisterDevice(deviceId);
      if (result.success) {

        alert('✅ Device removed successfully');
        loadDevices();
      } else {
        alert('❌ Failed to remove device: ' + result.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // Navigate to device dashboard
  const handleViewDevice = (deviceId) => {
    navigate(`/device/${deviceId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Header />

      <main className="container mx-auto px-4 pt-32 pb-8 max-w-7xl">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                🛡️ My Suraksha Devices
              </h1>
              <p className="text-gray-600">
                Manage and monitor your IoT safety devices
              </p>
              {devices.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3"
                >
                  <div className="text-2xl">💡</div>
                  <div>
                    <p className="font-semibold text-blue-900">New to Suraksha?</p>
                    <p className="text-sm text-blue-700 mt-1">
                      A default device has been created for you! You can add more devices or connect your ESP32 device.
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2 justify-center"
            >
              <Plus className="w-5 h-5" />
              Add New Device
            </button>
          </div>
        </motion.div>

        {/* Devices Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full"
            />
          </div>
        ) : devices.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-xl p-12 text-center"
          >
            <Smartphone className="w-24 h-24 mx-auto mb-6 text-gray-300" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Devices Yet</h2>
            <p className="text-gray-500 mb-6">
              Connect your ESP32/ESP8266 device to get started
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Register Your First Device
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device, index) => {
              const status = deviceStatuses[device.id];
              const online = status ? isDeviceOnline(status.lastUpdate) : false;
              
              return (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-all"
                >
                  {/* Device Header */}
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6">
                    <div className="flex items-center justify-between mb-3">
                      <Shield className="w-10 h-10 text-white" />
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        online 
                          ? 'bg-green-400 text-white' 
                          : 'bg-red-400 text-white'
                      }`}>
                        {online ? '● Online' : '○ Offline'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {device.name || 'Suraksha Device'}
                    </h3>
                    <p className="text-purple-100 text-sm font-mono">
                      {device.id}
                    </p>
                  </div>

                  {/* Device Stats */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-500">
                        <Battery className="w-4 h-4" />
                        Battery
                      </span>
                      <span className="font-semibold text-gray-800">
                        {status?.battery?.toFixed(0) || '--'}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-500">
                        <Wifi className="w-4 h-4" />
                        Signal
                      </span>
                      <span className="font-semibold text-gray-800">
                        {status?.wifiSignal || '--'} dBm
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-500">
                        <MapPin className="w-4 h-4" />
                        Location
                      </span>
                      <span className="font-semibold text-gray-800">
                        {status?.location?.latitude ? 'Available' : 'Waiting'}
                      </span>
                    </div>

                    {status?.sos?.active && (
                      <div className="bg-red-100 border border-red-300 rounded-xl p-3 flex items-center gap-2 text-red-700">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-semibold">SOS Active!</span>
                      </div>
                    )}
                  </div>

                  {/* Device Actions */}
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDevice(device.id)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        View Dashboard
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveDevice(device.id)}
                        className="px-4 py-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all"
                        title="Remove Device"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Quick Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 bg-white rounded-3xl shadow-xl p-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <Settings className="w-8 h-8 text-purple-600" />
            How to Connect Your Device
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-purple-50 rounded-2xl p-6">
              <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
                1
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Flash ESP32 Code</h3>
              <p className="text-gray-600 text-sm">
                Upload the SurakshaDevice.ino code to your ESP32/ESP8266 board using Arduino IDE
              </p>
            </div>
            
            <div className="bg-pink-50 rounded-2xl p-6">
              <div className="w-12 h-12 bg-pink-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
                2
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Configure WiFi & Firebase</h3>
              <p className="text-gray-600 text-sm">
                Update WiFi credentials and Firebase config in the Arduino code
              </p>
            </div>
            
            <div className="bg-blue-50 rounded-2xl p-6">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
                3
              </div>
              <h3 className="font-bold text-gray-800 mb-2">Register Device</h3>
              <p className="text-gray-600 text-sm">
                Click "Add New Device" and enter your Device ID (e.g., SURAKSHA_DEV_001)
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Add Device Modal */}
      {showAddModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowAddModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Register New Device</h2>
            
            <form onSubmit={handleAddDevice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device ID *
                </label>
                <input
                  type="text"
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  placeholder="SURAKSHA_DEV_001"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique identifier from your ESP32 code
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device Name (Optional)
                </label>
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="My Suraksha Device"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Register Device
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      <Footer />
    </div>
  );
};

export default MyDevices;
