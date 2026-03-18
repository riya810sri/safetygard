import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Search,
  Filter,
  Shield,
  AlertTriangle,
  Users,
  Navigation,
  Plus,
  X
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons for different safety levels
const createCustomIcon = (type) => {
  const colors = {
    safe: '#22c55e',
    moderate: '#eab308',
    caution: '#ef4444'
  };

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${colors[type]};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 0 50%;
        transform: rotate(45deg);
        border: 3px solid white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
};

// Bubble-style icons for Prayagraj zones with floating animation
const createBubbleIcon = (type, size = 'medium') => {
  const sizes = {
    small: 24,
    medium: 32,
    large: 40
  };

  const radius = sizes[size];
  
  const colors = {
    safe: '#22c55e',
    moderate: '#eab308',
    caution: '#ef4444'
  };

  return L.divIcon({
    className: 'bubble-marker',
    html: `<div style="
      width: ${radius}px;
      height: ${radius}px;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, ${type === 'safe' ? '#86efac' : type === 'moderate' ? '#fde047' : '#fca5a5'}, ${colors[type]});
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      animation: bubble-float 2s ease-in-out infinite;
      cursor: pointer;
    "></div>`,
    iconSize: [radius, radius],
    iconAnchor: [radius / 2, radius / 2],
    popupAnchor: [0, -radius / 2]
  });
};

// Search Location Component
const SearchLocation = ({ onLocationSelect }) => {
  const map = useMapEvents({
    click: (e) => {
      onLocationSelect({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        name: 'Selected Location'
      });
    },
  });

  return null;
};

const PublicMap = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchResult, setSearchResult] = useState(null);
  const [showSearchResult, setShowSearchResult] = useState(false);
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]); // Delhi coordinates
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [viewMode, setViewMode] = useState('india'); // 'india' or 'prayagraj'
  const [showHeaderAlert, setShowHeaderAlert] = useState(false);
  const [headerAlertMessage, setHeaderAlertMessage] = useState('');
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  
  // Create audio ref for siren sound
  const sirenAudioRef = useRef(null);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);
  
  // Initialize audio on component mount
  useEffect(() => {
    // Try to load siren.mp3 first
    sirenAudioRef.current = new Audio('/siren.mp3');
    if (sirenAudioRef.current) {
      sirenAudioRef.current.loop = true;
      sirenAudioRef.current.volume = 0.7;
      sirenAudioRef.current.preload = 'auto';
      
      // Handle audio errors - fallback to Web Audio API
      sirenAudioRef.current.addEventListener('error', (e) => {
        console.warn('Siren MP3 not found, using Web Audio API fallback');
      });
    }
    
    // Auto-initialize audio on first user interaction
    const initAudio = () => {
      if (!audioInitialized) {
        setAudioInitialized(true);
        
        // Initialize Web Audio API context
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Try to play MP3 briefly to test
        if (sirenAudioRef.current) {
          sirenAudioRef.current.play().then(() => {
            sirenAudioRef.current.pause();
            console.log('✅ MP3 siren initialized');
          }).catch(() => {
            console.log('Will use Web Audio API fallback');
          });
        }
        
        console.log('🔊 Audio system initialized');
        
        // Remove event listeners after initialization
        document.removeEventListener('click', initAudio);
        document.removeEventListener('keydown', initAudio);
        document.removeEventListener('touchstart', initAudio);
      }
    };
    
    // Add event listeners for auto-initialization
    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);
    document.addEventListener('touchstart', initAudio);
    
    return () => {
      if (sirenAudioRef.current) {
        sirenAudioRef.current.pause();
        sirenAudioRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, []);
  
  // Create siren sound using Web Audio API (fallback)
  const createSirenSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    oscillatorRef.current = ctx.createOscillator();
    gainNodeRef.current = ctx.createGain();
    
    oscillatorRef.current.connect(gainNodeRef.current);
    gainNodeRef.current.connect(ctx.destination);
    
    oscillatorRef.current.type = 'sawtooth';
    oscillatorRef.current.frequency.value = 600;
    gainNodeRef.current.gain.value = 0.3;
    
    // Create siren effect (frequency modulation)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 2; // 2 Hz siren cycle
    
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 400; // Frequency range
    
    lfo.connect(lfoGain);
    lfoGain.connect(oscillatorRef.current.frequency);
    lfo.start();
    
    return { oscillator: oscillatorRef.current, lfo, ctx };
  };
  
  // Play siren sound - AUTOPLAYS when audio is initialized
  const playSiren = async () => {
    if (!audioInitialized) {
      console.warn('Audio not initialized yet - please interact with the page first');
      return;
    }
    
    if (isSirenPlaying) return;
    
    // Try MP3 first
    if (sirenAudioRef.current) {
      try {
        await sirenAudioRef.current.play();
        setIsSirenPlaying(true);
        console.log('🔊 Siren playing (MP3)');
        return;
      } catch (err) {
        console.log('MP3 failed, using Web Audio API');
      }
    }
    
    // Fallback to Web Audio API
    try {
      const { oscillator, lfo, ctx } = createSirenSound();
      oscillator.start();
      setIsSirenPlaying(true);
      console.log('🔊 Siren playing (Web Audio API)');
    } catch (err) {
      console.error('Siren play error:', err);
    }
  };
  
  // Stop siren sound
  const stopSiren = () => {
    // Stop MP3
    if (sirenAudioRef.current && isSirenPlaying) {
      sirenAudioRef.current.pause();
      sirenAudioRef.current.currentTime = 0;
    }
    
    // Stop Web Audio API
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      } catch (e) {
        // Already stopped
      }
    }
    
    setIsSirenPlaying(false);
    console.log('🔇 Siren stopped');
  };
  
  // Prayagraj Local Map State
  const [prayagrajMapCenter, setPrayagrajMapCenter] = useState([25.4358, 81.8463]);
  const [prayagrajSelectedLocation, setPrayagrajSelectedLocation] = useState(null);
  const [prayagrajMapInstance, setPrayagrajMapInstance] = useState(null);
  const [prayagrajFilter, setPrayagrajFilter] = useState('all');

  // Prayagraj (Allahabad) Local Areas - Safe, Moderate, Risky Zones
  const prayagrajZones = [
    // SAFE ZONES (Green)
    { id: 'p1', name: 'Civil Lines', type: 'safe', volunteers: 45, incidents: 1, lat: 25.4358, lng: 81.8463, area: 'Civil Lines', description: 'Well-lit, police presence' },
    { id: 'p2', name: 'Tagore Town', type: 'safe', volunteers: 38, incidents: 2, lat: 25.4412, lng: 81.8520, area: 'Tagore Town', description: 'Residential area, good connectivity' },
    { id: 'p3', name: 'George Town', type: 'safe', volunteers: 42, incidents: 1, lat: 25.4380, lng: 81.8450, area: 'George Town', description: 'Commercial hub, CCTV coverage' },
    { id: 'p4', name: 'Katra', type: 'safe', volunteers: 35, incidents: 2, lat: 25.4330, lng: 81.8400, area: 'Katra', description: 'Market area, busy during day' },
    { id: 'p5', name: 'Sadar Bazaar', type: 'safe', volunteers: 40, incidents: 3, lat: 25.4390, lng: 81.8380, area: 'Sadar', description: 'Cantonment area, secure' },
    { id: 'p6', name: 'MG Marg', type: 'safe', volunteers: 50, incidents: 1, lat: 25.4370, lng: 81.8490, area: 'Civil Lines', description: 'Main road, well populated' },
    { id: 'p7', name: 'Elgin Road', type: 'safe', volunteers: 36, incidents: 2, lat: 25.4400, lng: 81.8510, area: 'Civil Lines', description: 'Educational institutions nearby' },
    { id: 'p8', name: 'Ashok Nagar', type: 'safe', volunteers: 32, incidents: 2, lat: 25.4450, lng: 81.8600, area: 'Ashok Nagar', description: 'Residential colony' },
    { id: 'p9', name: 'Rambagh', type: 'safe', volunteers: 30, incidents: 1, lat: 25.4500, lng: 81.8700, area: 'Rambagh', description: 'Green area, peaceful' },
    { id: 'p10', name: 'Lukarganj', type: 'safe', volunteers: 28, incidents: 2, lat: 25.4320, lng: 81.8550, area: 'Lukarganj', description: 'Traditional market' },
    
    // MODERATE RISK ZONES (Yellow)
    { id: 'p11', name: 'Chowk', type: 'moderate', volunteers: 22, incidents: 6, lat: 25.4310, lng: 81.8350, area: 'Chowk', description: 'Crowded market, be careful' },
    { id: 'p12', name: 'Khusro Bagh Area', type: 'moderate', volunteers: 20, incidents: 5, lat: 25.4290, lng: 81.8320, area: 'Old City', description: 'Historical area, less lit at night' },
    { id: 'p13', name: 'Daryabad', type: 'moderate', volunteers: 25, incidents: 5, lat: 25.4280, lng: 81.8380, area: 'Daryabad', description: 'Wholesale market, crowded' },
    { id: 'p14', name: 'Jhusi', type: 'moderate', volunteers: 18, incidents: 4, lat: 25.4200, lng: 81.8900, area: 'Jhusi', description: 'Developing area, limited transport' },
    { id: 'p15', name: 'Naini', type: 'moderate', volunteers: 24, incidents: 6, lat: 25.4100, lng: 81.8200, area: 'Naini', description: 'Industrial area, be cautious' },
    { id: 'p16', name: 'Phaphamau', type: 'moderate', volunteers: 20, incidents: 5, lat: 25.4000, lng: 81.8700, area: 'Phaphamau', description: 'Suburban area, moderate risk' },
    { id: 'p17', name: 'Soraon', type: 'moderate', volunteers: 16, incidents: 4, lat: 25.3900, lng: 81.9000, area: 'Soraon', description: 'Rural-urban fringe' },
    { id: 'p18', name: 'Karchhana', type: 'moderate', volunteers: 15, incidents: 4, lat: 25.3800, lng: 81.8100, area: 'Karchhana', description: 'Developing locality' },
    
    // RISKY ZONES (Red) - High Caution Areas
    { id: 'p19', name: 'Zero Road', type: 'caution', volunteers: 12, incidents: 12, lat: 25.4250, lng: 81.8280, area: 'Zero Road', description: 'Less populated at night' },
    { id: 'p20', name: 'Mumfordganj', type: 'caution', volunteers: 10, incidents: 10, lat: 25.4200, lng: 81.8100, area: 'Mumfordganj', description: 'Isolated areas, avoid late night' },
    { id: 'p21', name: 'Johnstonganj', type: 'caution', volunteers: 14, incidents: 9, lat: 25.4270, lng: 81.8300, area: 'Old City', description: 'Narrow lanes, poor lighting' },
    { id: 'p22', name: 'Bhiti', type: 'caution', volunteers: 8, incidents: 8, lat: 25.4150, lng: 81.8000, area: 'Bhiti', description: 'Remote area, limited connectivity' },
    { id: 'p23', name: 'Mandhata', type: 'caution', volunteers: 10, incidents: 11, lat: 25.4100, lng: 81.7900, area: 'Mandhata', description: 'Industrial zone, avoid night' },
    { id: 'p24', name: 'Handia', type: 'caution', volunteers: 9, incidents: 8, lat: 25.3700, lng: 81.7800, area: 'Handia', description: 'Rural area, limited help' },
  ];

  const safetyZones = [
    { id: 1, name: 'Connaught Place', type: 'safe', volunteers: 45, incidents: 2, lat: 28.6315, lng: 77.2167, keywords: ['cp', 'connaught', 'place', 'central'] },
    { id: 2, name: 'Karol Bagh', type: 'moderate', volunteers: 28, incidents: 8, lat: 28.6519, lng: 77.1909, keywords: ['karol', 'bagh', 'west'] },
    { id: 3, name: 'Lajpat Nagar', type: 'safe', volunteers: 52, incidents: 1, lat: 28.5677, lng: 77.2436, keywords: ['lajpat', 'nagar', 'south', 'market'] },
    { id: 4, name: 'Chandni Chowk', type: 'caution', volunteers: 15, incidents: 12, lat: 28.6506, lng: 77.2303, keywords: ['chandni', 'chowk', 'old', 'delhi', 'crowded'] },
    { id: 5, name: 'Saket', type: 'safe', volunteers: 67, incidents: 0, lat: 28.5244, lng: 77.2066, keywords: ['saket', 'south', 'mall', 'select'] },
    { id: 6, name: 'Rohini', type: 'moderate', volunteers: 34, incidents: 5, lat: 28.7495, lng: 77.0610, keywords: ['rohini', 'north', 'west'] },
    { id: 7, name: 'Dwarka', type: 'safe', volunteers: 55, incidents: 3, lat: 28.5921, lng: 77.0460, keywords: ['dwarka', 'suburb', 'airport'] },
    { id: 8, name: 'Noida Sector 62', type: 'moderate', volunteers: 38, incidents: 7, lat: 28.6353, lng: 77.3644, keywords: ['noida', 'sector', 'it', 'tech'] },
    { id: 9, name: 'Gurgaon Cyber City', type: 'safe', volunteers: 72, incidents: 2, lat: 28.4949, lng: 77.0869, keywords: ['gurgaon', 'cyber', 'corporate'] },
    { id: 10, name: 'India Gate', type: 'safe', volunteers: 40, incidents: 1, lat: 28.6129, lng: 77.2295, keywords: ['india', 'gate', 'monument', 'central'] },
    { id: 11, name: 'Hauz Khas', type: 'safe', volunteers: 48, incidents: 2, lat: 28.5494, lng: 77.1932, keywords: ['hauz', 'khas', 'village', 'south'] },
    { id: 12, name: 'Paharganj', type: 'caution', volunteers: 12, incidents: 15, lat: 28.6433, lng: 77.2194, keywords: ['paharganj', 'market', 'tourist'] },
    // More Danger Zones (Caution Areas) across India
    { id: 121, name: 'Seelampur', type: 'caution', volunteers: 8, incidents: 18, lat: 28.6692, lng: 77.2853, keywords: ['seelampur', 'east delhi', 'industrial'], description: 'Industrial area, isolated at night' },
    { id: 122, name: 'Welcome Colony', type: 'caution', volunteers: 10, incidents: 16, lat: 28.6725, lng: 77.2947, keywords: ['welcome', 'shahdara', 'delhi'], description: 'Dense population, narrow lanes' },
    { id: 123, name: 'Kasturi Nagar', type: 'caution', volunteers: 14, incidents: 14, lat: 13.0293, lng: 77.6497, keywords: ['kasturi nagar', 'bangalore', 'kalyan nagar'], description: 'Less lighting, be careful at night' },
    { id: 124, name: 'Byrasandra', type: 'caution', volunteers: 12, incidents: 13, lat: 13.0207, lng: 77.6348, keywords: ['byrasandra', 'bangalore', 'ramamurthy nagar'], description: 'Isolated areas, limited transport' },
    { id: 125, name: 'Tannery Road', type: 'caution', volunteers: 11, incidents: 15, lat: 13.0067, lng: 77.6177, keywords: ['tannery road', 'bangalore', 'fraser town'], description: 'Industrial zone, avoid late night' },
    { id: 126, name: 'Garden Reach', type: 'caution', volunteers: 9, incidents: 17, lat: 22.5326, lng: 88.3159, keywords: ['garden reach', 'kolkata', 'port area'], description: 'Port area, less populated' },
    { id: 127, name: 'Metiabruz', type: 'caution', volunteers: 10, incidents: 16, lat: 22.5189, lng: 88.3098, keywords: ['metiabruz', 'kolkata', 'old area'], description: 'Old area, narrow streets' },
    { id: 128, name: 'Guptipara', type: 'caution', volunteers: 8, incidents: 14, lat: 23.1667, lng: 88.4167, keywords: ['guptipara', 'hooghly', 'west bengal'], description: 'Remote area, limited connectivity' },
    { id: 129, name: 'Gulbarga', type: 'caution', volunteers: 13, incidents: 13, lat: 17.1429, lng: 76.8348, keywords: ['gulbarga', 'kalaburagi', 'karnataka'], description: 'Developing area, be cautious' },
    { id: 130, name: 'Bidar', type: 'caution', volunteers: 11, incidents: 12, lat: 17.9104, lng: 77.5199, keywords: ['bidar', 'karnataka', 'border'], description: 'Border area, limited help' },
    { id: 131, name: 'Muzaffarpur', type: 'caution', volunteers: 15, incidents: 14, lat: 26.1226, lng: 85.3906, keywords: ['muzaffarpur', 'bihar', 'lychee'], description: 'Crowded market area' },
    { id: 132, name: 'Bhagalpur', type: 'caution', volunteers: 12, incidents: 13, lat: 25.2425, lng: 86.9842, keywords: ['bhagalpur', 'bihar', 'silk'], description: 'Industrial area, be careful' },
    { id: 133, name: 'Gaya', type: 'caution', volunteers: 14, incidents: 12, lat: 24.7914, lng: 85.0002, keywords: ['gaya', 'bihar', 'buddhist'], description: 'Pilgrim area, crowded' },
    { id: 134, name: 'Jamshedpur', type: 'caution', volunteers: 16, incidents: 11, lat: 22.8046, lng: 86.2029, keywords: ['jamshedpur', 'jharkhand', 'tata'], description: 'Industrial city, some risky zones' },
    { id: 135, name: 'Dhanbad', type: 'caution', volunteers: 13, incidents: 15, lat: 23.7957, lng: 86.4304, keywords: ['dhanbad', 'jharkhand', 'coal'], description: 'Mining area, isolated spots' },
    { id: 136, name: 'Raipur Old City', type: 'caution', volunteers: 14, incidents: 13, lat: 21.2390, lng: 81.6337, keywords: ['raipur', 'chhattisgarh', 'old city'], description: 'Old city, narrow lanes' },
    { id: 137, name: 'Bhilai Steel Plant', type: 'caution', volunteers: 15, incidents: 12, lat: 21.2096, lng: 81.3784, keywords: ['bhilai', 'chhattisgarh', 'steel'], description: 'Industrial zone, be cautious' },
    { id: 138, name: 'Korba', type: 'caution', volunteers: 10, incidents: 14, lat: 22.3595, lng: 82.7501, keywords: ['korba', 'chhattisgarh', 'power'], description: 'Power hub, remote areas' },
    { id: 139, name: 'Siliguri', type: 'caution', volunteers: 17, incidents: 13, lat: 26.7271, lng: 88.3953, keywords: ['siliguri', 'west bengal', 'darjeeling'], description: 'Tourist transit, be alert' },
    { id: 140, name: 'Malda', type: 'caution', volunteers: 11, incidents: 14, lat: 25.0096, lng: 88.1406, keywords: ['malda', 'west bengal', 'mango'], description: 'Border area, limited transport' },
    { id: 141, name: 'Asansol', type: 'caution', volunteers: 13, incidents: 15, lat: 23.6739, lng: 86.9524, keywords: ['asansol', 'west bengal', 'coal'], description: 'Mining area, industrial' },
    { id: 142, name: 'Durgapur', type: 'caution', volunteers: 14, incidents: 13, lat: 23.5204, lng: 87.3119, keywords: ['durgapur', 'west bengal', 'steel'], description: 'Steel city, some risky zones' },
    { id: 143, name: 'Howrah', type: 'caution', volunteers: 16, incidents: 14, lat: 22.5958, lng: 88.2636, keywords: ['howrah', 'kolkata', 'bridge'], description: 'Crowded station area' },
    { id: 144, name: 'Serampore', type: 'caution', volunteers: 12, incidents: 12, lat: 22.7506, lng: 88.3403, keywords: ['serampore', 'west bengal', 'hooghly'], description: 'Old town, narrow streets' },
    { id: 145, name: 'Barrackpore', type: 'caution', volunteers: 13, incidents: 13, lat: 22.7649, lng: 88.3753, keywords: ['barrackpore', 'kolkata', 'cantonment'], description: 'Cantonment area, be careful' },
    { id: 146, name: 'Bhatpara', type: 'caution', volunteers: 10, incidents: 15, lat: 22.8697, lng: 88.4021, keywords: ['bhatpara', 'west bengal', 'industrial'], description: 'Industrial area, isolated' },
    { id: 147, name: 'Kamarhati', type: 'caution', volunteers: 11, incidents: 14, lat: 22.6708, lng: 88.3742, keywords: ['kamarhati', 'kolkata', 'north'], description: 'Dense area, less lighting' },
    { id: 148, name: 'Madhyamgram', type: 'caution', volunteers: 12, incidents: 13, lat: 22.6963, lng: 88.4486, keywords: ['madhyamgram', 'kolkata', 'airport'], description: 'Airport vicinity, be alert' },
    { id: 149, name: 'Barasat', type: 'caution', volunteers: 13, incidents: 12, lat: 22.7210, lng: 88.4572, keywords: ['barasat', 'kolkata', 'north 24 parganas'], description: 'Suburban area, limited help' },
    { id: 150, name: 'Basirhat', type: 'caution', volunteers: 9, incidents: 14, lat: 22.6536, lng: 88.8919, keywords: ['basirhat', 'west bengal', 'border'], description: 'Border area, remote' },
    // Major cities across India
    { id: 13, name: 'Mumbai Central', type: 'safe', volunteers: 85, incidents: 5, lat: 19.0760, lng: 72.8777, keywords: ['mumbai', 'bombay', 'maharashtra'] },
    { id: 14, name: 'Bangalore City', type: 'safe', volunteers: 78, incidents: 3, lat: 12.9716, lng: 77.5946, keywords: ['bangalore', 'bengaluru', 'karnataka'] },
    { id: 15, name: 'Chennai Central', type: 'safe', volunteers: 65, incidents: 4, lat: 13.0827, lng: 80.2707, keywords: ['chennai', 'madras', 'tamilnadu'] },
    { id: 16, name: 'Kolkata Central', type: 'moderate', volunteers: 55, incidents: 8, lat: 22.5726, lng: 88.3639, keywords: ['kolkata', 'calcutta', 'west bengal'] },
    { id: 17, name: 'Hyderabad', type: 'safe', volunteers: 70, incidents: 2, lat: 17.3850, lng: 78.4867, keywords: ['hyderabad', 'telangana'] },
    { id: 18, name: 'Pune', type: 'safe', volunteers: 62, incidents: 3, lat: 18.5204, lng: 73.8567, keywords: ['pune', 'maharashtra'] },
    { id: 19, name: 'Ahmedabad', type: 'safe', volunteers: 58, incidents: 4, lat: 23.0225, lng: 72.5714, keywords: ['ahmedabad', 'gujarat'] },
    { id: 20, name: 'Jaipur', type: 'safe', volunteers: 50, incidents: 2, lat: 26.9124, lng: 75.7873, keywords: ['jaipur', 'rajasthan', 'pink city'] },
    { id: 21, name: 'Lucknow', type: 'moderate', volunteers: 45, incidents: 6, lat: 26.8467, lng: 80.9462, keywords: ['lucknow', 'up', 'uttar pradesh'] },
    { id: 22, name: 'Agra', type: 'safe', volunteers: 42, incidents: 3, lat: 27.1767, lng: 78.0081, keywords: ['agra', 'taj mahal', 'up'] },
    { id: 23, name: 'Kanpur', type: 'moderate', volunteers: 38, incidents: 7, lat: 26.4499, lng: 80.3319, keywords: ['kanpur', 'up'] },
    { id: 24, name: 'Nagpur', type: 'safe', volunteers: 40, incidents: 2, lat: 21.7679, lng: 79.0261, keywords: ['nagpur', 'maharashtra'] },
    { id: 25, name: 'Indore', type: 'safe', volunteers: 48, incidents: 2, lat: 22.7196, lng: 75.8577, keywords: ['indore', 'mp', 'madhya pradesh'] },
    { id: 26, name: 'Bhopal', type: 'safe', volunteers: 44, incidents: 3, lat: 23.2599, lng: 77.4126, keywords: ['bhopal', 'mp'] },
    { id: 27, name: 'Patna', type: 'caution', volunteers: 30, incidents: 10, lat: 25.5941, lng: 85.1376, keywords: ['patna', 'bihar'] },
    { id: 28, name: 'Chandigarh', type: 'safe', volunteers: 52, incidents: 1, lat: 30.7333, lng: 76.7794, keywords: ['chandigarh', 'punjab'] },
    { id: 29, name: 'Ludhiana', type: 'safe', volunteers: 46, incidents: 4, lat: 30.9010, lng: 75.8573, keywords: ['ludhiana', 'punjab'] },
    { id: 30, name: 'Surat', type: 'safe', volunteers: 60, incidents: 3, lat: 21.1702, lng: 72.8311, keywords: ['surat', 'gujarat'] },
    { id: 31, name: 'Prayagraj (Allahabad)', type: 'safe', volunteers: 38, incidents: 4, lat: 25.4358, lng: 81.8463, keywords: ['allahabad', 'prayagraj', 'up'] },
    { id: 32, name: 'Varanasi', type: 'safe', volunteers: 42, incidents: 3, lat: 25.3176, lng: 82.9739, keywords: ['varanasi', 'kashi', 'up'] },
    { id: 33, name: 'Raipur', type: 'safe', volunteers: 35, incidents: 3, lat: 21.2514, lng: 81.6296, keywords: ['raipur', 'chhattisgarh'] },
    { id: 34, name: 'Ranchi', type: 'moderate', volunteers: 32, incidents: 5, lat: 23.3441, lng: 85.3096, keywords: ['ranchi', 'jharkhand'] },
    { id: 35, name: 'Guwahati', type: 'safe', volunteers: 36, incidents: 2, lat: 26.1445, lng: 91.7362, keywords: ['guwahati', 'assam'] },
    { id: 36, name: 'Thiruvananthapuram', type: 'safe', volunteers: 40, incidents: 2, lat: 8.5241, lng: 76.9366, keywords: ['trivandrum', 'kerala', 'thiruvananthapuram'] },
    { id: 37, name: 'Kochi', type: 'safe', volunteers: 44, incidents: 3, lat: 9.9312, lng: 76.2673, keywords: ['kochi', 'cochin', 'kerala'] },
    { id: 38, name: 'Coimbatore', type: 'safe', volunteers: 42, incidents: 2, lat: 11.0168, lng: 76.9558, keywords: ['coimbatore', 'tamilnadu'] },
    { id: 39, name: 'Visakhapatnam', type: 'safe', volunteers: 38, incidents: 3, lat: 17.6868, lng: 83.2185, keywords: ['vizag', 'visakhapatnam', 'andhra'] },
    { id: 40, name: 'Vijayawada', type: 'safe', volunteers: 36, incidents: 4, lat: 16.5062, lng: 80.6480, keywords: ['vijayawada', 'andhra'] },
    // More Major Cities
    { id: 41, name: 'Kolkata', type: 'moderate', volunteers: 60, incidents: 7, lat: 22.5726, lng: 88.3639, keywords: ['kolkata', 'calcutta', 'west bengal'] },
    { id: 42, name: 'Delhi', type: 'safe', volunteers: 80, incidents: 5, lat: 28.6139, lng: 77.2090, keywords: ['delhi', 'new delhi', 'capital'] },
    { id: 43, name: 'Amritsar', type: 'safe', volunteers: 38, incidents: 3, lat: 31.6340, lng: 74.8723, keywords: ['amritsar', 'punjab', 'golden temple'] },
    { id: 44, name: 'Jalandhar', type: 'safe', volunteers: 28, incidents: 3, lat: 31.3260, lng: 75.5762, keywords: ['jalandhar', 'punjab'] },
    { id: 45, name: 'Patiala', type: 'safe', volunteers: 24, incidents: 2, lat: 30.3398, lng: 76.3869, keywords: ['patiala', 'punjab'] },
    { id: 46, name: 'Bathinda', type: 'safe', volunteers: 20, incidents: 2, lat: 30.2110, lng: 74.9455, keywords: ['bathinda', 'punjab'] },
    { id: 47, name: 'Pathankot', type: 'safe', volunteers: 18, incidents: 2, lat: 32.2746, lng: 75.6515, keywords: ['pathankot', 'punjab'] },
    { id: 48, name: 'Hoshiarpur', type: 'safe', volunteers: 19, incidents: 2, lat: 31.5333, lng: 75.9167, keywords: ['hoshiarpur', 'punjab'] },
    { id: 49, name: 'Moga', type: 'safe', volunteers: 16, incidents: 2, lat: 30.8167, lng: 75.1667, keywords: ['moga', 'punjab'] },
    { id: 50, name: 'Abohar', type: 'safe', volunteers: 15, incidents: 2, lat: 30.1333, lng: 74.2000, keywords: ['abohar', 'punjab'] },
    { id: 51, name: 'Malerkotla', type: 'safe', volunteers: 15, incidents: 2, lat: 30.5333, lng: 75.8833, keywords: ['malerkotla', 'punjab'] },
    { id: 52, name: 'Khanna', type: 'safe', volunteers: 16, incidents: 2, lat: 30.7000, lng: 76.2167, keywords: ['khanna', 'punjab'] },
    { id: 53, name: 'Phagwara', type: 'safe', volunteers: 15, incidents: 2, lat: 31.2333, lng: 75.7667, keywords: ['phagwara', 'punjab'] },
    { id: 54, name: 'Muktsar', type: 'safe', volunteers: 14, incidents: 2, lat: 30.4833, lng: 74.5167, keywords: ['muktsar', 'punjab'] },
    { id: 55, name: 'Barnala', type: 'safe', volunteers: 14, incidents: 2, lat: 30.3833, lng: 75.5500, keywords: ['barnala', 'punjab'] },
    { id: 56, name: 'Rajpura', type: 'safe', volunteers: 15, incidents: 2, lat: 30.4833, lng: 76.6000, keywords: ['rajpura', 'punjab'] },
    { id: 57, name: 'Firozpur', type: 'safe', volunteers: 16, incidents: 2, lat: 30.9250, lng: 74.6147, keywords: ['firozpur', 'punjab'] },
    { id: 58, name: 'Kapurthala', type: 'safe', volunteers: 15, incidents: 2, lat: 31.3800, lng: 75.3800, keywords: ['kapurthala', 'punjab'] },
    { id: 59, name: 'Faridkot', type: 'safe', volunteers: 14, incidents: 2, lat: 30.6667, lng: 74.7500, keywords: ['faridkot', 'punjab'] },
    { id: 60, name: 'Nabha', type: 'safe', volunteers: 13, incidents: 2, lat: 30.3833, lng: 76.1167, keywords: ['nabha', 'punjab'] },
    { id: 61, name: 'Tarn Taran', type: 'safe', volunteers: 14, incidents: 2, lat: 31.4667, lng: 74.8833, keywords: ['tarn taran', 'punjab'] },
    { id: 62, name: 'Jagraon', type: 'safe', volunteers: 13, incidents: 2, lat: 30.7000, lng: 75.4000, keywords: ['jagraon', 'punjab'] },
    { id: 63, name: 'Sunam', type: 'safe', volunteers: 12, incidents: 2, lat: 30.1333, lng: 75.7833, keywords: ['sunam', 'punjab'] },
    { id: 64, name: 'Dhuri', type: 'safe', volunteers: 12, incidents: 2, lat: 30.3000, lng: 75.8500, keywords: ['dhuri', 'punjab'] },
    { id: 65, name: 'Fazilka', type: 'safe', volunteers: 13, incidents: 2, lat: 30.4000, lng: 74.0167, keywords: ['fazilka', 'punjab'] },
    { id: 66, name: 'Gurdaspur', type: 'safe', volunteers: 14, incidents: 2, lat: 32.0333, lng: 75.4000, keywords: ['gurdaspur', 'punjab'] },
    { id: 67, name: 'Kharar', type: 'safe', volunteers: 16, incidents: 2, lat: 30.7500, lng: 76.6500, keywords: ['kharar', 'chandigarh', 'punjab'] },
    { id: 68, name: 'Gobindgarh', type: 'safe', volunteers: 13, incidents: 2, lat: 30.6667, lng: 76.3167, keywords: ['gobindgarh', 'punjab'] },
    { id: 69, name: 'Mansa', type: 'safe', volunteers: 13, incidents: 2, lat: 29.9833, lng: 75.4000, keywords: ['mansa', 'punjab'] },
    { id: 70, name: 'Malout', type: 'safe', volunteers: 12, incidents: 2, lat: 30.2000, lng: 74.5000, keywords: ['malout', 'punjab'] },
    { id: 71, name: 'Nawanshahr', type: 'safe', volunteers: 12, incidents: 2, lat: 31.1167, lng: 76.1167, keywords: ['nawanshahr', 'punjab'] },
    { id: 72, name: 'Fatehabad', type: 'safe', volunteers: 12, incidents: 2, lat: 29.5167, lng: 75.4500, keywords: ['fatehabad', 'haryana'] },
    { id: 73, name: 'Sirsa', type: 'safe', volunteers: 14, incidents: 2, lat: 29.5333, lng: 75.0333, keywords: ['sirsa', 'haryana'] },
    { id: 74, name: 'Panipat', type: 'safe', volunteers: 24, incidents: 3, lat: 29.3909, lng: 76.9635, keywords: ['panipat', 'haryana'] },
    { id: 75, name: 'Karnal', type: 'safe', volunteers: 26, incidents: 3, lat: 29.6857, lng: 76.9905, keywords: ['karnal', 'haryana'] },
    { id: 76, name: 'Sonipat', type: 'safe', volunteers: 22, incidents: 3, lat: 28.9931, lng: 77.0151, keywords: ['sonipat', 'haryana', 'ncr'] },
    { id: 77, name: 'Rohtak', type: 'safe', volunteers: 20, incidents: 3, lat: 28.8955, lng: 76.6066, keywords: ['rohtak', 'haryana'] },
    { id: 78, name: 'Hisar', type: 'safe', volunteers: 22, incidents: 3, lat: 29.1492, lng: 75.7217, keywords: ['hisar', 'haryana'] },
    { id: 79, name: 'Ambala', type: 'safe', volunteers: 20, incidents: 2, lat: 30.3782, lng: 76.7767, keywords: ['ambala', 'haryana'] },
    { id: 80, name: 'Yamunanagar', type: 'safe', volunteers: 18, incidents: 2, lat: 30.1290, lng: 77.2674, keywords: ['yamunanagar', 'haryana'] },
    { id: 81, name: 'Panchkula', type: 'safe', volunteers: 22, incidents: 1, lat: 30.6942, lng: 76.8606, keywords: ['panchkula', 'haryana'] },
    { id: 82, name: 'Bhiwani', type: 'safe', volunteers: 16, incidents: 2, lat: 28.7930, lng: 75.7700, keywords: ['bhiwani', 'haryana'] },
    { id: 83, name: 'Bahadurgarh', type: 'safe', volunteers: 18, incidents: 3, lat: 28.6928, lng: 76.9372, keywords: ['bahadurgarh', 'haryana', 'ncr'] },
    { id: 84, name: 'Jind', type: 'safe', volunteers: 15, incidents: 2, lat: 29.3167, lng: 76.3167, keywords: ['jind', 'haryana'] },
    { id: 85, name: 'Thanesar', type: 'safe', volunteers: 14, incidents: 2, lat: 29.9667, lng: 76.8333, keywords: ['thanesar', 'haryana'] },
    { id: 86, name: 'Kaithal', type: 'safe', volunteers: 14, incidents: 2, lat: 29.8000, lng: 76.4000, keywords: ['kaithal', 'haryana'] },
    { id: 87, name: 'Rewari', type: 'safe', volunteers: 16, incidents: 2, lat: 28.1989, lng: 76.6194, keywords: ['rewari', 'haryana'] },
    { id: 88, name: 'Narnaul', type: 'safe', volunteers: 13, incidents: 2, lat: 28.0500, lng: 76.1000, keywords: ['narnaul', 'haryana'] },
    { id: 89, name: 'Pehowa', type: 'safe', volunteers: 12, incidents: 2, lat: 29.9333, lng: 76.7500, keywords: ['pehowa', 'haryana'] },
    { id: 90, name: 'Samalkha', type: 'safe', volunteers: 12, incidents: 2, lat: 29.8167, lng: 77.0167, keywords: ['samalkha', 'haryana'] },
    { id: 91, name: 'Pinjore', type: 'safe', volunteers: 13, incidents: 2, lat: 30.7000, lng: 76.8667, keywords: ['pinjore', 'haryana'] },
    { id: 92, name: 'Ladwa', type: 'safe', volunteers: 11, incidents: 2, lat: 29.8167, lng: 76.9833, keywords: ['ladwa', 'haryana'] },
    { id: 93, name: 'Sohna', type: 'safe', volunteers: 12, incidents: 2, lat: 28.2333, lng: 77.0500, keywords: ['sohna', 'haryana'] },
    { id: 94, name: 'Safidon', type: 'safe', volunteers: 11, incidents: 2, lat: 29.4167, lng: 76.6167, keywords: ['safidon', 'haryana'] },
    { id: 95, name: 'Taraori', type: 'safe', volunteers: 11, incidents: 2, lat: 29.8167, lng: 76.9167, keywords: ['taraori', 'haryana'] },
    { id: 96, name: 'Mahendragarh', type: 'safe', volunteers: 12, incidents: 2, lat: 28.3000, lng: 76.1333, keywords: ['mahendragarh', 'haryana'] },
    { id: 97, name: 'Ratia', type: 'safe', volunteers: 10, incidents: 2, lat: 29.7667, lng: 75.4667, keywords: ['ratia', 'haryana'] },
    { id: 98, name: 'Rania', type: 'safe', volunteers: 10, incidents: 2, lat: 29.4333, lng: 75.2500, keywords: ['rania', 'haryana'] },
    { id: 99, name: 'Tohana', type: 'safe', volunteers: 11, incidents: 2, lat: 29.7833, lng: 75.9167, keywords: ['tohana', 'haryana'] },
    { id: 100, name: 'Narwana', type: 'safe', volunteers: 12, incidents: 2, lat: 29.6000, lng: 76.1167, keywords: ['narwana', 'haryana'] },
    // Uttar Pradesh Cities
    { id: 101, name: 'Agra', type: 'safe', volunteers: 48, incidents: 4, lat: 27.1767, lng: 78.0081, keywords: ['agra', 'taj mahal', 'up'] },
    { id: 102, name: 'Varanasi', type: 'safe', volunteers: 42, incidents: 3, lat: 25.3176, lng: 82.9739, keywords: ['varanasi', 'kashi', 'up'] },
    { id: 103, name: 'Prayagraj', type: 'safe', volunteers: 38, incidents: 3, lat: 25.4358, lng: 81.8463, keywords: ['prayagraj', 'allahabad', 'up'] },
    { id: 104, name: 'Meerut', type: 'safe', volunteers: 32, incidents: 4, lat: 29.0168, lng: 77.7056, keywords: ['meerut', 'up'] },
    { id: 105, name: 'Bareilly', type: 'safe', volunteers: 28, incidents: 3, lat: 28.3670, lng: 79.4304, keywords: ['bareilly', 'up'] },
    { id: 106, name: 'Aligarh', type: 'safe', volunteers: 26, incidents: 4, lat: 27.8974, lng: 78.0880, keywords: ['aligarh', 'up'] },
    { id: 107, name: 'Moradabad', type: 'safe', volunteers: 24, incidents: 4, lat: 28.8389, lng: 78.7378, keywords: ['moradabad', 'up'] },
    { id: 108, name: 'Saharanpur', type: 'safe', volunteers: 24, incidents: 3, lat: 29.9680, lng: 77.5460, keywords: ['saharanpur', 'up'] },
    { id: 109, name: 'Ghaziabad', type: 'moderate', volunteers: 35, incidents: 5, lat: 28.6692, lng: 77.4538, keywords: ['ghaziabad', 'up', 'ncr'] },
    { id: 110, name: 'Greater Noida', type: 'safe', volunteers: 42, incidents: 3, lat: 28.4744, lng: 77.5040, keywords: ['greater noida', 'up', 'ncr'] },
    { id: 111, name: 'Mathura', type: 'safe', volunteers: 26, incidents: 2, lat: 27.4924, lng: 77.6737, keywords: ['mathura', 'up'] },
    { id: 112, name: 'Ayodhya', type: 'safe', volunteers: 28, incidents: 2, lat: 26.7924, lng: 82.1998, keywords: ['ayodhya', 'up'] },
    { id: 113, name: 'Jhansi', type: 'safe', volunteers: 24, incidents: 3, lat: 25.4484, lng: 78.5685, keywords: ['jhansi', 'up'] },
    { id: 114, name: 'Firozabad', type: 'safe', volunteers: 20, incidents: 3, lat: 27.1591, lng: 78.3957, keywords: ['firozabad', 'up'] },
    { id: 115, name: 'Muzaffarnagar', type: 'safe', volunteers: 22, incidents: 4, lat: 29.4727, lng: 77.7085, keywords: ['muzaffarnagar', 'up'] },
    { id: 116, name: 'Rampur', type: 'safe', volunteers: 18, incidents: 3, lat: 28.8152, lng: 79.0250, keywords: ['rampur', 'up'] },
    { id: 117, name: 'Shahjahanpur', type: 'safe', volunteers: 19, incidents: 3, lat: 27.8830, lng: 79.9119, keywords: ['shahjahanpur', 'up'] },
    { id: 118, name: 'Farrukhabad', type: 'safe', volunteers: 18, incidents: 3, lat: 27.3882, lng: 79.5801, keywords: ['farrukhabad', 'up'] },
    { id: 119, name: 'Hapur', type: 'safe', volunteers: 20, incidents: 3, lat: 28.7293, lng: 77.7757, keywords: ['hapur', 'up'] },
    { id: 120, name: 'Etawah', type: 'safe', volunteers: 17, incidents: 2, lat: 26.7751, lng: 79.0215, keywords: ['etawah', 'up'] },
    { id: 121, name: 'Mirzapur', type: 'safe', volunteers: 18, incidents: 3, lat: 25.1467, lng: 82.5690, keywords: ['mirzapur', 'up'] },
    { id: 122, name: 'Bulandshahr', type: 'safe', volunteers: 19, incidents: 3, lat: 28.4067, lng: 77.8498, keywords: ['bulandshahr', 'up'] },
    { id: 123, name: 'Sambhal', type: 'safe', volunteers: 17, incidents: 3, lat: 28.5850, lng: 78.5572, keywords: ['sambhal', 'up'] },
    { id: 124, name: 'Amroha', type: 'safe', volunteers: 17, incidents: 3, lat: 28.9033, lng: 78.4672, keywords: ['amroha', 'up'] },
    { id: 125, name: 'Hardoi', type: 'safe', volunteers: 16, incidents: 3, lat: 27.3929, lng: 80.1285, keywords: ['hardoi', 'up'] },
    { id: 126, name: 'Fatehpur', type: 'safe', volunteers: 16, incidents: 2, lat: 25.9286, lng: 80.8119, keywords: ['fatehpur', 'up'] },
    { id: 127, name: 'Raebareli', type: 'safe', volunteers: 17, incidents: 3, lat: 26.2124, lng: 81.2506, keywords: ['raebareli', 'up'] },
    { id: 128, name: 'Orai', type: 'safe', volunteers: 15, incidents: 2, lat: 25.9971, lng: 79.4490, keywords: ['orai', 'up'] },
    { id: 129, name: 'Sitapur', type: 'safe', volunteers: 16, incidents: 3, lat: 27.5629, lng: 80.6813, keywords: ['sitapur', 'up'] },
    { id: 130, name: 'Bahraich', type: 'safe', volunteers: 15, incidents: 3, lat: 27.5742, lng: 81.5947, keywords: ['bahraich', 'up'] },
    { id: 131, name: 'Modinagar', type: 'safe', volunteers: 16, incidents: 2, lat: 28.9933, lng: 77.5928, keywords: ['modinagar', 'up'] },
    { id: 132, name: 'Unnao', type: 'safe', volunteers: 16, incidents: 3, lat: 26.5464, lng: 80.4881, keywords: ['unnao', 'up'] },
    { id: 133, name: 'Jaunpur', type: 'safe', volunteers: 17, incidents: 3, lat: 25.7333, lng: 82.6833, keywords: ['jaunpur', 'up'] },
    { id: 134, name: 'Lakhimpur', type: 'safe', volunteers: 15, incidents: 3, lat: 27.9467, lng: 80.7750, keywords: ['lakhimpur', 'up'] },
    { id: 135, name: 'Hathras', type: 'safe', volunteers: 15, incidents: 2, lat: 27.5950, lng: 78.0519, keywords: ['hathras', 'up'] },
    { id: 136, name: 'Banda', type: 'safe', volunteers: 15, incidents: 2, lat: 25.4756, lng: 80.3364, keywords: ['banda', 'up'] },
    { id: 137, name: 'Pilibhit', type: 'safe', volunteers: 15, incidents: 3, lat: 28.6333, lng: 79.8033, keywords: ['pilibhit', 'up'] },
    { id: 138, name: 'Barabanki', type: 'safe', volunteers: 16, incidents: 3, lat: 26.9254, lng: 81.2042, keywords: ['barabanki', 'up'] },
    { id: 139, name: 'Khurja', type: 'safe', volunteers: 14, incidents: 2, lat: 28.2515, lng: 77.8494, keywords: ['khurja', 'up'] },
    { id: 140, name: 'Gonda', type: 'safe', volunteers: 14, incidents: 3, lat: 27.1333, lng: 81.9667, keywords: ['gonda', 'up'] },
    { id: 141, name: 'Mainpuri', type: 'safe', volunteers: 15, incidents: 2, lat: 27.2256, lng: 79.0236, keywords: ['mainpuri', 'up'] },
    { id: 142, name: 'Lalitpur', type: 'safe', volunteers: 14, incidents: 2, lat: 24.6833, lng: 78.4167, keywords: ['lalitpur', 'up'] },
    { id: 143, name: 'Etah', type: 'safe', volunteers: 14, incidents: 2, lat: 27.5622, lng: 78.6647, keywords: ['etah', 'up'] },
    { id: 144, name: 'Deoria', type: 'safe', volunteers: 15, incidents: 3, lat: 26.5000, lng: 83.7167, keywords: ['deoria', 'up'] },
    { id: 145, name: 'Azamgarh', type: 'safe', volunteers: 16, incidents: 3, lat: 26.0667, lng: 83.1833, keywords: ['azamgarh', 'up'] },
    { id: 146, name: 'Sultanpur', type: 'safe', volunteers: 15, incidents: 3, lat: 26.2667, lng: 82.0667, keywords: ['sultanpur', 'up'] },
    { id: 147, name: 'Ballia', type: 'safe', volunteers: 14, incidents: 3, lat: 25.7667, lng: 84.1500, keywords: ['ballia', 'up'] },
    { id: 148, name: 'Bijnor', type: 'safe', volunteers: 15, incidents: 3, lat: 29.3750, lng: 78.1333, keywords: ['bijnor', 'up'] },
    { id: 149, name: 'Basti', type: 'safe', volunteers: 14, incidents: 3, lat: 26.8000, lng: 82.7333, keywords: ['basti', 'up'] },
    { id: 150, name: 'Chandausi', type: 'safe', volunteers: 13, incidents: 2, lat: 28.4500, lng: 78.7833, keywords: ['chandausi', 'up'] },
    // Bihar Cities
    { id: 151, name: 'Gaya', type: 'safe', volunteers: 24, incidents: 4, lat: 24.7955, lng: 85.0002, keywords: ['gaya', 'bihar'] },
    { id: 152, name: 'Bhagalpur', type: 'safe', volunteers: 22, incidents: 4, lat: 25.2425, lng: 86.9842, keywords: ['bhagalpur', 'bihar'] },
    { id: 153, name: 'Muzaffarpur', type: 'safe', volunteers: 24, incidents: 4, lat: 26.1209, lng: 85.3647, keywords: ['muzaffarpur', 'bihar'] },
    { id: 154, name: 'Darbhanga', type: 'safe', volunteers: 20, incidents: 4, lat: 26.1542, lng: 85.8918, keywords: ['darbhanga', 'bihar'] },
    { id: 155, name: 'Arrah', type: 'safe', volunteers: 18, incidents: 3, lat: 25.5569, lng: 84.6644, keywords: ['arrah', 'bihar'] },
    { id: 156, name: 'Begusarai', type: 'safe', volunteers: 18, incidents: 3, lat: 25.4182, lng: 86.1272, keywords: ['begusarai', 'bihar'] },
    { id: 157, name: 'Chhapra', type: 'safe', volunteers: 18, incidents: 4, lat: 25.7781, lng: 84.7278, keywords: ['chhapra', 'bihar'] },
    { id: 158, name: 'Katihar', type: 'safe', volunteers: 16, incidents: 4, lat: 25.5394, lng: 87.5678, keywords: ['katihar', 'bihar'] },
    { id: 159, name: 'Munger', type: 'safe', volunteers: 16, incidents: 3, lat: 25.3753, lng: 86.4731, keywords: ['munger', 'bihar'] },
    { id: 160, name: 'Purnia', type: 'safe', volunteers: 17, incidents: 4, lat: 25.7771, lng: 87.4753, keywords: ['purnia', 'bihar'] },
    { id: 161, name: 'Saharsa', type: 'safe', volunteers: 15, incidents: 3, lat: 25.8742, lng: 86.5969, keywords: ['saharsa', 'bihar'] },
    { id: 162, name: 'Sasaram', type: 'safe', volunteers: 16, incidents: 3, lat: 24.9521, lng: 84.0168, keywords: ['sasaram', 'bihar'] },
    { id: 163, name: 'Hajipur', type: 'safe', volunteers: 16, incidents: 3, lat: 25.6892, lng: 85.2096, keywords: ['hajipur', 'bihar'] },
    { id: 164, name: 'Dehri', type: 'safe', volunteers: 14, incidents: 3, lat: 24.9000, lng: 84.1833, keywords: ['dehri', 'bihar'] },
    { id: 165, name: 'Siwan', type: 'safe', volunteers: 15, incidents: 3, lat: 26.2167, lng: 84.3667, keywords: ['siwan', 'bihar'] },
    { id: 166, name: 'Motihari', type: 'safe', volunteers: 15, incidents: 3, lat: 26.6500, lng: 84.9167, keywords: ['motihari', 'bihar'] },
    { id: 167, name: 'Nawada', type: 'safe', volunteers: 14, incidents: 3, lat: 24.8833, lng: 85.5333, keywords: ['nawada', 'bihar'] },
    { id: 168, name: 'Bagaha', type: 'safe', volunteers: 13, incidents: 3, lat: 27.1000, lng: 84.1000, keywords: ['bagaha', 'bihar'] },
    { id: 169, name: 'Buxar', type: 'safe', volunteers: 14, incidents: 3, lat: 25.5667, lng: 83.9833, keywords: ['buxar', 'bihar'] },
    { id: 170, name: 'Kishanganj', type: 'safe', volunteers: 13, incidents: 3, lat: 26.1000, lng: 87.9500, keywords: ['kishanganj', 'bihar'] },
    { id: 171, name: 'Sitamarhi', type: 'safe', volunteers: 14, incidents: 3, lat: 26.6000, lng: 85.4833, keywords: ['sitamarhi', 'bihar'] },
    { id: 172, name: 'Jamalpur', type: 'safe', volunteers: 13, incidents: 3, lat: 25.3167, lng: 86.5000, keywords: ['jamalpur', 'bihar'] },
    { id: 173, name: 'Jehanabad', type: 'safe', volunteers: 13, incidents: 3, lat: 25.2167, lng: 84.9833, keywords: ['jehanabad', 'bihar'] },
    { id: 174, name: 'Aurangabad', type: 'safe', volunteers: 13, incidents: 3, lat: 24.7500, lng: 84.3667, keywords: ['aurangabad', 'bihar'] },
    // Rajasthan Cities
    { id: 175, name: 'Jodhpur', type: 'safe', volunteers: 35, incidents: 3, lat: 26.2389, lng: 73.0243, keywords: ['jodhpur', 'rajasthan'] },
    { id: 176, name: 'Udaipur', type: 'safe', volunteers: 32, incidents: 2, lat: 24.5854, lng: 73.7125, keywords: ['udaipur', 'rajasthan'] },
    { id: 177, name: 'Kota', type: 'safe', volunteers: 30, incidents: 3, lat: 25.2138, lng: 75.8648, keywords: ['kota', 'rajasthan'] },
    { id: 178, name: 'Ajmer', type: 'safe', volunteers: 28, incidents: 3, lat: 26.4499, lng: 74.6399, keywords: ['ajmer', 'rajasthan'] },
    { id: 179, name: 'Bikaner', type: 'safe', volunteers: 24, incidents: 2, lat: 28.0229, lng: 73.3119, keywords: ['bikaner', 'rajasthan'] },
    { id: 180, name: 'Alwar', type: 'safe', volunteers: 22, incidents: 3, lat: 27.5530, lng: 76.6346, keywords: ['alwar', 'rajasthan'] },
    { id: 181, name: 'Bhilwara', type: 'safe', volunteers: 20, incidents: 2, lat: 25.3407, lng: 74.6269, keywords: ['bhilwara', 'rajasthan'] },
    { id: 182, name: 'Sikar', type: 'safe', volunteers: 19, incidents: 2, lat: 27.6094, lng: 75.1398, keywords: ['sikar', 'rajasthan'] },
    { id: 183, name: 'Pali', type: 'safe', volunteers: 18, incidents: 2, lat: 25.7711, lng: 73.3234, keywords: ['pali', 'rajasthan'] },
    { id: 184, name: 'Sri Ganganagar', type: 'safe', volunteers: 18, incidents: 2, lat: 29.9038, lng: 73.8772, keywords: ['ganganagar', 'rajasthan'] },
    { id: 185, name: 'Jaisalmer', type: 'safe', volunteers: 16, incidents: 1, lat: 26.9157, lng: 70.9083, keywords: ['jaisalmer', 'rajasthan'] },
    { id: 186, name: 'Mount Abu', type: 'safe', volunteers: 14, incidents: 1, lat: 24.5927, lng: 72.7156, keywords: ['mount abu', 'rajasthan'] },
    // MP Cities
    { id: 187, name: 'Jabalpur', type: 'safe', volunteers: 32, incidents: 3, lat: 23.1815, lng: 79.9864, keywords: ['jabalpur', 'mp'] },
    { id: 188, name: 'Gwalior', type: 'safe', volunteers: 30, incidents: 3, lat: 26.2183, lng: 78.1828, keywords: ['gwalior', 'mp'] },
    { id: 189, name: 'Ujjain', type: 'safe', volunteers: 26, incidents: 2, lat: 23.1765, lng: 75.7885, keywords: ['ujjain', 'mp'] },
    { id: 190, name: 'Sagar', type: 'safe', volunteers: 22, incidents: 3, lat: 23.8333, lng: 78.7333, keywords: ['sagar', 'mp'] },
    { id: 191, name: 'Dewas', type: 'safe', volunteers: 22, incidents: 2, lat: 22.9667, lng: 76.0500, keywords: ['dewas', 'mp'] },
    { id: 192, name: 'Satna', type: 'safe', volunteers: 20, incidents: 3, lat: 24.6000, lng: 80.8333, keywords: ['satna', 'mp'] },
    { id: 193, name: 'Ratlam', type: 'safe', volunteers: 20, incidents: 2, lat: 23.3333, lng: 75.0333, keywords: ['ratlam', 'mp'] },
    { id: 194, name: 'Rewa', type: 'safe', volunteers: 20, incidents: 3, lat: 24.5333, lng: 81.3000, keywords: ['rewa', 'mp'] },
    { id: 195, name: 'Katni', type: 'safe', volunteers: 18, incidents: 2, lat: 23.8333, lng: 80.4000, keywords: ['katni', 'mp'] },
    { id: 196, name: 'Singrauli', type: 'safe', volunteers: 18, incidents: 3, lat: 24.2000, lng: 82.6833, keywords: ['singrauli', 'mp'] },
    { id: 197, name: 'Burhanpur', type: 'safe', volunteers: 18, incidents: 2, lat: 21.3000, lng: 76.2333, keywords: ['burhanpur', 'mp'] },
    { id: 198, name: 'Khandwa', type: 'safe', volunteers: 19, incidents: 2, lat: 21.8333, lng: 76.3500, keywords: ['khandwa', 'mp'] },
    { id: 199, name: 'Morena', type: 'safe', volunteers: 16, incidents: 3, lat: 26.5000, lng: 78.0000, keywords: ['morena', 'mp'] },
    { id: 200, name: 'Chhindwara', type: 'safe', volunteers: 19, incidents: 2, lat: 22.0500, lng: 78.9333, keywords: ['chhindwara', 'mp'] },
    // Gujarat Cities
    { id: 201, name: 'Rajkot', type: 'safe', volunteers: 38, incidents: 3, lat: 22.3039, lng: 70.8022, keywords: ['rajkot', 'gujarat'] },
    { id: 202, name: 'Vadodara', type: 'safe', volunteers: 42, incidents: 3, lat: 22.3072, lng: 73.1812, keywords: ['vadodara', 'baroda', 'gujarat'] },
    { id: 203, name: 'Bhavnagar', type: 'safe', volunteers: 28, incidents: 2, lat: 21.7645, lng: 72.1519, keywords: ['bhavnagar', 'gujarat'] },
    { id: 204, name: 'Jamnagar', type: 'safe', volunteers: 26, incidents: 2, lat: 22.4707, lng: 70.0577, keywords: ['jamnagar', 'gujarat'] },
    { id: 205, name: 'Junagadh', type: 'safe', volunteers: 24, incidents: 2, lat: 21.5222, lng: 70.4579, keywords: ['junagadh', 'gujarat'] },
    { id: 206, name: 'Gandhinagar', type: 'safe', volunteers: 30, incidents: 1, lat: 23.2156, lng: 72.6369, keywords: ['gandhinagar', 'gujarat'] },
    { id: 207, name: 'Anand', type: 'safe', volunteers: 22, incidents: 2, lat: 22.5645, lng: 72.9289, keywords: ['anand', 'gujarat'] },
    { id: 208, name: 'Navsari', type: 'safe', volunteers: 20, incidents: 2, lat: 20.9500, lng: 72.9333, keywords: ['navsari', 'gujarat'] },
    { id: 209, name: 'Morbi', type: 'safe', volunteers: 18, incidents: 2, lat: 22.8167, lng: 70.8333, keywords: ['morbi', 'gujarat'] },
    { id: 210, name: 'Nadiad', type: 'safe', volunteers: 19, incidents: 2, lat: 22.6939, lng: 72.8614, keywords: ['nadiad', 'gujarat'] },
    { id: 211, name: 'Bharuch', type: 'safe', volunteers: 18, incidents: 2, lat: 21.7051, lng: 72.9959, keywords: ['bharuch', 'gujarat'] },
    { id: 212, name: 'Vapi', type: 'safe', volunteers: 18, incidents: 2, lat: 20.3714, lng: 72.9053, keywords: ['vapi', 'gujarat'] },
    { id: 213, name: 'Porbandar', type: 'safe', volunteers: 16, incidents: 2, lat: 21.6417, lng: 69.6293, keywords: ['porbandar', 'gujarat'] },
    { id: 214, name: 'Godhra', type: 'safe', volunteers: 16, incidents: 3, lat: 22.7756, lng: 73.6147, keywords: ['godhra', 'gujarat'] },
    { id: 215, name: 'Bhuj', type: 'safe', volunteers: 18, incidents: 2, lat: 23.2420, lng: 69.6669, keywords: ['bhuj', 'kutch', 'gujarat'] },
    { id: 216, name: 'Palanpur', type: 'safe', volunteers: 17, incidents: 2, lat: 24.1711, lng: 72.4281, keywords: ['palanpur', 'gujarat'] },
    { id: 217, name: 'Valsad', type: 'safe', volunteers: 16, incidents: 2, lat: 20.5990, lng: 72.9342, keywords: ['valsad', 'gujarat'] },
    { id: 218, name: 'Patan', type: 'safe', volunteers: 15, incidents: 2, lat: 23.8500, lng: 72.1167, keywords: ['patan', 'gujarat'] },
    { id: 219, name: 'Amreli', type: 'safe', volunteers: 15, incidents: 2, lat: 21.6000, lng: 71.2167, keywords: ['amreli', 'gujarat'] },
    { id: 220, name: 'Ankleshwar', type: 'safe', volunteers: 16, incidents: 2, lat: 21.6279, lng: 73.0147, keywords: ['ankleshwar', 'gujarat'] },
    // Kerala Cities
    { id: 221, name: 'Kozhikode', type: 'safe', volunteers: 32, incidents: 2, lat: 11.2588, lng: 75.7804, keywords: ['kozhikode', 'calicut', 'kerala'] },
    { id: 222, name: 'Kollam', type: 'safe', volunteers: 26, incidents: 2, lat: 8.8932, lng: 76.6141, keywords: ['kollam', 'kerala'] },
    { id: 223, name: 'Thrissur', type: 'safe', volunteers: 28, incidents: 2, lat: 10.5276, lng: 76.2144, keywords: ['thrissur', 'kerala'] },
    { id: 224, name: 'Palakkad', type: 'safe', volunteers: 24, incidents: 2, lat: 10.7867, lng: 76.6548, keywords: ['palakkad', 'kerala'] },
    { id: 225, name: 'Alappuzha', type: 'safe', volunteers: 22, incidents: 2, lat: 9.4981, lng: 76.3388, keywords: ['alappuzha', 'kerala'] },
    { id: 226, name: 'Kannur', type: 'safe', volunteers: 23, incidents: 2, lat: 11.8745, lng: 75.3704, keywords: ['kannur', 'kerala'] },
    { id: 227, name: 'Kottayam', type: 'safe', volunteers: 21, incidents: 2, lat: 9.5916, lng: 76.5222, keywords: ['kottayam', 'kerala'] },
    { id: 228, name: 'Malappuram', type: 'safe', volunteers: 20, incidents: 3, lat: 11.0510, lng: 76.0711, keywords: ['malappuram', 'kerala'] },
    // Tamil Nadu Cities
    { id: 229, name: 'Madurai', type: 'safe', volunteers: 38, incidents: 3, lat: 9.9252, lng: 78.1198, keywords: ['madurai', 'tamilnadu'] },
    { id: 230, name: 'Tiruchirappalli', type: 'safe', volunteers: 32, incidents: 2, lat: 10.7905, lng: 78.7047, keywords: ['trichy', 'tamilnadu'] },
    { id: 231, name: 'Salem', type: 'safe', volunteers: 30, incidents: 3, lat: 11.6643, lng: 78.1460, keywords: ['salem', 'tamilnadu'] },
    { id: 232, name: 'Tirunelveli', type: 'safe', volunteers: 26, incidents: 2, lat: 8.7289, lng: 77.7567, keywords: ['tirunelveli', 'tamilnadu'] },
    { id: 233, name: 'Tiruppur', type: 'safe', volunteers: 28, incidents: 2, lat: 11.1085, lng: 77.3411, keywords: ['tiruppur', 'tamilnadu'] },
    { id: 234, name: 'Vellore', type: 'safe', volunteers: 25, incidents: 3, lat: 12.9165, lng: 79.1325, keywords: ['vellore', 'tamilnadu'] },
    { id: 235, name: 'Erode', type: 'safe', volunteers: 24, incidents: 2, lat: 11.3514, lng: 77.7053, keywords: ['erode', 'tamilnadu'] },
    { id: 236, name: 'Thanjavur', type: 'safe', volunteers: 23, incidents: 2, lat: 10.7870, lng: 79.1378, keywords: ['thanjavur', 'tamilnadu'] },
    { id: 237, name: 'Kanchipuram', type: 'safe', volunteers: 20, incidents: 2, lat: 12.8342, lng: 79.7036, keywords: ['kanchipuram', 'tamilnadu'] },
    // Karnataka Cities
    { id: 238, name: 'Mysore', type: 'safe', volunteers: 38, incidents: 2, lat: 12.2958, lng: 76.6394, keywords: ['mysore', 'mysuru', 'karnataka'] },
    { id: 239, name: 'Hubli', type: 'safe', volunteers: 32, incidents: 3, lat: 15.3647, lng: 75.1240, keywords: ['hubli', 'karnataka'] },
    { id: 240, name: 'Mangalore', type: 'safe', volunteers: 35, incidents: 2, lat: 12.9141, lng: 74.8560, keywords: ['mangalore', 'karnataka'] },
    { id: 241, name: 'Belgaum', type: 'safe', volunteers: 30, incidents: 3, lat: 15.8497, lng: 74.4977, keywords: ['belgaum', 'karnataka'] },
    { id: 242, name: 'Gulbarga', type: 'safe', volunteers: 26, incidents: 3, lat: 17.1254, lng: 76.8212, keywords: ['gulbarga', 'karnataka'] },
    { id: 243, name: 'Davanagere', type: 'safe', volunteers: 25, incidents: 2, lat: 14.4644, lng: 75.9218, keywords: ['davanagere', 'karnataka'] },
    { id: 244, name: 'Bellary', type: 'safe', volunteers: 24, incidents: 3, lat: 15.1394, lng: 76.9214, keywords: ['bellary', 'karnataka'] },
    { id: 245, name: 'Bijapur', type: 'safe', volunteers: 24, incidents: 2, lat: 16.8302, lng: 75.7100, keywords: ['bijapur', 'karnataka'] },
    { id: 246, name: 'Shimoga', type: 'safe', volunteers: 23, incidents: 2, lat: 13.9299, lng: 75.5681, keywords: ['shimoga', 'karnataka'] },
    { id: 247, name: 'Tumkur', type: 'safe', volunteers: 22, incidents: 2, lat: 13.3392, lng: 77.1006, keywords: ['tumkur', 'karnataka'] },
    // Andhra & Telangana
    { id: 248, name: 'Warangal', type: 'safe', volunteers: 26, incidents: 2, lat: 17.9689, lng: 79.5941, keywords: ['warangal', 'telangana'] },
    { id: 249, name: 'Karimnagar', type: 'safe', volunteers: 22, incidents: 2, lat: 18.4386, lng: 79.1288, keywords: ['karimnagar', 'telangana'] },
    { id: 250, name: 'Guntur', type: 'safe', volunteers: 28, incidents: 3, lat: 16.3067, lng: 80.4365, keywords: ['guntur', 'andhra'] },
    { id: 251, name: 'Nellore', type: 'safe', volunteers: 24, incidents: 2, lat: 14.4426, lng: 79.9865, keywords: ['nellore', 'andhra'] },
    { id: 252, name: 'Kurnool', type: 'safe', volunteers: 22, incidents: 3, lat: 15.8281, lng: 78.0373, keywords: ['kurnool', 'andhra'] },
    { id: 253, name: 'Kakinada', type: 'safe', volunteers: 24, incidents: 2, lat: 16.9891, lng: 82.2475, keywords: ['kakinada', 'andhra'] },
    { id: 254, name: 'Rajahmundry', type: 'safe', volunteers: 23, incidents: 2, lat: 17.0005, lng: 81.8040, keywords: ['rajahmundry', 'andhra'] },
    { id: 255, name: 'Tirupati', type: 'safe', volunteers: 32, incidents: 1, lat: 13.6288, lng: 79.4192, keywords: ['tirupati', 'andhra'] },
    // East & NE Cities
    { id: 256, name: 'Durgapur', type: 'safe', volunteers: 22, incidents: 3, lat: 23.5204, lng: 87.3119, keywords: ['durgapur', 'west bengal'] },
    { id: 257, name: 'Asansol', type: 'safe', volunteers: 20, incidents: 3, lat: 23.6739, lng: 86.9524, keywords: ['asansol', 'west bengal'] },
    { id: 258, name: 'Siliguri', type: 'safe', volunteers: 24, incidents: 2, lat: 26.7271, lng: 88.3953, keywords: ['siliguri', 'west bengal'] },
    { id: 259, name: 'Bardhaman', type: 'safe', volunteers: 18, incidents: 3, lat: 23.2324, lng: 87.8615, keywords: ['bardhaman', 'west bengal'] },
    { id: 260, name: 'Malda', type: 'safe', volunteers: 16, incidents: 3, lat: 25.0096, lng: 88.1406, keywords: ['malda', 'west bengal'] },
    { id: 261, name: 'Baharampur', type: 'safe', volunteers: 16, incidents: 3, lat: 24.1000, lng: 88.2500, keywords: ['baharampur', 'west bengal'] },
    { id: 262, name: 'Habra', type: 'safe', volunteers: 15, incidents: 2, lat: 22.8333, lng: 88.6333, keywords: ['habra', 'west bengal'] },
    { id: 263, name: 'Kharagpur', type: 'safe', volunteers: 18, incidents: 2, lat: 22.3460, lng: 87.2320, keywords: ['kharagpur', 'west bengal'] },
    { id: 264, name: 'Shillong', type: 'safe', volunteers: 18, incidents: 2, lat: 25.5788, lng: 91.8933, keywords: ['shillong', 'meghalaya'] },
    { id: 265, name: 'Imphal', type: 'safe', volunteers: 16, incidents: 2, lat: 24.8170, lng: 93.9368, keywords: ['imphal', 'manipur'] },
    { id: 266, name: 'Agartala', type: 'safe', volunteers: 16, incidents: 2, lat: 23.8315, lng: 91.2868, keywords: ['agartala', 'tripura'] },
    { id: 267, name: 'Aizawl', type: 'safe', volunteers: 14, incidents: 1, lat: 23.7271, lng: 92.7176, keywords: ['aizawl', 'mizoram'] },
    { id: 268, name: 'Gangtok', type: 'safe', volunteers: 16, incidents: 1, lat: 27.3389, lng: 88.6065, keywords: ['gangtok', 'sikkim'] },
    { id: 269, name: 'Itanagar', type: 'safe', volunteers: 14, incidents: 2, lat: 27.0844, lng: 93.6053, keywords: ['itanagar', 'arunachal'] },
    { id: 270, name: 'Kohima', type: 'safe', volunteers: 14, incidents: 2, lat: 25.6751, lng: 94.1086, keywords: ['kohima', 'nagaland'] },
    { id: 271, name: 'Dimapur', type: 'safe', volunteers: 15, incidents: 2, lat: 25.9000, lng: 93.7333, keywords: ['dimapur', 'nagaland'] },
    // Central India
    { id: 272, name: 'Raigarh', type: 'safe', volunteers: 16, incidents: 2, lat: 21.9000, lng: 83.4000, keywords: ['raigarh', 'chhattisgarh'] },
    { id: 273, name: 'Bilaspur', type: 'safe', volunteers: 18, incidents: 3, lat: 22.0797, lng: 82.1391, keywords: ['bilaspur', 'chhattisgarh'] },
    { id: 274, name: 'Korba', type: 'safe', volunteers: 16, incidents: 2, lat: 22.3595, lng: 82.7501, keywords: ['korba', 'chhattisgarh'] },
    { id: 275, name: 'Durg', type: 'safe', volunteers: 20, incidents: 3, lat: 21.1900, lng: 81.2849, keywords: ['durg', 'chhattisgarh'] },
    { id: 276, name: 'Bhilai', type: 'safe', volunteers: 22, incidents: 3, lat: 21.2095, lng: 81.3784, keywords: ['bhilai', 'chhattisgarh'] },
    { id: 277, name: 'Rajnandgaon', type: 'safe', volunteers: 15, incidents: 2, lat: 21.1000, lng: 81.0333, keywords: ['rajnandgaon', 'chhattisgarh'] },
    { id: 278, name: 'Jagdalpur', type: 'safe', volunteers: 14, incidents: 2, lat: 19.0833, lng: 82.0333, keywords: ['jagdalpur', 'chhattisgarh'] },
    { id: 279, name: 'Ambikapur', type: 'safe', volunteers: 14, incidents: 2, lat: 23.1167, lng: 83.2000, keywords: ['ambikapur', 'chhattisgarh'] },
    // Union Territories
    { id: 280, name: 'Srinagar', type: 'safe', volunteers: 28, incidents: 2, lat: 34.0837, lng: 74.7973, keywords: ['srinagar', 'kashmir', 'jammu'] },
    { id: 281, name: 'Jammu', type: 'safe', volunteers: 26, incidents: 2, lat: 32.7266, lng: 74.8570, keywords: ['jammu', 'kashmir'] },
    { id: 282, name: 'Leh', type: 'safe', volunteers: 14, incidents: 1, lat: 34.1526, lng: 77.5771, keywords: ['leh', 'ladakh'] },
    { id: 283, name: 'Puducherry', type: 'safe', volunteers: 20, incidents: 2, lat: 11.9416, lng: 79.8083, keywords: ['puducherry', 'pondicherry'] },
    { id: 284, name: 'Port Blair', type: 'safe', volunteers: 16, incidents: 1, lat: 11.6234, lng: 92.7265, keywords: ['port blair', 'andaman'] },
    { id: 285, name: 'Daman', type: 'safe', volunteers: 12, incidents: 1, lat: 20.4147, lng: 72.8320, keywords: ['daman', 'dadra'] },
    { id: 286, name: 'Diu', type: 'safe', volunteers: 10, incidents: 1, lat: 20.7144, lng: 70.9872, keywords: ['diu', 'dadra'] },
    { id: 287, name: 'Silvassa', type: 'safe', volunteers: 12, incidents: 1, lat: 20.2737, lng: 73.0139, keywords: ['silvassa', 'dadra'] },
    { id: 288, name: 'Kavaratti', type: 'safe', volunteers: 8, incidents: 0, lat: 10.5669, lng: 72.6361, keywords: ['kavaratti', 'lakshadweep'] },
    // Maharashtra additional
    { id: 289, name: 'Nashik', type: 'safe', volunteers: 35, incidents: 2, lat: 19.9975, lng: 73.7898, keywords: ['nashik', 'maharashtra'] },
    { id: 290, name: 'Aurangabad', type: 'safe', volunteers: 32, incidents: 3, lat: 19.8762, lng: 75.3433, keywords: ['aurangabad', 'maharashtra'] },
    { id: 291, name: 'Solapur', type: 'safe', volunteers: 28, incidents: 2, lat: 17.6599, lng: 75.9064, keywords: ['solapur', 'maharashtra'] },
    { id: 292, name: 'Amravati', type: 'safe', volunteers: 26, incidents: 3, lat: 20.9333, lng: 77.7500, keywords: ['amravati', 'maharashtra'] },
    { id: 293, name: 'Kolhapur', type: 'safe', volunteers: 30, incidents: 2, lat: 16.7050, lng: 74.2433, keywords: ['kolhapur', 'maharashtra'] },
    { id: 294, name: 'Sangli', type: 'safe', volunteers: 25, incidents: 2, lat: 16.8524, lng: 74.5815, keywords: ['sangli', 'maharashtra'] },
    { id: 295, name: 'Jalgaon', type: 'safe', volunteers: 24, incidents: 3, lat: 21.0077, lng: 75.5626, keywords: ['jalgaon', 'maharashtra'] },
    { id: 296, name: 'Akola', type: 'safe', volunteers: 22, incidents: 2, lat: 20.7002, lng: 77.0082, keywords: ['akola', 'maharashtra'] },
    { id: 297, name: 'Latur', type: 'safe', volunteers: 23, incidents: 2, lat: 18.4088, lng: 76.5604, keywords: ['latur', 'maharashtra'] },
    { id: 298, name: 'Dhule', type: 'safe', volunteers: 21, incidents: 2, lat: 20.9042, lng: 74.7749, keywords: ['dhule', 'maharashtra'] },
    { id: 299, name: 'Ahmednagar', type: 'safe', volunteers: 28, incidents: 3, lat: 19.0948, lng: 74.7480, keywords: ['ahmednagar', 'maharashtra'] },
    { id: 300, name: 'Chandrapur', type: 'safe', volunteers: 20, incidents: 2, lat: 19.9615, lng: 79.2961, keywords: ['chandrapur', 'maharashtra'] },
  ];

  // Extended localities with coordinates
  const nearbyLocalities = [
    { name: 'Rajiv Chowk', lat: 28.6328, lng: 77.2197, nearestZone: 1, distance: '0.5 km' },
    { name: 'Janpath', lat: 28.6226, lng: 77.2192, nearestZone: 1, distance: '0.8 km' },
    { name: 'Barakhamba', lat: 28.6289, lng: 77.2265, nearestZone: 1, distance: '1.2 km' },
    { name: 'Paharganj', lat: 28.6433, lng: 77.2194, nearestZone: 2, distance: '1.5 km' },
    { name: 'Rajendra Place', lat: 28.6512, lng: 77.1850, nearestZone: 2, distance: '2.0 km' },
    { name: 'Greater Kailash', lat: 28.5517, lng: 77.2420, nearestZone: 3, distance: '1.8 km' },
    { name: 'Defence Colony', lat: 28.5730, lng: 77.2347, nearestZone: 3, distance: '2.2 km' },
    { name: 'Hauz Khas', lat: 28.5494, lng: 77.1932, nearestZone: 3, distance: '3.0 km' },
    { name: 'Red Fort', lat: 28.6562, lng: 77.2410, nearestZone: 4, distance: '1.0 km' },
    { name: 'Jama Masjid', lat: 28.6507, lng: 77.2334, nearestZone: 4, distance: '0.8 km' },
    { name: 'Kashmere Gate', lat: 28.6692, lng: 77.2289, nearestZone: 4, distance: '1.5 km' },
    { name: 'Vasant Kunj', lat: 28.5205, lng: 77.1593, nearestZone: 5, distance: '2.5 km' },
    { name: 'Mehrauli', lat: 28.5237, lng: 77.1857, nearestZone: 5, distance: '3.2 km' },
    { name: 'Pitampura', lat: 28.6942, lng: 77.1310, nearestZone: 6, distance: '2.0 km' },
    { name: 'Shalimar Bagh', lat: 28.7233, lng: 77.1706, nearestZone: 6, distance: '1.8 km' },
    { name: 'Dwarka', lat: 28.5921, lng: 77.0460, nearestZone: 7, distance: '0 km' },
    { name: 'Noida', lat: 28.5355, lng: 77.3910, nearestZone: 8, distance: '8.0 km' },
    { name: 'Gurgaon', lat: 28.4595, lng: 77.0266, nearestZone: 9, distance: '6.5 km' },
    { name: 'Delhi', lat: 28.6139, lng: 77.2090, nearestZone: 1, distance: '0 km' },
    { name: 'New Delhi', lat: 28.6139, lng: 77.2090, nearestZone: 1, distance: '2 km' },
    { name: 'India Gate', lat: 28.6129, lng: 77.2295, nearestZone: 10, distance: '2.5 km' },
    { name: 'Connaught Circus', lat: 28.6315, lng: 77.2167, nearestZone: 1, distance: '0.3 km' },
    { name: 'Khan Market', lat: 28.5985, lng: 77.2319, nearestZone: 1, distance: '3.0 km' },
    { name: 'Lodhi Road', lat: 28.5918, lng: 77.2273, nearestZone: 1, distance: '3.5 km' },
    { name: 'RK Puram', lat: 28.5697, lng: 77.1751, nearestZone: 5, distance: '4.0 km' },
    { name: 'Vasant Vihar', lat: 28.5521, lng: 77.1619, nearestZone: 5, distance: '3.8 km' },
    { name: 'South Extension', lat: 28.5776, lng: 77.2220, nearestZone: 3, distance: '1.5 km' },
    { name: 'Lajpat', lat: 28.5677, lng: 77.2436, nearestZone: 3, distance: '0.5 km' },
    { name: 'Nagar', lat: 28.5677, lng: 77.2436, nearestZone: 3, distance: '0.5 km' },
    { name: 'Saket', lat: 28.5244, lng: 77.2066, nearestZone: 5, distance: '0 km' },
    { name: 'Karol', lat: 28.6519, lng: 77.1909, nearestZone: 2, distance: '0.5 km' },
    { name: 'Bagh', lat: 28.6519, lng: 77.1909, nearestZone: 2, distance: '0.5 km' },
    { name: 'Chandni', lat: 28.6506, lng: 77.2303, nearestZone: 4, distance: '0.5 km' },
    { name: 'Chowk', lat: 28.6506, lng: 77.2303, nearestZone: 4, distance: '0.5 km' },
    { name: 'Rohini', lat: 28.7495, lng: 77.0610, nearestZone: 6, distance: '0 km' },
    { name: 'Punjabi Bagh', lat: 28.6742, lng: 77.1539, nearestZone: 2, distance: '2.5 km' },
    { name: 'Shahdara', lat: 28.6742, lng: 77.2897, nearestZone: 4, distance: '5.0 km' },
    { name: 'Laxmi Nagar', lat: 28.6408, lng: 77.2772, nearestZone: 4, distance: '4.5 km' },
    { name: 'Preet Vihar', lat: 28.6369, lng: 77.2906, nearestZone: 4, distance: '5.5 km' },
    { name: 'Mayur Vihar', lat: 28.6120, lng: 77.2950, nearestZone: 4, distance: '6.0 km' },
    { name: 'ITO', lat: 28.6289, lng: 77.2420, nearestZone: 4, distance: '2.0 km' },
    { name: 'Mandi House', lat: 28.6264, lng: 77.2347, nearestZone: 1, distance: '1.5 km' },
    { name: 'Pragati Maidan', lat: 28.6192, lng: 77.2445, nearestZone: 1, distance: '2.5 km' },
    { name: 'AIIMS', lat: 28.5672, lng: 77.2084, nearestZone: 3, distance: '1.0 km' },
    { name: 'Green Park', lat: 28.5631, lng: 77.2040, nearestZone: 3, distance: '1.5 km' },
    { name: 'Malviya Nagar', lat: 28.5355, lng: 77.2066, nearestZone: 3, distance: '2.0 km' },
    { name: 'Kalkaji', lat: 28.5485, lng: 77.2588, nearestZone: 3, distance: '3.5 km' },
    { name: 'Nehru Place', lat: 28.5494, lng: 77.2501, nearestZone: 3, distance: '3.0 km' },
    { name: 'Okhla', lat: 28.5355, lng: 77.2726, nearestZone: 3, distance: '4.5 km' },
    { name: 'Jamia', lat: 28.5562, lng: 77.2773, nearestZone: 3, distance: '5.0 km' },
    { name: 'Sarita Vihar', lat: 28.5377, lng: 77.2889, nearestZone: 3, distance: '6.5 km' },
  ];

  // Fetch Recent Incidents from Firestore
  useEffect(() => {
    const sosRef = collection(db, 'sos_alerts');
    const q = query(sosRef, orderBy('timestamp', 'desc'), limit(10));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const incidents = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        incidents.push({
          id: doc.id,
          location: data.message || 'Emergency Alert',
          type: data.status === 'active' ? 'emergency' : 'alert',
          time: getTimeAgo(data.timestamp),
          status: data.status || 'active',
          lat: data.location?.latitude || 28.6139,
          lng: data.location?.longitude || 77.2090
        });
      });
      setRecentIncidents(incidents);
    }, (error) => {
      console.error('Error fetching incidents:', error);
      // Fallback to empty array if Firestore fails
      setRecentIncidents([]);
    });

    return () => unsubscribe();
  }, []);

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const now = new Date();
    const past = new Date(timestamp);
    const diffInMs = now - past;
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins} min ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const filters = [
    { id: 'all', label: 'All Areas' },
    { id: 'safe', label: 'Safe Zones' },
    { id: 'moderate', label: 'Moderate Risk' },
    { id: 'caution', label: 'High Caution' },
  ];

  const getTypeColor = (type) => {
    switch (type) {
      case 'safe': return 'bg-green-100 text-green-700 border-green-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'caution': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  // Filter zones based on view mode
  const filteredZones = (viewMode === 'prayagraj' ? prayagrajZones : safetyZones).filter(zone => {
    if (selectedFilter === 'all') return true;
    return zone.type === selectedFilter;
  });

  // Filtered Prayagraj Zones (for separate Prayagraj map section)
  const filteredPrayagrajZones = prayagrajZones.filter(zone => {
    if (prayagrajFilter === 'all') return true;
    return zone.type === prayagrajFilter;
  });

  console.log('Prayagraj Filter:', prayagrajFilter, 'Filtered Zones:', filteredPrayagrajZones.length);

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setMapCenter([location.lat, location.lng]);
    
    // Find nearest safety zone
    const nearestZone = findNearestZone(location.lat, location.lng);
    if (nearestZone) {
      setSearchResult({
        ...nearestZone,
        isExactMatch: false,
        distance: calculateDistance(location.lat, location.lng, nearestZone.lat, nearestZone.lng)
      });
      setShowSearchResult(true);
    }
    
    // Fly to location
    if (mapInstance) {
      mapInstance.flyTo([location.lat, location.lng], 14);
    }
  };

  const findNearestZone = (lat, lng) => {
    let nearest = null;
    let minDistance = Infinity;
    
    const zonesToSearch = viewMode === 'prayagraj' ? prayagrajZones : safetyZones;

    zonesToSearch.forEach(zone => {
      const distance = calculateDistance(lat, lng, zone.lat, zone.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = zone;
      }
    });

    return nearest;
  };

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance.toFixed(1) + ' km';
  };

  // Geocoding using Nominatim (OpenStreetMap)
  const searchLocation = async (query) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        return {
          name: result.display_name,
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim() === '') {
      setSearchResult(null);
      setShowSearchResult(false);
      return;
    }

    // First, search in safety zones by name or keywords
    const queryLower = query.toLowerCase().trim();
    
    // Use appropriate zones based on view mode
    const zonesToSearch = viewMode === 'prayagraj' ? prayagrajZones : safetyZones;

    // Improved search - check all variations
    let found = zonesToSearch.find(zone => {
      // Check if query matches zone name
      if (zone.name.toLowerCase().includes(queryLower)) return true;

      // Check if query matches first word of zone name (e.g., "bareilly" matches "Bareilly")
      const zoneNameFirstWord = zone.name.toLowerCase().split(' ')[0];
      if (zoneNameFirstWord.includes(queryLower) || queryLower.includes(zoneNameFirstWord)) return true;

      // Check keywords
      if (zone.keywords?.some(keyword => keyword.includes(queryLower) || queryLower.includes(keyword))) return true;

      // Check if any word in zone name matches
      const zoneWords = zone.name.toLowerCase().split(' ');
      if (zoneWords.some(word => word.includes(queryLower) || queryLower.includes(word))) return true;

      return false;
    });

    if (found) {
      handleLocationSelect({ lat: found.lat, lng: found.lng, name: found.name });
      setSearchResult({
        ...found,
        isExactMatch: true,
        distance: '0 km'
      });
      setShowSearchResult(true);
      return;
    }

    // Second, search in nearby localities (only for India view)
    if (viewMode === 'india') {
      const nearbyMatch = nearbyLocalities.find(locality =>
        locality.name.toLowerCase().includes(queryLower) ||
        queryLower.includes(locality.name.toLowerCase())
      );

      if (nearbyMatch) {
        handleLocationSelect({ lat: nearbyMatch.lat, lng: nearbyMatch.lng, name: nearbyMatch.name });
        const zone = safetyZones.find(z => z.id === nearbyMatch.nearestZone);
        setSearchResult({
          ...zone,
          isExactMatch: false,
          nearbyLocality: nearbyMatch.name,
          distance: nearbyMatch.distance
        });
        setShowSearchResult(true);
        return;
      }
    }

    // Third, try geocoding for any location
    const geocoded = await searchLocation(query);
    if (geocoded) {
      handleLocationSelect({ lat: geocoded.lat, lng: geocoded.lng, name: geocoded.name });
      
      // Find nearest safety zone from our database
      const nearestZone = findNearestZone(geocoded.lat, geocoded.lng);
      const distance = calculateDistance(geocoded.lat, geocoded.lng, nearestZone.lat, nearestZone.lng);
      const distanceNum = parseFloat(distance);
      
      // If location is far from any safety zone (> 100km), show as "Outside coverage area"
      if (distanceNum > 100) {
        setSearchResult({
          name: geocoded.name,
          type: 'unknown',
          isExactMatch: true,
          nearbyLocality: geocoded.name,
          distance: distance,
          volunteers: 0,
          incidents: 0,
          outsideCoverage: true
        });
      } else {
        setSearchResult({
          ...nearestZone,
          isExactMatch: false,
          nearbyLocality: geocoded.name,
          distance: distance
        });
      }
      setShowSearchResult(true);
      return;
    }

    // Not found - show message
    setSearchResult(null);
    setShowSearchResult(true);
  };

  const handleMapClick = (zone) => {
    handleLocationSelect({ lat: zone.lat, lng: zone.lng, name: zone.name });
  };

  // Prayagraj Map Handlers
  const handlePrayagrajLocationSelect = (location) => {
    setPrayagrajSelectedLocation(location);
    setPrayagrajMapCenter([location.lat, location.lng]);
    
    if (prayagrajMapInstance) {
      prayagrajMapInstance.flyTo([location.lat, location.lng], 14);
    }
  };

  const handlePrayagrajMapClick = (zone) => {
    handlePrayagrajLocationSelect({ lat: zone.lat, lng: zone.lng, name: zone.name });
  };

  const getZoneTypeLabel = (type) => {
    switch (type) {
      case 'safe': return 'Safe Zone';
      case 'moderate': return 'Moderate Risk';
      case 'caution': return 'High Caution';
      default: return 'Unknown';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 pt-24 pb-12">
      {/* HEADER SOS ALERT - Shows when hovering over risky areas */}
      {showHeaderAlert && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
            <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-600 text-white rounded-2xl shadow-2xl p-4 border-4 border-red-300 animate-pulse">
              <div className="flex items-center justify-center gap-4">
                <span className="text-4xl animate-bounce">🚨</span>
                <div className="text-center flex-1">
                  <p className="text-2xl font-black tracking-wider animate-pulse">SOS ALERT - DANGER ZONE!</p>
                  <p className="text-lg font-bold">{headerAlertMessage}</p>
                  <p className="text-sm opacity-90 mt-1">High Risk Area - Be Very Careful!</p>
                </div>
                <span className="text-4xl animate-bounce">🚨</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {viewMode === 'prayagraj' ? '📍 Prayagraj (Allahabad) Safety Map' : '🗺️ Suraksha Safety Map'}
              </h1>
              <p className="text-gray-600">
                {viewMode === 'prayagraj'
                  ? 'Local safety zones with real-time risk assessment'
                  : 'Search any location to check its safety status in real-time'}
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-md">
              <button
                onClick={() => {
                  setViewMode('india');
                  setMapCenter([28.6139, 77.2090]);
                }}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  viewMode === 'india'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                🇮🇳 India Map
              </button>
              <button
                onClick={() => {
                  setViewMode('prayagraj');
                  setMapCenter([25.4358, 81.8463]);
                }}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  viewMode === 'prayagraj'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                🏛️ Prayagraj Local
              </button>
            </div>
          </div>
        </motion.div>

        {/* India Map Content - Only show when India view mode is selected */}
        {viewMode === 'india' && (
          <>
            {/* Search and Filter Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-xl shadow-lg p-4 mb-8"
            >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={viewMode === 'prayagraj' 
                  ? "Search Prayagraj areas (e.g., Civil Lines, Chowk, Zero Road)..."
                  : "Search any location (e.g., Bareilly, Agra, Delhi)..."
                }
                value={searchQuery}
                onChange={handleSearch}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResult(null);
                    setShowSearchResult(false);
                    setSelectedLocation(null);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {/* Search Result Dropdown */}
              {showSearchResult && searchQuery.trim() !== '' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-20"
                >
                  {searchResult ? (
                    searchResult.outsideCoverage ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full bg-gray-400" />
                          <div>
                            <p className="font-semibold text-gray-900">
                              {searchResult.nearbyLocality || searchResult.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              Outside coverage area ({searchResult.distance} from nearest zone)
                            </p>
                            <p className="text-xs text-orange-600 mt-1">
                              ⚠️ Our safety zones are currently limited to major Indian cities
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            searchResult.type === 'safe' ? 'bg-green-500' :
                            searchResult.type === 'moderate' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <div>
                            <p className="font-semibold text-gray-900">
                              {searchResult.name}
                            </p>
                            <p className={`text-sm ${
                              searchResult.type === 'safe' ? 'text-green-600' :
                              searchResult.type === 'moderate' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {getZoneTypeLabel(searchResult.type)}
                              {searchResult.distance && (
                                <span className="ml-2 text-gray-500">
                                  • {searchResult.distance}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {searchResult.volunteers} volunteers
                          </span>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              handleLocationSelect({ lat: searchResult.lat, lng: searchResult.lng, name: searchResult.name });
                              setShowSearchResult(false);
                            }}
                            className="px-3 py-1 bg-primary-600 text-white text-xs rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            View on Map
                          </motion.button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center space-x-2 text-gray-500">
                      <AlertTriangle className="h-5 w-5" />
                      <div>
                        <p className="font-medium">Location not found in our database</p>
                        <p className="text-sm">
                          {viewMode === 'prayagraj'
                            ? "Try searching for Prayagraj areas like Civil Lines, Chowk, Zero Road, etc."
                            : "Try searching for major cities like Delhi, Mumbai, Bangalore, etc."
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    selectedFilter === filter.id
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Add Report Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-all shadow-md"
            >
              <Plus className="h-5 w-5" />
              <span>Report</span>
            </motion.button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map Area */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-12">
              {/* Interactive Map */}
              <div className="relative h-96 md:h-[500px]">
                <MapContainer
                  center={mapCenter}
                  zoom={11}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                  whenCreated={setMapInstance}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* Safety Zone Markers with Header Alert */}
                  {filteredZones.map((zone) => (
                    <Marker
                      key={zone.id}
                      position={[zone.lat, zone.lng]}
                      icon={createCustomIcon(zone.type)}
                      eventHandlers={{
                        click: () => handleMapClick(zone),
                        mouseover: (e) => {
                          // Show HEADER ALERT + play siren for risky areas in India map
                          if (zone.type === 'caution') {
                            setHeaderAlertMessage(`${zone.name} - ${zone.volunteers} volunteers, ${zone.incidents} incidents`);
                            setShowHeaderAlert(true);
                            playSiren(); // Play siren sound
                          }
                        },
                        mouseout: () => {
                          // Hide header alert + stop siren on mouse out
                          setShowHeaderAlert(false);
                          stopSiren(); // Stop siren sound
                        }
                      }}
                    >
                      <Popup>
                        <div className="p-2">
                          <h4 className="font-bold text-gray-900 mb-1">{zone.name}</h4>
                          <div className={`inline-block px-2 py-1 rounded text-xs font-semibold mb-2 ${getTypeColor(zone.type)}`}>
                            {getZoneTypeLabel(zone.type)}
                          </div>
                          {zone.type === 'caution' && (
                            <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-600 border-2 border-red-300 rounded-lg p-2 mb-2 animate-pulse">
                              <p className="text-white font-bold text-xs flex items-center justify-center gap-1">
                                <span className="text-lg animate-bounce">🚨</span>
                                DANGER ZONE!
                                <span className="text-lg animate-bounce">🚨</span>
                              </p>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3" />
                              <span>{zone.volunteers} volunteers</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{zone.incidents} incidents</span>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Selected Location Marker */}
                  {selectedLocation && (
                    <Marker
                      position={[selectedLocation.lat, selectedLocation.lng]}
                      icon={createCustomIcon('safe')}
                    >
                      <Popup>
                        <div className="p-2">
                          <h4 className="font-bold text-gray-900">{selectedLocation.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">Selected Location</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Click to select location */}
                  <SearchLocation onLocationSelect={handleLocationSelect} />
                </MapContainer>

                {/* Search Result Banner */}
                {searchResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-3 rounded-lg shadow-lg z-[1000] flex items-center space-x-3 max-w-md"
                  >
                    {searchResult.outsideCoverage ? (
                      <>
                        <div className="w-4 h-4 rounded-full bg-gray-400" />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">
                            {searchResult.nearbyLocality || searchResult.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            Outside coverage • {searchResult.distance} from nearest zone
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={`w-4 h-4 rounded-full ${
                          searchResult.type === 'safe' ? 'bg-green-500' :
                          searchResult.type === 'moderate' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">
                            {searchResult.nearbyLocality || searchResult.name}
                          </p>
                          <p className={`text-xs ${
                            searchResult.type === 'safe' ? 'text-green-600' :
                            searchResult.type === 'moderate' ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {getZoneTypeLabel(searchResult.type)}
                            {searchResult.distance && (
                              <span className="ml-1 text-gray-500">• {searchResult.distance}</span>
                            )}
                          </p>
                        </div>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setSearchResult(null);
                        setSearchQuery('');
                        setShowSearchResult(false);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Legend</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span>Safe Zone</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span>Moderate Risk</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span>High Caution</span>
                    </div>
                  </div>
                </div>

                {/* Map Controls */}
                <div className="absolute bottom-4 right-4 flex flex-col space-y-2 z-[1000]">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => mapInstance?.zoomIn()}
                    className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50"
                  >
                    <span className="text-lg font-bold text-gray-700">+</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => mapInstance?.zoomOut()}
                    className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50"
                  >
                    <span className="text-lg font-bold text-gray-700">−</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        handleLocationSelect({
                          lat: pos.coords.latitude,
                          lng: pos.coords.longitude,
                          name: 'Your Location'
                        });
                      });
                    }}
                    className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50"
                  >
                    <Navigation className="h-5 w-5 text-primary-600" />
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-6"
          >
            {/* Safety Zones List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-primary-600" />
                  <span>Safety Zones</span>
                </h3>
                <span className="text-sm text-gray-500">{filteredZones.length} areas</span>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3 max-h-96 overflow-y-auto"
              >
                {filteredZones.map((zone) => (
                  <motion.div
                    key={zone.id}
                    variants={itemVariants}
                    whileHover={{ x: 5, backgroundColor: 'rgba(0,0,0,0.02)' }}
                    onClick={() => handleMapClick(zone)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${getTypeColor(zone.type)}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{zone.name}</h4>
                      <span className="text-xs px-2 py-1 rounded-full bg-white/50 capitalize">
                        {zone.type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{zone.volunteers} volunteers</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{zone.incidents} incidents</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Recent Incidents */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span>Recent Incidents</span>
                </h3>
                {recentIncidents.length > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                    {recentIncidents.length} active
                  </span>
                )}
              </div>

              {recentIncidents.length > 0 ? (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  {recentIncidents.slice(0, 5).map((incident, index) => (
                    <motion.div
                      key={incident.id}
                      variants={itemVariants}
                      whileHover={{ x: 5 }}
                      onClick={() => handleLocationSelect({ lat: incident.lng ? incident.lat : 28.6139, lng: incident.lng || 77.2090, name: incident.location })}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {incident.type === 'emergency' ? (
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          )}
                          <span className="font-medium text-gray-900 text-sm">
                            {incident.location}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          incident.status === 'active'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {incident.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{incident.time}</div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No recent incidents</p>
                  <p className="text-sm text-gray-400 mt-1">All areas are currently safe</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
          </>
        )}

        {/* Prayagraj Local Map Section - Only show when Prayagraj view mode is selected */}
        {viewMode === 'prayagraj' && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16"
          >
           

          {/* Prayagraj Map Filters */}
          <div className="flex gap-2 flex-wrap mb-6">
            {[
              { id: 'all', label: 'All Areas', color: 'bg-gray-600' },
              { id: 'safe', label: '🟢 Safe Zones', color: 'bg-green-600' },
              { id: 'moderate', label: '🟡 Moderate Risk', color: 'bg-yellow-600' },
              { id: 'caution', label: '🔴 Risky Areas', color: 'bg-red-600' },
            ].map((filter) => (
              <motion.button
                key={filter.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  console.log('Filter clicked:', filter.id);
                  setPrayagrajFilter(filter.id);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  prayagrajFilter === filter.id
                    ? `${filter.color} text-white shadow-md`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label}
                {prayagrajFilter === filter.id && (
                  <span className="ml-2 text-xs">✓</span>
                )}
              </motion.button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Prayagraj Map - Now takes 3 columns */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="lg:col-span-3"
            >
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="relative h-96 md:h-[500px]">
                  <MapContainer
                    key={`prayagraj-map-${prayagrajFilter}`}
                    center={prayagrajMapCenter}
                    zoom={15}
                    minZoom={12}
                    maxZoom={18}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                    whenCreated={setPrayagrajMapInstance}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Prayagraj Safety Zone Markers - Bubble Style with Hover Popup Alert */}
                    {filteredPrayagrajZones.map((zone) => {
                      // Determine bubble size based on risk level
                      const bubbleSize = zone.type === 'safe' ? 40 : zone.type === 'moderate' ? 32 : 24;
                      
                      const colors = {
                        safe: '#22c55e',
                        moderate: '#eab308',
                        caution: '#ef4444'
                      };
                      
                      return (
                        <CircleMarker
                          key={zone.id}
                          center={[zone.lat, zone.lng]}
                          radius={bubbleSize / 2}
                          pathOptions={{
                            color: 'white',
                            weight: 3,
                            fillColor: colors[zone.type],
                            fillOpacity: 0.9
                          }}
                          eventHandlers={{
                            click: (e) => {
                              handlePrayagrajMapClick(zone);
                              e.target.openPopup();
                            },
                            mouseover: (e) => {
                              const target = e.originalEvent.target;
                              target.style.cursor = 'pointer';
                              target.style.filter = 'brightness(1.2)';
                              
                              // Show HEADER ALERT + play siren + popup on hover for risky areas
                              if (zone.type === 'caution') {
                                // Show header alert
                                setHeaderAlertMessage(`${zone.name} - ${zone.description}`);
                                setShowHeaderAlert(true);
                                playSiren(); // Play siren sound
                                
                                // Show map popup too
                                const sosPopup = `
                                  <div style="
                                    background: linear-gradient(135deg, #dc2626, #991b1b);
                                    color: white;
                                    padding: 20px;
                                    border-radius: 15px;
                                    text-align: center;
                                    min-width: 280px;
                                    border: 4px solid #fca5a5;
                                    box-shadow: 0 8px 40px rgba(220, 38, 38, 0.8);
                                    animation: sos-alert-flash 1s ease-in-out infinite;
                                  ">
                                    <style>
                                      @keyframes sos-alert-flash {
                                        0%, 100% { 
                                          transform: scale(1);
                                          box-shadow: 0 8px 40px rgba(220, 38, 38, 0.8);
                                        }
                                        50% { 
                                          transform: scale(1.08);
                                          box-shadow: 0 12px 60px rgba(220, 38, 38, 1);
                                        }
                                      }
                                    </style>
                                    <div style="font-size: 40px; margin-bottom: 10px; animation: sos-shake 0.5s ease-in-out infinite;">🚨 🚨 🚨</div>
                                    <style>
                                      @keyframes sos-shake {
                                        0%, 100% { transform: rotate(-10deg); }
                                        50% { transform: rotate(10deg); }
                                      }
                                    </style>
                                    <div style="font-size: 20px; font-weight: 900; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 2px; background: rgba(255,255,255,0.2); padding: 10px; border-radius: 10px;">${zone.name}</div>
                                    <div style="font-size: 22px; font-weight: 900; background: white; color: #dc2626; padding: 12px; border-radius: 10px; margin: 10px 0; animation: sos-pulse 0.8s ease-in-out infinite;">⚠️ SOS ALERT ⚠️</div>
                                    <style>
                                      @keyframes sos-pulse {
                                        0%, 100% { opacity: 1; transform: scale(1); }
                                        50% { opacity: 0.9; transform: scale(1.05); }
                                      }
                                    </style>
                                    <div style="font-size: 14px; font-weight: 700; background: rgba(255,255,255,0.15); padding: 8px; border-radius: 8px; margin-top: 10px;">🔴 DANGER ZONE</div>
                                    <div style="font-size: 13px; margin-top: 15px; opacity: 0.95; font-weight: 600; border-top: 2px solid rgba(255,255,255,0.3); padding-top: 12px;">📍 ${zone.description}</div>
                                    <div style="display: flex; justify-content: space-around; margin-top: 12px; font-size: 12px; font-weight: 600;">
                                      <span>👥 ${zone.volunteers} volunteers</span>
                                      <span>⚠️ ${zone.incidents} incidents</span>
                                    </div>
                                  </div>
                                `;
                                e.target.bindPopup(sosPopup, {
                                  closeButton: false,
                                  autoClose: false,
                                  closeOnClick: false
                                }).openPopup();
                              }
                            },
                            mouseout: (e) => {
                              const target = e.originalEvent.target;
                              target.style.filter = 'brightness(1)';
                              // Hide header alert + stop siren on mouse out
                              if (zone.type === 'caution') {
                                setShowHeaderAlert(false);
                                stopSiren(); // Stop siren sound
                                e.target.closePopup();
                              }
                            }
                          }}
                          className="bubble-marker"
                        >
                          <Popup>
                            <div className="p-2 min-w-[200px]">
                              <h4 className="font-bold text-gray-900 mb-1">{zone.name}</h4>
                              <div className={`inline-block px-2 py-1 rounded text-xs font-semibold mb-2 ${getTypeColor(zone.type)}`}>
                                {getZoneTypeLabel(zone.type)}
                              </div>
                              {zone.type === 'caution' && (
                                <div className="relative bg-gradient-to-r from-red-600 via-red-700 to-red-600 border-4 border-red-300 rounded-xl p-4 mb-2 overflow-hidden">
                                  {/* Ping animation like SOS button */}
                                  <div className="absolute inset-0 bg-red-400 animate-ping opacity-20" />
                                  
                                  {/* Flashing background animation */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-red-600 to-red-500 animate-pulse opacity-50" />
                                  
                                  {/* Content */}
                                  <div className="relative z-10">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                      <span className="text-3xl animate-bounce">🚨</span>
                                      <span className="text-white font-black text-lg tracking-wider">SOS ALERT</span>
                                      <span className="text-3xl animate-bounce">🚨</span>
                                    </div>
                                    
                                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 mb-2">
                                      <p className="text-white font-bold text-center text-sm">⚠️ DANGER ZONE! ⚠️</p>
                                    </div>
                                    
                                    <p className="text-red-100 text-xs text-center font-semibold flex items-center justify-center gap-1">
                                      <span className="w-2 h-2 bg-red-300 rounded-full animate-ping" />
                                      High Risk Area - Be Very Careful!
                                      <span className="w-2 h-2 bg-red-300 rounded-full animate-ping" />
                                    </p>
                                  </div>
                                </div>
                              )}
                              <p className="text-sm text-gray-600 mb-2">{zone.description}</p>
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-1">
                                  <Users className="h-3 w-3" />
                                  <span>{zone.volunteers} volunteers</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>{zone.incidents} incidents</span>
                                </div>
                              </div>
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    })}

                    {/* Selected Location Marker */}
                    {prayagrajSelectedLocation && (
                      <Marker
                        position={[prayagrajSelectedLocation.lat, prayagrajSelectedLocation.lng]}
                        icon={createCustomIcon('safe')}
                      >
                        <Popup>
                          <div className="p-2">
                            <h4 className="font-bold text-gray-900">{prayagrajSelectedLocation.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">Selected Location</p>
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {/* Click to select location */}
                    <SearchLocation onLocationSelect={handlePrayagrajLocationSelect} />
                  </MapContainer>

                  {/* Prayagraj Map Legend - Bubble Style */}
                  <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm">Legend</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-2 border-white shadow-md" />
                        <span>🟢 Safe Zone</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 border-2 border-white shadow-md" />
                        <span>🟡 Moderate Risk</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-400 to-red-600 border-2 border-white shadow-md" />
                        <span>🔴 Risky Area</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
                      📍 Showing {filteredPrayagrajZones.length} of {prayagrajZones.length} areas
                    </div>
                  </div>

                  {/* Prayagraj Map Controls */}
                  <div className="absolute bottom-4 right-4 flex flex-col space-y-2 z-[1000]">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => prayagrajMapInstance?.zoomIn()}
                      className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50"
                    >
                      <span className="text-lg font-bold text-gray-700">+</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => prayagrajMapInstance?.zoomOut()}
                      className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50"
                    >
                      <span className="text-lg font-bold text-gray-700">−</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          handlePrayagrajLocationSelect({
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            name: 'Your Location'
                          });
                        });
                      }}
                      className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50"
                    >
                      <Navigation className="h-5 w-5 text-primary-600" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setPrayagrajMapCenter([25.4358, 81.8463]);
                        setPrayagrajFilter('all');
                      }}
                      className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50"
                      title="Reset View"
                    >
                      <span className="text-xs font-bold text-gray-700">⟲</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 📊 Prayagraj Safety Stats - RIGHT SIDE OF MAP */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="lg:col-span-1"
            >
              <div className="bg-gradient-to-br from-green-50 via-yellow-50 to-red-50 rounded-2xl shadow-xl p-6 border-2 border-gray-200 h-full">
                <h3 className="text-xl font-bold text-gray-900 text-center mb-6">
                  📊 Prayagraj Safety Stats
                </h3>
                <div className="space-y-4">
                  {/* Safe Zones */}
                  <motion.div
                    whileHover={{ scale: 1.05, x: 5 }}
                    className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-4 text-white text-center shadow-lg cursor-pointer"
                  >
                    <div className="text-4xl font-bold mb-1">
                      {prayagrajZones.filter(z => z.type === 'safe').length}
                    </div>
                    <div className="text-sm font-medium opacity-90">🟢 Safe Zones</div>
                  </motion.div>

                  {/* Moderate Risk */}
                  <motion.div
                    whileHover={{ scale: 1.05, x: 5 }}
                    className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl p-4 text-white text-center shadow-lg cursor-pointer"
                  >
                    <div className="text-4xl font-bold mb-1">
                      {prayagrajZones.filter(z => z.type === 'moderate').length}
                    </div>
                    <div className="text-sm font-medium opacity-90">🟡 Moderate Risk</div>
                  </motion.div>

                  {/* Risky Areas */}
                  <motion.div
                    whileHover={{ scale: 1.05, x: 5 }}
                    className="bg-gradient-to-br from-red-400 to-red-600 rounded-xl p-4 text-white text-center shadow-lg cursor-pointer"
                  >
                    <div className="text-4xl font-bold mb-1">
                      {prayagrajZones.filter(z => z.type === 'caution').length}
                    </div>
                    <div className="text-sm font-medium opacity-90">🔴 Risky Areas</div>
                  </motion.div>

                  {/* Total Areas */}
                  <motion.div
                    whileHover={{ scale: 1.05, x: 5 }}
                    className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-4 text-white text-center shadow-lg cursor-pointer"
                  >
                    <div className="text-4xl font-bold mb-1">
                      {prayagrajZones.length}
                    </div>
                    <div className="text-sm font-medium opacity-90">📍 Total Areas</div>
                  </motion.div>
                </div>

                {/* Filter Info */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600 text-center">
                    📍 Showing <span className="font-bold">{filteredPrayagrajZones.length}</span> of {prayagrajZones.length} areas
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
        )}
      </div>
    </main>
  );
};

export default PublicMap;
