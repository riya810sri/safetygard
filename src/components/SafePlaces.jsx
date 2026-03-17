import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Shield, Hospital, Building2, Phone, Navigation, Star, Clock, AlertTriangle, X, Search } from "lucide-react";

// Global event emitter for chatbot integration
export const safePlacesEvent = new EventTarget();

export const openSafePlacesModal = () => {
  safePlacesEvent.dispatchEvent(new CustomEvent('open-safe-places'));
};

// Safe place categories
const SAFE_PLACE_CATEGORIES = [
  { id: "police", name: "Police Station", icon: Shield, color: "blue", keywords: ["police", "thana", "station", "cop"] },
  { id: "hospital", name: "Hospital", icon: Hospital, color: "red", keywords: ["hospital", "medical", "clinic", "health", "emergency"] },
  { id: "women_help", name: "Women Help Desk", icon: Building2, color: "purple", color2: "pink", keywords: ["women", "help", "desk", "shelter"] },
  { id: "metro", name: "Metro/Train Station", icon: Navigation, color: "green", keywords: ["metro", "train", "station", "railway"] },
];

// Mock data for safe places (in production, use Google Places API)
const getSafePlacesNearby = (lat, lng, category) => {
  // Sample police stations and safe places (replace with real API data)
  const places = {
    police: [
      {
        id: 1,
        name: "Local Police Station",
        address: "Main Road, City Center",
        distance: "0.8 km",
        phone: "100",
        rating: 4.5,
        open24Hours: true,
        lat: lat + 0.01,
        lng: lng + 0.01
      },
      {
        id: 2,
        name: "Women Police Station",
        address: "Gandhi Nagar, District",
        distance: "1.2 km",
        phone: "1091",
        rating: 4.7,
        open24Hours: true,
        lat: lat + 0.015,
        lng: lng - 0.005
      },
      {
        id: 3,
        name: "Traffic Police Booth",
        address: "Market Area",
        distance: "2.0 km",
        phone: "1073",
        rating: 4.2,
        open24Hours: false,
        lat: lat - 0.008,
        lng: lng + 0.012
      }
    ],
    hospital: [
      {
        id: 4,
        name: "City Hospital (24/7)",
        address: "Hospital Road",
        distance: "1.5 km",
        phone: "102",
        rating: 4.6,
        open24Hours: true,
        lat: lat + 0.012,
        lng: lng + 0.008
      },
      {
        id: 5,
        name: "Emergency Medical Center",
        address: "Civil Lines",
        distance: "2.3 km",
        phone: "108",
        rating: 4.4,
        open24Hours: true,
        lat: lat - 0.01,
        lng: lng + 0.015
      }
    ],
    women_help: [
      {
        id: 6,
        name: "Women's Shelter Home",
        address: "Safe Zone Area",
        distance: "1.8 km",
        phone: "181",
        rating: 4.8,
        open24Hours: true,
        lat: lat + 0.018,
        lng: lng - 0.01
      },
      {
        id: 7,
        name: "NGO Help Center",
        address: "Community Center",
        distance: "2.5 km",
        phone: "1098",
        rating: 4.5,
        open24Hours: false,
        lat: lat - 0.015,
        lng: lng - 0.008
      }
    ],
    metro: [
      {
        id: 8,
        name: "Central Metro Station",
        address: "Metro Line 1",
        distance: "0.5 km",
        phone: "N/A",
        rating: 4.3,
        open24Hours: false,
        lat: lat + 0.005,
        lng: lng + 0.005
      },
      {
        id: 9,
        name: "Railway Junction",
        address: "Station Road",
        distance: "3.0 km",
        phone: "139",
        rating: 4.0,
        open24Hours: true,
        lat: lat - 0.02,
        lng: lng + 0.01
      }
    ]
  };

  return places[category] || [];
};

export default function SafePlaces() {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("police");
  const [safePlaces, setSafePlaces] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);

  console.log("🛡️ SafePlaces component render, isOpen:", isOpen, "location:", location);

  // Listen for chatbot events
  useEffect(() => {
    const handleOpenEvent = () => {
      console.log("🛡️ Safe Places event received!");
      setIsOpen(true);
      // Don't call getUserLocation here - it will be called by the effect below
    };

    safePlacesEvent.addEventListener('open-safe-places', handleOpenEvent);
    
    return () => {
      safePlacesEvent.removeEventListener('open-safe-places', handleOpenEvent);
    };
  }, []);

  // Auto-get location when modal opens
  useEffect(() => {
    if (isOpen && !location) {
      console.log("🛡️ Modal opened, getting location...");
      getUserLocation();
    }
  }, [isOpen]);

  // Get user location
  const getUserLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setLocation(userLocation);
        setLoading(false);
        console.log("📍 User location:", userLocation);
      },
      (error) => {
        console.error("Location error:", error);
        setError("Unable to get your location. Please enable location permissions.");
        setLoading(false);
      },
      { timeout: 10000 }
    );
  };

  // Fetch safe places when category or location changes
  useEffect(() => {
    if (location && selectedCategory) {
      const places = getSafePlacesNearby(location.lat, location.lng, selectedCategory);
      
      // Filter by search query
      const filtered = searchQuery
        ? places.filter(place =>
            place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            place.address.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : places;
      
      setSafePlaces(filtered);
    }
  }, [location, selectedCategory, searchQuery]);

  // Open modal and get location
  const handleOpen = () => {
    setIsOpen(true);
    getUserLocation();
  };

  // Get directions
  const getDirections = (lat, lng) => {
    if (location) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${location.lat},${location.lng}&destination=${lat},${lng}&travelmode=driving`;
      window.open(url, "_blank");
    }
  };

  // Call place
  const callPlace = (phone) => {
    if (phone && phone !== "N/A") {
      window.location.href = `tel:${phone}`;
    }
  };

  return (
    <>
      {/* Floating Safe Places Button */}
      <motion.button
        onClick={handleOpen}
        className="fixed bottom-32 right-4 sm:right-6 z-[9999] flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full shadow-2xl transition-all overflow-hidden border-2 border-white/20"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
        title="Find Safe Places Nearby"
        style={{ pointerEvents: 'auto' }}
      >
        <Shield size={24} className="text-white" />
      </motion.button>

      {/* Safe Places Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Safe Places Nearby</h2>
                      <p className="text-blue-100 text-sm">Find police stations, hospitals & more</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>

              {/* Location Status */}
              <div className="p-4 bg-blue-50 border-b border-blue-100">
                {loading ? (
                  <div className="flex items-center space-x-3 text-blue-600">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="font-medium">Getting your location...</span>
                  </div>
                ) : error ? (
                  <div className="flex items-center space-x-3 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">{error}</span>
                  </div>
                ) : location ? (
                  <div className="flex items-center space-x-3 text-green-600">
                    <MapPin className="w-5 h-5" />
                    <span className="font-medium">Location found • Finding nearby safe places</span>
                  </div>
                ) : (
                  <button
                    onClick={getUserLocation}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2"
                  >
                    <MapPin className="w-5 h-5" />
                    <span>Enable Location</span>
                  </button>
                )}
              </div>

              {/* Category Tabs */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                  {SAFE_PLACE_CATEGORIES.map((category) => (
                    <motion.button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                        selectedCategory === category.id
                          ? `bg-${category.color}-100 text-${category.color}-700 shadow-md`
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <category.icon className={`w-5 h-5 ${selectedCategory === category.id ? `text-${category.color}-600` : ""}`} />
                      <span className="text-sm">{category.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="p-4 bg-gray-50">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or address..."
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Safe Places List */}
              <div className="p-4 overflow-y-auto max-h-96 space-y-3">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Finding safe places near you...</p>
                  </div>
                ) : safePlaces.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No safe places found nearby</p>
                    <p className="text-sm text-gray-500 mt-2">Try enabling location or selecting a different category</p>
                  </div>
                ) : (
                  safePlaces.map((place, index) => (
                    <motion.div
                      key={place.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white border-2 border-gray-100 rounded-2xl p-4 hover:border-blue-200 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">{place.name}</h3>
                            {place.open24Hours && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                24/7
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-1 mb-3">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span>{place.address}</span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="flex items-center space-x-1 text-gray-600">
                                <Navigation className="w-4 h-4" />
                                <span className="font-medium">{place.distance}</span>
                              </span>
                              <span className="flex items-center space-x-1 text-yellow-600">
                                <Star className="w-4 h-4 fill-current" />
                                <span className="font-medium">{place.rating}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <motion.button
                              onClick={() => getDirections(place.lat, place.lng)}
                              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Navigation className="w-4 h-4" />
                              <span>Get Directions</span>
                            </motion.button>
                            <motion.button
                              onClick={() => callPlace(place.phone)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Phone className="w-4 h-4" />
                              <span>Call</span>
                            </motion.button>
                          </div>
                        </div>

                        <div className={`ml-4 p-3 bg-${SAFE_PLACE_CATEGORIES.find(c => c.id === selectedCategory)?.color}-100 rounded-xl`}>
                          {(() => {
                            const IconComponent = SAFE_PLACE_CATEGORIES.find(c => c.id === selectedCategory)?.icon || Shield;
                            const iconColor = SAFE_PLACE_CATEGORIES.find(c => c.id === selectedCategory)?.color || 'blue';
                            return <IconComponent className={`w-6 h-6 text-${iconColor}-600`} />;
                          })()}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Emergency Numbers Footer */}
              <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-t border-red-100">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="font-bold text-red-800">Emergency Numbers</h3>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xs text-gray-500">National</p>
                    <p className="text-lg font-bold text-red-600">112</p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xs text-gray-500">Police</p>
                    <p className="text-lg font-bold text-blue-600">100</p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xs text-gray-500">Women</p>
                    <p className="text-lg font-bold text-purple-600">181</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
