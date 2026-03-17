import { useEffect, useState, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy load components for better performance
const Header = lazy(() => import('./components/Header'));
const Footer = lazy(() => import('./components/Footer'));
const AIChatbot = lazy(() => import('./components/AIChatbot'));
const Home = lazy(() => import('./pages/Home'));
const PublicMap = lazy(() => import('./pages/PublicMap'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Community = lazy(() => import('./pages/Community'));
const History = lazy(() => import('./pages/History'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const HackathonDemo = lazy(() => import('./pages/HackathonDemo'));
const GetDevice = lazy(() => import('./pages/GetDevice'));
const MyDevices = lazy(() => import('./pages/MyDevices'));
const DeviceDashboard = lazy(() => import('./components/DeviceDashboard'));


// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-600 font-medium">Loading...</p>
    </div>
  </div>
);

const Layout = ({ children }) => {
  const location = useLocation();
  const noLayoutPaths = ['/login', '/signup'];
  const showLayout = !noLayoutPaths.includes(location.pathname);

  return (
    <>
      {showLayout && <Header />}
      <AnimatePresence mode="wait">
        {children}
      </AnimatePresence>
      {showLayout && <Footer />}

       {/* 👇 AI Chatbot - Advanced with Gemini AI */}
      <Suspense fallback={null}>
        <AIChatbot />
      </Suspense>

    </>
  );
};

// Optimized animation - reduced duration
const AnimatedPage = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
);

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Only check auth state - removed unnecessary database calls
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  // Don't render until auth is checked
  if (!authChecked) {
    return <PageLoader />;
  }

  return (
    <Router>
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<AnimatedPage><Home /></AnimatedPage>} />
            <Route path="/public-map" element={<AnimatedPage><PublicMap /></AnimatedPage>} />
           <Route 
  path="/dashboard" 
  element={
    <AnimatedPage>
      <ProtectedRoute user={currentUser}>
        <Dashboard />
      </ProtectedRoute>
    </AnimatedPage>
  } 
/>

<Route 
  path="/community" 
  element={
    <AnimatedPage>
      <ProtectedRoute user={currentUser}>
        <Community />
      </ProtectedRoute>
    </AnimatedPage>
  } 
/>

<Route 
  path="/history" 
  element={
    <AnimatedPage>
      <ProtectedRoute user={currentUser}>
        <History />
      </ProtectedRoute>
    </AnimatedPage>
  } 
/>
            <Route path="/hackathon-demo" element={<AnimatedPage><HackathonDemo /></AnimatedPage>} />
            <Route path="/get-device" element={<AnimatedPage><GetDevice /></AnimatedPage>} />
            <Route 
              path="/my-devices" 
              element={
                <AnimatedPage>
                  <ProtectedRoute user={currentUser}>
                    <MyDevices />
                  </ProtectedRoute>
                </AnimatedPage>
              } 
            />
            <Route 
              path="/device/:deviceId" 
              element={
                <AnimatedPage>
                  <ProtectedRoute user={currentUser}>
                    <DeviceDashboard />
                  </ProtectedRoute>
                </AnimatedPage>
              } 
            />
            <Route path="/login" element={<AnimatedPage><Login /></AnimatedPage>} />
            <Route path="/signup" element={<AnimatedPage><Signup /></AnimatedPage>} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}

export default App;
