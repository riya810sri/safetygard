import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Menu, X, LogOut, User as UserIcon } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Suraksha-Map', path: '/public-map' },
    { name: 'Devices', path: '/my-devices' },
  ];

  const moreLinks = [
    { name: 'Community', path: '/community' },
    { name: 'History', path: '/history' },
  ];

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      // Listen to user profile changes
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeProfile = onSnapshot(userRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            setUserProfile(docSnapshot.data());
          } else {
            setUserProfile(null);
          }
        });
        
        return () => unsubscribeProfile();
      } else {
        setUserProfile(null);
      }
    });
    
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // Always show white background on non-home pages
    if (location.pathname !== '/') {
      setIsScrolled(true);
    } else {
      // On home page, check scroll position
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 50);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || location.pathname !== '/'
          ? 'bg-white/95 backdrop-blur-md shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-16">
        <div className="flex justify-between items-center h-20 md:h-24">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Shield className={`h-10 w-10 md:h-12 md:w-12 transition-colors duration-300 ${
                isScrolled ? 'text-primary-600' : 'text-white'
              }`} />
            </motion.div>
            <span className={`text-3xl md:text-4xl font-bold transition-colors duration-300 ${
              isScrolled ? 'text-primary-600' : 'text-white'
            }`}>Suraksha</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-semibold transition-colors duration-300 text-base ${
                  isActive(link.path)
                    ? 'text-primary-600'
                    : isScrolled || location.pathname !== '/'
                      ? 'text-gray-600 hover:text-primary-600'
                      : 'text-white/90 hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            ))}

            {/* More Dropdown */}
            <div className="relative group">
              <button className={`font-semibold transition-colors duration-300 text-base flex items-center space-x-1 ${
                isScrolled || location.pathname !== '/'
                  ? 'text-gray-600 hover:text-primary-600'
                  : 'text-white/90 hover:text-white'
              }`}>
                <span>More</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                <div className="py-2">
                  {moreLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`block px-4 py-2 text-sm transition-colors ${
                        isActive(link.path)
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {currentUser ? (
              <>
                <Link to="/dashboard" className="flex items-center">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="relative"
                  >
                    {userProfile?.photoURL ? (
                      <img
                        src={userProfile.photoURL}
                        alt="Profile"
                        className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-md"
                      />
                    ) : (
                      <div className="w-11 h-11 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                        <UserIcon className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </motion.div>
                </Link>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all shadow-md flex items-center space-x-2 text-base"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </motion.button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 text-base font-semibold border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-all"
                  >
                    Log In
                  </motion.button>
                </Link>
                <Link to="/signup">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-6 py-3 font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg ${
                      isScrolled
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-white text-primary-600 hover:bg-white/90'
                    }`}
                  >
                    Sign Up
                  </motion.button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`md:hidden p-3 rounded-lg transition-colors ${
              isScrolled ? 'hover:bg-gray-100' : 'hover:bg-white/20'
            }`}
          >
            {isMenuOpen ? (
              <X className={`h-7 w-7 ${isScrolled ? 'text-gray-700' : 'text-white'}`} />
            ) : (
              <Menu className={`h-7 w-7 ${isScrolled ? 'text-gray-700' : 'text-white'}`} />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 space-y-2">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={link.path}
                      onClick={() => setIsMenuOpen(false)}
                      className={`block px-4 py-2.5 rounded-lg font-semibold ${
                        isActive(link.path)
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-gray-700 hover:bg-gray-50'
                      } transition-colors`}
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                ))}
                {/* More Links in Mobile */}
                <div className="pt-2 pb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">More</div>
                  {moreLinks.map((link, index) => (
                    <motion.div
                      key={link.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        to={link.path}
                        onClick={() => setIsMenuOpen(false)}
                        className={`block px-4 py-2 rounded-lg ${
                          isActive(link.path)
                            ? 'bg-primary-50 text-primary-600'
                            : 'text-gray-700 hover:bg-gray-50'
                        } transition-colors`}
                      >
                        {link.name}
                      </Link>
                    </motion.div>
                  ))}
                </div>
                <div className="pt-4 space-y-3 px-4">
                  {currentUser ? (
                    <>
                      <div className="flex items-center space-x-3 px-4 py-3 bg-white rounded-lg border-2 border-gray-300 shadow-md">
                        <div className="relative flex-shrink-0">
                          {userProfile?.photoURL ? (
                            <img
                              src={userProfile.photoURL}
                              alt="Profile"
                              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                              <UserIcon className="h-6 w-6 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-gray-900 text-base truncate drop-shadow-sm">
                            {currentUser.displayName || currentUser.email}
                          </div>
                          <div className="text-sm text-gray-800 font-bold truncate">{currentUser.email}</div>
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLogout}
                        className="w-full px-5 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all duration-300 shadow-lg flex items-center justify-center space-x-2"
                      >
                        <LogOut className="h-5 w-5" />
                        <span className="font-bold">Logout</span>
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          className="w-full px-5 py-2 text-primary-600 font-semibold border-2 border-primary-600 rounded-lg hover:bg-primary-50 transition-all duration-300"
                        >
                          Log In
                        </motion.button>
                      </Link>
                      <Link to="/signup" onClick={() => setIsMenuOpen(false)}>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          className="w-full px-5 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all duration-300 shadow-md"
                        >
                          Sign Up
                        </motion.button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
};

export default Header;
