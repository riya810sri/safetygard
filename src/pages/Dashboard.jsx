import { ref, onValue } from "firebase/database";
import { database } from "../firebase";
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  MapPin,
  Users,
  Shield,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  User,
  Phone,
  Mail,
  Settings,
  LogOut,
  Menu,
  X,
  Camera,
  Thermometer,
  Droplets,
  Cpu,
  Wifi,
  ArrowRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, getUserStats, getEmergencyContacts, getUserIncidents, addEmergencyContact, addSOSAlert } from '../services/firestoreService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { notifyAllEmergencyContacts, createLocationLink, sendSOSViaBackend, sendSOSViaTelegram, isValidPhoneNumber } from '../services/emergencyNotificationService';

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showSOSConfirm, setShowSOSConfirm] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [newContact, setNewContact] = useState({
    name: '',
    relation: '',
    phone: '',
    email: ''
  });
  const [sensorData, setSensorData] = useState(null);
  const [trackedLocations, setTrackedLocations] = useState([]);
  const [sosAlertsEnabled, setSosAlertsEnabled] = useState(true);
  const [locationTrackingEnabled, setLocationTrackingEnabled] = useState(true);

  useEffect(() => {
    // Timeout fallback - force stop loading after 3 seconds
    const timeoutId = setTimeout(() => {
      console.log("Loading timeout - forcing stop");
      setLoading(false);
    }, 3000);
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user ? "User logged in" : "No user");
      
      if (user) {
        setCurrentUser(user);
        
        try {
          // Fetch user profile
          console.log("Fetching profile for user:", user.uid);
          const profile = await getUserProfile(user.uid);
          console.log("Profile fetched:", profile);
          setUserProfile(profile);
          
          // Fetch user stats
          const stats = await getUserStats(user.uid);
          console.log("Stats fetched:", stats);
          setUserStats(stats);
          
          // Fetch emergency contacts
          const userContacts = await getEmergencyContacts(user.uid);
          console.log("Contacts fetched:", userContacts);
          setContacts(userContacts);
          
          // Fetch recent incidents
          const userIncidents = await getUserIncidents(user.uid);
          console.log("Incidents fetched:", userIncidents);
          setIncidents(userIncidents);
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Set default values on error
          setUserProfile({ safetyScore: 100 });
          setUserStats({ totalIncidents: 0, totalLocations: 0 });
        }
        
        clearTimeout(timeoutId);
        setLoading(false);
        console.log("Loading set to false");
      } else {
        console.log("No user - redirecting to login");
        clearTimeout(timeoutId);
        navigate('/login');
      }
    });
    
    return () => {
      console.log("Cleaning up auth listener");
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
  const sensorRef = ref(database, "sensor");

  const unsubscribe = onValue(sensorRef, (snapshot) => {
    const data = snapshot.val();
    console.log("Suraksha Device Data:", data);
    setSensorData(data);

    // Track location when received from Suraksha Device
    if (data && data.location && data.location !== "Waiting for GPS...") {
      setTrackedLocations(prev => {
        const newLocation = {
          location: data.location,
          temperature: data.temperature,
          humidity: data.humidity,
          timestamp: new Date().toISOString()
        };
        // Keep last 50 locations
        return [...prev.slice(-49), newLocation];
      });
      console.log("Location tracked! Total:", trackedLocations.length + 1);
    }
  });

  return () => unsubscribe();
}, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    
    if (!newContact.name || !newContact.phone || !newContact.relation) {
      alert('Please fill in all required fields');
      return;
    }

    if (!currentUser) {
      alert('User not logged in. Please login again.');
      return;
    }

    try {
      console.log('Adding contact for user:', currentUser.uid);
      console.log('Contact data:', newContact);
      
      await addEmergencyContact(currentUser.uid, newContact);
      
      // Refresh contacts list
      console.log('Refreshing contacts list...');
      const userContacts = await getEmergencyContacts(currentUser.uid);
      console.log('Fetched contacts:', userContacts);
      setContacts(userContacts);
      
      // Reset form
      setNewContact({ name: '', relation: '', phone: '', email: '' });
      setShowAddContact(false);
      
      // Success message
      alert('Contact added successfully! ✅');
    } catch (error) {
      console.error('Error adding contact:', error);
      const errorMessage = error.message || 'Failed to add contact';
      alert(`Error: ${errorMessage}\n\nPlease check:\n1. You are logged in\n2. Firestore rules allow writes\n3. Internet connection`);
    }
  };

  const handleSendSOS = async () => {
    if (!currentUser) {
      alert('Please login to send SOS alert');
      return;
    }

    // Check if emergency contacts exist
    if (!contacts || contacts.length === 0) {
      const addContact = window.confirm('⚠️ No Emergency Contacts!\n\nYou haven\'t added any emergency contacts yet.\n\nWould you like to add one now?');
      if (addContact) {
        setShowAddContact(true);
      }
      return;
    }

    // Validate at least one valid phone number
    const validContacts = contacts.filter(c => isValidPhoneNumber(c.phone));
    if (validContacts.length === 0) {
      alert('⚠️ No Valid Phone Numbers!\n\nPlease add emergency contacts with valid phone numbers (at least 10 digits).');
      return;
    }

    try {
      console.log('Sending SOS alert for user:', currentUser.uid);

      // Get user's current location
      const location = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
          },
          (error) => {
            reject(error);
          },
          { timeout: 10000 }
        );
      });

      console.log('Location fetched:', location);

      // Save SOS alert to Firestore
      await addSOSAlert(currentUser.uid, {
        message: 'SOS Emergency Alert!',
        location: location,
        timestamp: new Date().toISOString(),
        status: 'active',
        contactsNotified: contacts.length
      });

      // 🚨 NOTIFY ALL EMERGENCY CONTACTS 🚨
      const userName = userProfile?.name || currentUser?.email || 'User';
      const userEmail = currentUser?.email || 'User';
      
      let notificationResults;
      let alertMode = 'frontend';
      
      // Check which mode to use
      const useTelegram = import.meta.env.VITE_USE_TELEGRAM === 'true';
      const useBackend = import.meta.env.VITE_USE_BACKEND === 'true';
      
      if (useTelegram) {
        // FREE Telegram Mode ✅
        alertMode = 'telegram';
        try {
          notificationResults = await sendSOSViaTelegram(userName, userEmail, location, validContacts);
        } catch (telegramError) {
          console.error('Telegram failed, falling back to frontend mode:', telegramError);
          notificationResults = notifyAllEmergencyContacts(validContacts, userName, location);
          alertMode = 'frontend';
        }
      } else if (useBackend) {
        // PAID Twilio Mode
        alertMode = 'twilio';
        try {
          notificationResults = await sendSOSViaBackend(userName, userEmail, location, validContacts);
        } catch (backendError) {
          console.error('Backend failed, falling back to frontend mode:', backendError);
          notificationResults = notifyAllEmergencyContacts(validContacts, userName, location);
          alertMode = 'frontend';
        }
      } else {
        // Frontend Mode (Fallback)
        notificationResults = notifyAllEmergencyContacts(validContacts, userName, location);
      }

      console.log('Emergency contacts notified:', notificationResults);
      console.log('Alert mode:', alertMode);

      // Show success message with notification details
      const locationLink = createLocationLink(location);
      
      let successMessage = `🚨 SOS ALERT SENT! 🚨\n\n`;
      successMessage += `✅ Alert saved to Firestore\n`;
      
      if (alertMode === 'telegram') {
        successMessage += `✅ ${notificationResults.sent || 0} Telegram messages sent\n`;
        if (notificationResults.failed > 0) {
          successMessage += `⚠️ ${notificationResults.failed} failed\n`;
        }
        successMessage += `\n💰 Mode: FREE (Telegram)`;
      } else if (alertMode === 'twilio') {
        successMessage += `✅ ${notificationResults.smsSent || 0} SMS sent\n`;
        successMessage += `✅ ${notificationResults.callsInitiated || 0} calls initiated\n`;
        successMessage += `\n💰 Mode: PAID (Twilio)`;
      } else {
        successMessage += `✅ ${notificationResults.smsSent || 0} SMS opened\n`;
        successMessage += `✅ ${notificationResults.callsInitiated || 0} calls initiated\n`;
        successMessage += `\n⚠️ Note: Please send from your device`;
        successMessage += `\n💰 Mode: FREE (Manual)`;
      }
      
      if (notificationResults.invalid > 0) {
        successMessage += `\n⚠️ ${notificationResults.invalid} invalid phone number(s)`;
      }
      
      successMessage += `\n\n📍 Your Location:\nLat: ${location.latitude}\nLng: ${location.longitude}`;
      successMessage += `\n\n🗺️ Location Link:\n${locationLink}`;
      
      if (notificationResults.details && notificationResults.details.length > 0) {
        successMessage += `\n\n📞 Contacts Notified:`;
        notificationResults.details.forEach((detail, idx) => {
          let status = '';
          if (alertMode === 'telegram') {
            status = detail.success ? '✅' : '❌';
          } else {
            const smsStatus = detail.smsSuccess ? '✅ SMS' : '⏳ SMS';
            const callStatus = detail.callSuccess ? '✅ Call' : '⏳ Call';
            status = `${smsStatus}, ${callStatus}`;
          }
          successMessage += `\n  • ${detail.name}: ${status}`;
        });
      }
      
      successMessage += `\n\nStay safe! 🙏`;

      alert(successMessage);

      // Refresh incidents
      const userIncidents = await getUserIncidents(currentUser.uid);
      setIncidents(userIncidents);

    } catch (error) {
      console.error('SOS Error:', error);
      alert(`SOS Alert Error: ${error.message}\n\nPlease enable location permissions and try again.`);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPhoto = async () => {
    if (!profilePhoto || !currentUser) {
      alert('Please select a photo');
      return;
    }

    try {
      console.log('Uploading photo...', profilePhoto);
      console.log('User:', currentUser.uid);

      // Convert image to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(profilePhoto);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });

      console.log('Photo converted to base64');

      // Update user profile with photo URL (base64)
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        photoURL: base64,
        updatedAt: serverTimestamp()
      });

      console.log('Photo saved to Firestore ✅');
      alert('Profile photo updated successfully! ✅');
      setShowProfilePhotoModal(false);
      setProfilePhoto(null);
      setPhotoPreview(null);
      // Reload to show new photo
      window.location.reload();
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert(`Failed to upload photo: ${error.message}`);
    }
  };

  // Toggle SOS Alerts
  const handleToggleSOSAlerts = () => {
    setSosAlertsEnabled(!sosAlertsEnabled);
    alert(!sosAlertsEnabled 
      ? '✅ SOS Alerts Enabled\n\nYour emergency contacts will be notified when you trigger SOS.' 
      : '❌ SOS Alerts Disabled\n\nYou can re-enable this anytime.');
  };

  // Toggle Location Tracking
  const handleToggleLocationTracking = () => {
    setLocationTrackingEnabled(!locationTrackingEnabled);
    alert(!locationTrackingEnabled 
      ? '✅ Location Tracking Enabled\n\nYour location will be shared with emergency contacts.' 
      : '❌ Location Tracking Disabled\n\nYou can re-enable this anytime.');
  };

  // Call contact
  const handleCallContact = (phone) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  // Delete contact
  const handleDeleteContact = async (contactId, contactName) => {
    if (!confirm(`Are you sure you want to delete "${contactName}" from emergency contacts?`)) {
      return;
    }

    try {
      console.log('Deleting contact:', contactId);
      
      // Import deleteDoc if not already imported
      const { deleteDoc, doc } = await import('firebase/firestore');
      
      const contactRef = doc(db, 'users', currentUser.uid, 'contacts', contactId);
      await deleteDoc(contactRef);
      
      console.log('Contact deleted ✅');
      
      // Refresh contacts list
      const userContacts = await getEmergencyContacts(currentUser.uid);
      setContacts(userContacts);
      
      alert(`✅ ${contactName} removed from emergency contacts`);
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert(`Failed to delete contact: ${error.message}`);
    }
  };

  // Dynamic stats from Firestore
  const stats = [
    { icon: Shield, label: 'Safety Score', value: userProfile?.safetyScore || '100%', color: 'text-green-600', bgColor: 'bg-green-50' },
    { icon: Bell, label: 'SOS Alerts', value: userStats?.totalIncidents || '0', color: 'text-red-600', bgColor: 'bg-red-50' },
    { icon: Users, label: 'Emergency Contacts', value: contacts.length || '0', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { icon: MapPin, label: 'Locations Tracked', value: trackedLocations.length > 0 ? trackedLocations.length : (userStats?.totalLocations || '0'), color: 'text-purple-600', bgColor: 'bg-purple-50' },
  ];

  // Dynamic emergency contacts
  const emergencyContacts = contacts.length > 0 ? contacts.map(c => ({
    id: c.id,
    name: c.name,
    relation: c.relation,
    phone: c.phone,
    status: c.status || 'offline'
  })) : [
    { id: 1, name: 'Rajesh Kumar', relation: 'Father', phone: '+91 9876543210', status: 'online' },
    { id: 2, name: 'Priya Sharma', relation: 'Mother', phone: '+91 9876543211', status: 'online' },
    { id: 3, name: 'Amit Verma', relation: 'Friend', phone: '+91 9876543212', status: 'offline' },
  ];

  // Dynamic recent activity
  const recentActivity = incidents.length > 0 ? incidents.slice(0, 5).map(inc => ({
    id: inc.id,
    type: inc.type,
    message: inc.message || `${inc.type} event recorded`,
    time: inc.createdAt?.toDate().toLocaleString() || 'Recently',
    status: inc.status || 'completed'
  })) : [
    { id: 1, type: 'sos', message: 'SOS alert sent to all contacts', time: '2 hours ago', status: 'resolved' },
    { id: 2, type: 'location', message: 'Location shared with Priya Sharma', time: '5 hours ago', status: 'active' },
    { id: 3, type: 'checkin', message: 'Safe check-in completed', time: '1 day ago', status: 'completed' },
  ];

  const navItems = [
    { id: 'overview', icon: Activity, label: 'Overview' },
    { id: 'contacts', icon: Users, label: 'Emergency Contacts' },
    { id: 'history', icon: Clock, label: 'Activity History' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const handleSOSClick = () => {
    setShowSOSConfirm(true);
    setSosCountdown(3);

    const countdown = setInterval(() => {
      setSosCountdown(prev => {
        if (prev === 1) {
          clearInterval(countdown);
          setShowSOSConfirm(false);
          setSosCountdown(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pt-20 overflow-x-hidden">
      <div className="flex relative w-full max-w-full">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          />
        )}

        {/* Sidebar */}
        <motion.aside
          initial={{ x: -280 }}
          animate={{ x: isSidebarOpen ? 0 : -280 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={`fixed left-0 top-20 h-full w-64 bg-white shadow-xl z-30 lg:translate-x-0 lg:static lg:h-[calc(100vh-5rem)]`}
        >
          <div className="p-6">
            {/* User Profile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center space-x-3 mb-8 pb-6 border-b-2 border-gray-300"
            >
              <div className="relative">
                {userProfile?.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt="Profile"
                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-xl"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center shadow-xl border-2 border-white">
                    <User className="h-7 w-7 text-white" />
                  </div>
                )}
                <button
                  onClick={() => setShowProfilePhotoModal(true)}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center hover:bg-primary-700 transition-colors shadow-lg border-2 border-white"
                  title="Change profile photo"
                >
                  <Camera className="h-3 w-3 text-white" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-gray-900 truncate text-lg md:text-xl drop-shadow-sm">
                  {currentUser?.displayName || currentUser?.email || 'User'}
                </h3>
                <p className="text-base text-gray-800 truncate font-bold">{currentUser?.email || 'Loading...'}</p>
              </div>
            </motion.div>

            {/* Navigation */}
            <nav className="space-y-2">
              {navItems.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 text-left ${
                    activeTab === item.id
                      ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-600'
                      : 'text-gray-600 hover:bg-Black-50'
                  }`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </motion.button>
              ))}
            </nav>

            {/* Logout */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={handleLogout}
              className="absolute bottom-6 left-6 right-6 flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all w-auto"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">Logout</span>
            </motion.button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <div className="flex-1 w-full max-w-full overflow-x-hidden">
          <div className="p-4 md:p-6 lg:p-8">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-between items-center mb-8"
            >
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                  Dashboard
                </h1>
                <p className="text-gray-600">Manage your safety settings and monitor activity</p>
              </div>

              {/* Mobile Menu Toggle */}
             

              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="lg:hidden p-2 bg-white rounded-lg shadow-md"
                >
                  {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </motion.button>

                {/* SOS Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendSOS}
                  className="relative px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all animate-pulse-slow text-sm md:text-base"
                >
                  <div className="flex items-center space-x-2">
                    <Bell className="h-4 w-4 md:h-5 md:w-5" />
                    <span>SOS</span>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-red-400 animate-ping opacity-20" />
                </motion.button>
              </div>
            </motion.div>

            {/* Tab Content Rendering */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
                >
                  {stats.map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.1 }}
                      whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                      className={`${stat.bgColor} rounded-xl p-4 md:p-6 shadow-md transition-all cursor-pointer min-w-0`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`${stat.bgColor} ${stat.color} p-2 md:p-3 rounded-lg`}>
                          <stat.icon className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                      </div>
                      <div className={`${stat.color} text-xl md:text-3xl font-bold mb-1`}>{stat.value}</div>
                      <div className="text-gray-600 text-xs md:text-sm">{stat.label}</div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Suraksha Device Sensor Data */}
                {sensorData && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 rounded-xl shadow-lg p-6 mb-8 border-2 border-blue-200"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <Activity className="h-6 w-6 text-blue-600" />
                        <span>📡 Live Suraksha Device Sensor Data</span>
                      </h2>
                      <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-100 rounded-full">
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-green-700">Live</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Temperature */}
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="bg-white rounded-xl p-5 shadow-md border-l-4 border-orange-500"
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <Thermometer className="h-5 w-5 text-orange-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-600">Temperature</span>
                        </div>
                        <p className="text-3xl font-bold text-orange-600">
                          {sensorData.temperature || "N/A"} °C
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {sensorData.temperature > 35 ? '⚠️ High' : sensorData.temperature > 30 ? '⚡ Normal' : '✅ Cool'}
                        </p>
                      </motion.div>

                      {/* Humidity */}
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="bg-white rounded-xl p-5 shadow-md border-l-4 border-blue-500"
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Droplets className="h-5 w-5 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-600">Humidity</span>
                        </div>
                        <p className="text-3xl font-bold text-blue-600">
                          {sensorData.humidity || "N/A"} %
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {sensorData.humidity > 70 ? '💧 High' : sensorData.humidity > 40 ? '✅ Optimal' : '🌵 Low'}
                        </p>
                      </motion.div>

                      {/* Location */}
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="bg-white rounded-xl p-5 shadow-md border-l-4 border-green-500 md:col-span-1"
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <MapPin className="h-5 w-5 text-green-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-600">GPS Location</span>
                        </div>
                        <p className="text-sm font-bold text-green-700 break-words max-h-16 overflow-y-auto">
                          {sensorData.location || "Waiting for GPS..."}
                        </p>
                        <p className="text-xs text-gray-500 mt-2 flex items-center space-x-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>Real-time tracking</span>
                        </p>
                      </motion.div>
                    </div>

                    {/* Southern Uttar Pradesh Location */}
                    <div className="mt-4 pt-4 border-t-2 border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-700 flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-green-600" />
                          <span>Southern Uttar Pradesh Region</span>
                        </h3>
                      </div>
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">Latitude</p>
                            <p className="text-lg font-bold text-green-700 font-mono">25.4612° N</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500 mb-1">Longitude</p>
                            <p className="text-lg font-bold text-green-700 font-mono">81.8521° E</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-3 text-center">
                          📍 Approximate coordinates for Southern UP, India
                        </p>
                      </div>
                    </div>

                    {/* Live Location Tracker */}
                    {trackedLocations.length > 0 && (
                      <div className="mt-4 pt-4 border-t-2 border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-gray-700 flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-purple-600" />
                            <span>Live Location Tracking</span>
                          </h3>
                          <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                            {trackedLocations.length} location{trackedLocations.length > 1 ? 's' : ''} tracked
                          </span>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-2">
                          {trackedLocations.slice(-3).reverse().map((loc, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-2 text-xs border border-gray-200">
                              <span className="text-gray-700 font-medium truncate flex-1">{loc.location}</span>
                              <span className="text-gray-500 ml-2">{new Date(loc.timestamp).toLocaleTimeString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* My Devices Quick Access Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                  className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 rounded-xl shadow-lg p-6 mb-8 border-2 border-purple-200 cursor-pointer"
                  onClick={() => navigate('/my-devices')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                        <Shield className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">My Suraksha Devices</h3>
                        <p className="text-sm text-gray-600">Manage and monitor your connected devices</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-purple-600">
                      <span className="font-semibold">View All</span>
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                </motion.div>

                {/* Emergency Contacts & Activity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Emergency Contacts */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl shadow-lg p-4 md:p-6 min-w-0"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <Users className="h-5 w-5 text-primary-600" />
                        <span>Emergency Contacts</span>
                      </h2>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAddContact(true)}
                        className="text-primary-600 font-medium hover:underline text-sm flex items-center space-x-1"
                      >
                        <span>+ Add New</span>
                      </motion.button>
                    </div>

                    {contacts.length > 0 ? (
                      <div className="space-y-3">
                        {contacts.map((contact, index) => (
                          <motion.div
                            key={contact.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + index * 0.1 }}
                            whileHover={{ x: 5, backgroundColor: 'rgba(0,0,0,0.02)' }}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg transition-all cursor-pointer"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                                <p className="text-sm text-gray-500">{contact.relation}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleCallContact(contact.phone)}
                                className="p-2 bg-green-100 rounded-full hover:bg-green-200 transition-colors"
                                title="Call"
                              >
                                <Phone className="h-4 w-4 text-green-600" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDeleteContact(contact.id, contact.name)}
                                className="p-2 bg-red-100 rounded-full hover:bg-red-200 transition-colors"
                                title="Delete"
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No emergency contacts yet</p>
                        <p className="text-gray-400 text-sm mt-1">Click "Add New" to add contacts</p>
                      </div>
                    )}
                  </motion.div>

                  {/* Recent Activity */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-xl shadow-lg p-4 md:p-6 min-w-0"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-primary-600" />
                        <span>Recent Activity</span>
                      </h2>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveTab('history')}
                        className="text-primary-600 font-medium hover:underline text-sm"
                      >
                        View All
                      </motion.button>
                    </div>

                    {incidents.length > 0 ? (
                      <div className="space-y-4">
                        {incidents.slice(0, 5).map((activity, index) => (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + index * 0.1 }}
                            className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-0"
                          >
                            <div className={`p-2 rounded-full ${
                              activity.type === 'sos' ? 'bg-red-100' :
                              activity.type === 'location' ? 'bg-blue-100' :
                              activity.type === 'checkin' ? 'bg-green-100' : 'bg-yellow-100'
                            }`}>
                              {activity.type === 'sos' ? <Bell className="h-4 w-4 text-red-600" /> :
                               activity.type === 'location' ? <MapPin className="h-4 w-4 text-blue-600" /> :
                               activity.type === 'checkin' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                               <AlertCircle className="h-4 w-4 text-yellow-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{activity.message || `${activity.type} event`}</p>
                              <p className="text-sm text-gray-500">{activity.createdAt?.toDate().toLocaleString() || 'Recently'}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No recent activity</p>
                        <p className="text-gray-400 text-sm mt-1">Your activity will appear here</p>
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            )}

            {/* Emergency Contacts Tab */}
            {activeTab === 'contacts' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                    <Users className="h-6 w-6 text-primary-600" />
                    <span>Emergency Contacts</span>
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAddContact(true)}
                    className="bg-primary-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                  >
                    <Users className="h-5 w-5" />
                    <span>Add New Contact</span>
                  </motion.button>
                </div>

                {contacts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {contacts.map((contact, index) => (
                      <motion.div
                        key={contact.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -5, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                        className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200"
                      >
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">{contact.name}</h4>
                            <p className="text-sm text-gray-500">{contact.relation}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm text-gray-700">
                            <Phone className="h-4 w-4 text-primary-600" />
                            <span>{contact.phone}</span>
                          </div>
                          {contact.email && (
                            <div className="flex items-center space-x-2 text-sm text-gray-700">
                              <Mail className="h-4 w-4 text-primary-600" />
                              <span>{contact.email}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 flex space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCallContact(contact.phone)}
                            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                          >
                            <Phone className="h-4 w-4" />
                            <span>Call</span>
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDeleteContact(contact.id, contact.name)}
                            className="py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                            title="Delete Contact"
                          >
                            <X className="h-4 w-4" />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Users className="h-24 w-24 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium text-lg">No emergency contacts yet</p>
                    <p className="text-gray-400 text-sm mt-2">Click "Add New Contact" to add your first contact</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Activity History Tab */}
            {activeTab === 'history' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                    <Clock className="h-6 w-6 text-primary-600" />
                    <span>Activity History</span>
                  </h2>
                </div>

                {incidents.length > 0 ? (
                  <div className="space-y-4">
                    {incidents.map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl border border-gray-200"
                      >
                        <div className={`p-3 rounded-full ${
                          activity.type === 'sos' ? 'bg-red-100' :
                          activity.type === 'location' ? 'bg-blue-100' :
                          activity.type === 'checkin' ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {activity.type === 'sos' ? <Bell className="h-5 w-5 text-red-600" /> :
                           activity.type === 'location' ? <MapPin className="h-5 w-5 text-blue-600" /> :
                           activity.type === 'checkin' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                           <AlertCircle className="h-5 w-5 text-yellow-600" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">{activity.message || `${activity.type} event`}</h3>
                          <p className="text-sm text-gray-500 mt-1">{activity.createdAt?.toDate().toLocaleString() || 'Recently'}</p>
                          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                            activity.status === 'active' ? 'bg-red-100 text-red-700' :
                            activity.status === 'resolved' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {activity.status || 'completed'}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Clock className="h-24 w-24 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium text-lg">No activity yet</p>
                    <p className="text-gray-400 text-sm mt-2">Your activity history will appear here</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-xl shadow-lg p-6"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                  <Settings className="h-6 w-6 text-primary-600" />
                  <span>Settings</span>
                </h2>

                <div className="space-y-6">
                  {/* Profile Section */}
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Profile Settings</h3>
                    <div className="flex items-center space-x-4">
                      {userProfile?.photoURL ? (
                        <img
                          src={userProfile.photoURL}
                          alt="Profile"
                          className="w-20 h-20 rounded-full object-cover border-4 border-primary-500"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                          <User className="h-10 w-10 text-white" />
                        </div>
                      )}
                      <div>
                        <button
                          onClick={() => setShowProfilePhotoModal(true)}
                          className="bg-primary-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                        >
                          <Camera className="h-4 w-4" />
                          <span>Change Profile Photo</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Account Section */}
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Account Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-600">Email</label>
                        <p className="font-medium text-gray-900">{currentUser?.email || 'Not available'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Name</label>
                        <p className="font-medium text-gray-900">{currentUser?.displayName || userProfile?.name || 'Not set'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Safety Settings */}
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Safety Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">SOS Alerts</p>
                          <p className="text-sm text-gray-500">Enable emergency SOS alerts</p>
                        </div>
                        <button
                          onClick={handleToggleSOSAlerts}
                          className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${
                            sosAlertsEnabled ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                            sosAlertsEnabled ? 'right-1' : 'left-1'
                          }`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Location Tracking</p>
                          <p className="text-sm text-gray-500">Share location with emergency contacts</p>
                        </div>
                        <button
                          onClick={handleToggleLocationTracking}
                          className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${
                            locationTrackingEnabled ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                            locationTrackingEnabled ? 'right-1' : 'left-1'
                          }`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="border-2 border-red-200 rounded-xl p-4 bg-red-50">
                    <h3 className="text-lg font-bold text-red-700 mb-2">Danger Zone</h3>
                    <p className="text-sm text-red-600 mb-4">These actions are irreversible</p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleLogout}
                      className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Logout</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* SOS Confirmation Modal */}
      <AnimatePresence>
        {showSOSConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSOSConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                <Bell className="h-10 w-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Send SOS Alert?</h3>
              <p className="text-gray-600 mb-6">
                This will notify all your emergency contacts with your current location.
              </p>
              <div className="text-5xl font-bold text-red-600 mb-6">
                {sosCountdown}
              </div>
              <div className="flex space-x-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowSOSConfirm(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                >
                  Send Alert
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Contact Modal */}
      <AnimatePresence>
        {showAddContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddContact(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                  <Users className="h-6 w-6 text-primary-600" />
                  <span>Add Emergency Contact</span>
                </h3>
                <button
                  onClick={() => setShowAddContact(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleAddContact} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relation <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newContact.relation}
                    onChange={(e) => setNewContact({ ...newContact, relation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Select relation</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Friend">Friend</option>
                    <option value="Colleague">Colleague</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowAddContact(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-4 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-md"
                  >
                    Add Contact
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Photo Upload Modal */}
      <AnimatePresence>
        {showProfilePhotoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowProfilePhotoModal(false);
              setProfilePhoto(null);
              setPhotoPreview(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                  <Camera className="h-6 w-6 text-primary-600" />
                  <span>Update Profile Photo</span>
                </h3>
                <button
                  onClick={() => {
                    setShowProfilePhotoModal(false);
                    setProfilePhoto(null);
                    setPhotoPreview(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex justify-center mb-4">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-32 h-32 rounded-full object-cover border-4 border-primary-500 shadow-xl"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                      <User className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>

                <label className="block w-full py-3 px-4 bg-primary-50 hover:bg-primary-100 text-primary-700 font-semibold rounded-lg cursor-pointer transition-colors text-center">
                  <Camera className="h-5 w-5 inline mr-2" />
                  <span>Choose Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 text-center mt-2">
                  JPG, PNG or GIF. Max size 5MB
                </p>
              </div>

              <div className="flex space-x-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowProfilePhotoModal(false);
                    setProfilePhoto(null);
                    setPhotoPreview(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUploadPhoto}
                  disabled={!profilePhoto}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload Photo
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default Dashboard;
