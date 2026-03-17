import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  MapPin,
  Users,
  Shield,
  Zap,
  Heart,
  ArrowRight,
  Play,
  X,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const Home = () => {
  const navigate = useNavigate();
  const [showVideo, setShowVideo] = useState(false);

  const features = [
    {
      icon: Bell,
      title: 'SOS ALERTS',
      description: 'Instant alerts sent to emergency contacts to ensure quick response during critical situations.',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      icon: MapPin,
      title: 'GPS TRACKING',
      description: 'Live location updates for you and your trusted network with real-time tracking capabilities.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Users,
      title: 'COMMUNITY SUPPORT',
      description: 'Connect with trained volunteers and nearby users ready to assist in emergencies.',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: Shield,
      title: 'GEO-FENCING',
      description: 'Set safe zones and get instant notifications when you or loved ones enter or exit designated areas.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  const stats = [
    { number: '10K+', label: 'Active Users' },
    { number: '500+', label: 'Emergencies Helped' },
    { number: '50+', label: 'Cities Covered' },
    { number: '24/7', label: 'Support' },
  ];

  // Optimized animation variants - reduced stagger time
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1, // Reduced from 0.2
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 }, // Reduced from 30
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4, // Reduced from 0.6
        ease: 'easeOut',
      },
    },
  };

  // Hero text animations
  const heroTextVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const heroImageVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const floatingAnimation = {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  };

  return (
    <main className="min-h-screen">
      {/* Hero Section - Enhanced */}
      <section className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 pt-32 pb-24 overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Animated background decoration orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.3, 0.2]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="absolute top-20 right-10 w-72 h-72 bg-blue-300 rounded-full blur-3xl opacity-20" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.35, 0.2]
          }}
          transition={{ 
            duration: 5, 
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1
          }}
          className="absolute bottom-10 left-10 w-96 h-96 bg-purple-300 rounded-full blur-3xl opacity-20" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2
          }}
          className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-300 rounded-full blur-3xl opacity-15" 
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16">
            {/* Hero Image - Enhanced with floating animation */}
            <motion.div 
              variants={heroImageVariants}
              initial="hidden"
              animate="visible"
              className="flex-shrink-0"
            >
              <motion.div
                animate={floatingAnimation}
                className="relative"
              >
                {/* Glow effect behind image */}
                <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full scale-75" />
                <img
                  src="/ws png.png"
                  alt="Suraksha Safety"
                  className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 object-contain drop-shadow-2xl"
                  style={{ willChange: 'transform' }}
                />
              </motion.div>
            </motion.div>

            {/* Text Content - Enhanced */}
            <motion.div 
              className="text-center lg:text-left max-w-2xl"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Badge with sparkle */}
              <motion.div 
                variants={heroTextVariants}
                className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full mb-6 border border-white/30 shadow-lg"
              >
                <Sparkles className="h-4 w-4 text-yellow-300" />
                <span className="text-white font-semibold text-sm tracking-wide">#1 Safety App</span>
              </motion.div>

              {/* Main Heading - Enhanced typography */}
              <motion.h1 
                variants={heroTextVariants}
                className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight"
              >
                <span className="text-white drop-shadow-lg">
                  EMPOWER YOUR
                </span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 drop-shadow-lg">
                  SAFETY APP AND DEVICE
                </span>
              </motion.h1>

              {/* Subheading */}
              <motion.p 
                variants={heroTextVariants}
                className="text-lg md:text-xl text-primary-100 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                Experience real-time SOS alerts, GPS tracking, and community support, all at your fingertips.
              </motion.p>

              {/* CTA Buttons - Enhanced */}
              <motion.div 
                variants={heroTextVariants}
                className="flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4"
              >
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/signup')}
                  className="group bg-white text-primary-600 font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.25)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowVideo(true)}
                  className="group bg-white/10 backdrop-blur-md text-white font-bold py-4 px-8 rounded-xl border-2 border-white/40 hover:border-white/60 transition-all duration-300 flex items-center space-x-2 cursor-pointer"
                >
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                    <Play className="h-4 w-4 text-primary-600 ml-1" />
                  </div>
                  <span>Watch Demo</span>
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white shadow-lg relative -mt-8 mx-4 md:mx-8 lg:mx-auto max-w-6xl rounded-2xl z-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-bold text-primary-600 mb-2">
                {stat.number}
              </div>
              <div className="text-gray-600 font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose <span className="text-primary-600">Suraksha?</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comprehensive safety features designed to protect you and your loved ones 24/7
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300"
              >
                <div className={`${feature.bgColor} ${feature.color} w-14 h-14 rounded-xl flex items-center justify-center mb-5`}>
                  <feature.icon className="h-7 w-7" />
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>

                <p className="text-gray-600 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in just a few simple steps
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {[
              {
                icon: Bell,
                step: 'Step 1',
                title: 'Get Suraksha Device',
                description: 'Purchase and connect your Suraksha hardware device for enhanced safety features.',
                color: 'from-purple-400 to-violet-500',
                cta: 'Order Now',
              },
              {
                icon: Zap,
                step: 'Step 2',
                title: 'Download & Register',
                description: 'Install the app and create your account in seconds.',
                color: 'from-yellow-400 to-orange-500',
              },
              {
                icon: Shield,
                step: 'Step 3',
                title: 'Set Up Emergency Contacts',
                description: 'Add trusted contacts who will receive your SOS alerts.',
                color: 'from-blue-400 to-indigo-500',
              },
              {
                icon: Heart,
                step: 'Step 4',
                title: 'Stay Protected',
                description: 'Tap SOS button in emergencies and get instant help.',
                color: 'from-red-400 to-pink-500',
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                variants={itemVariants}
                className="relative text-center"
              >
                {index < 3 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-gray-200 to-gray-300" />
                )}
                <div className="relative z-10">
                  <div className={`w-24 h-24 mx-auto bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center mb-6 shadow-lg`}>
                    <item.icon className="h-10 w-10 text-white" />
                  </div>
                  <div className="text-sm font-semibold text-primary-600 mb-2">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {item.description}
                  </p>
                  {item.cta && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate('/get-device')}
                      className={`inline-flex items-center gap-2 bg-gradient-to-r ${item.color} text-white font-semibold py-2.5 px-6 rounded-full shadow-lg hover:shadow-xl transition-all`}
                    >
                      <span>{item.cta}</span>
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Take Control of Your Safety?
            </h2>
            <p className="text-xl text-primary-100 mb-10">
              Join thousands of users who trust Suraksha for their personal safety.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/signup')}
              className="bg-white text-primary-600 font-bold py-4 px-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center space-x-2"
            >
              <span>Download Now</span>
              <ArrowRight className="h-5 w-5" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Video Modal - Optimized */}
      <AnimatePresence>
        {showVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowVideo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowVideo(false)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
                aria-label="Close video"
              >
                <X className="h-8 w-8" />
              </button>

              {/* Video Player - Optimized with better attributes */}
              <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
                <video
                  src="/demo.mp4"
                  controls
                  controlsList="nodownload"
                  preload="metadata"
                  playsInline
                  className="w-full aspect-video"
                  poster=""
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default Home;
