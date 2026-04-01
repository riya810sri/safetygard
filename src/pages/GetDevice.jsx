import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Zap,
  Truck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Bluetooth,
  Battery,
  Droplet,
  MapPin,
  Bell,
  Heart,
  Package,
  CreditCard,
  ClipboardCheck,
  Sparkles,
  Star,
  Gift
} from 'lucide-react';

const GetDevice = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [orderData, setOrderData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    paymentMethod: 'cod'
  });

  const steps = [
    { number: 1, title: 'Order Now', icon: Package },
    { number: 2, title: 'Shipping', icon: Truck },
    { number: 3, title: 'Payment', icon: CreditCard },
    { number: 4, title: 'Confirm', icon: ClipboardCheck },
  ];

  const deviceFeatures = [
    { icon: Zap, title: 'SOS Button', description: 'One-press emergency alert' },
    { icon: MapPin, title: 'GPS Tracking', description: 'Real-time location sharing' },
    { icon: Battery, title: 'Long Battery', description: 'Up to 7 days backup' },
    { icon: Droplet, title: 'Water Resistant', description: 'IP67 rated protection' },
    { icon: Bluetooth, title: 'Bluetooth 5.0', description: 'Seamless phone connection' },
    { icon: Bell, title: 'Fall Detection', description: 'Automatic alert system' },
  ];

  const plans = [
    {
      id: 'basic',
      name: 'Suraksha Basic',
      price: '₹1,499',
      originalPrice: '₹2,499',
      discount: '40% OFF',
      features: ['SOS Alert Button', 'GPS Tracking', '7-Day Battery', 'basic community support'],
      popular: false,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'pro',
      name: 'Suraksha Pro',
      price: '₹2,499',
      originalPrice: '₹3,999',
      discount: '38% OFF',
      features: ['Everything in Basic', 'Fall Detection', 'geo fencing','Two-Way Calling', 'Priority Support', 'Extended Warranty'],
      popular: true,
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'family',
      name: 'Suraksha Pro++ ',
      price: '₹4,499',
      originalPrice: '₹7,497',
      discount: '40% OFF',
      features: ['Everything in Pro', 'AI  Powered geo fencing', 'Heavy community support', '24/7 Support', 'Free Replacement',],
      popular: false,
      color: 'from-green-500 to-emerald-500'
    }
  ];

  const testimonials = [
    {
      name: 'Priya Sharma',
      rating: 5,
      text: 'The Suraksha device gave me peace of mind. My parents feel safer knowing help is just a button away!',
      avatar: '👩'
    },
    {
      name: 'Rajesh Kumar',
      rating: 5,
      text: 'Excellent build quality and the battery life is amazing. Highly recommend for everyone!',
      avatar: '👨'
    },
    {
      name: 'Anita Desai',
      rating: 5,
      text: 'Best safety investment I\'ve made. The GPS tracking is accurate and the app is user-friendly.',
      avatar: '👵'
    }
  ];

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOrderData(prev => ({ ...prev, [name]: value }));
  };

  const handleNextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handlePlaceOrder = async () => {
    try {
      // Generate order number
      const orderNumber = `SURAKSHA-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      // Get selected plan details
      const plan = plans.find(p => p.id === selectedPlan);

      // Prepare order data for API
      const orderPayload = {
        orderData,
        selectedPlan: plan,
        orderNumber
      };

      // Call backend API to send order confirmation
      const backendUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001';

      try {
        const response = await fetch(`${backendUrl}/api/send-order-confirmation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orderPayload)
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Order confirmation sent:', result);
        } else {
          console.error('❌ Failed to send order confirmation');
        }
      } catch (apiError) {
        console.error('❌ API error:', apiError);
        // Continue even if API fails - order is still placed
      }

      // Save order to local storage for reference
      localStorage.setItem('lastOrder', JSON.stringify({
        ...orderPayload,
        timestamp: new Date().toISOString()
      }));

      // 📱 Redirect to WhatsApp with order details
      const sellerPhone = '7985042683'; // Seller's WhatsApp number
      
      // Create WhatsApp message with all order details
      const whatsappMessage = `🎉 *NEW ORDER RECEIVED!* 🎉

📋 *Order Details:*
━━━━━━━━━━━━━━━━━━━━
*Order ID:* ${orderNumber}
*Plan:* ${plan.name}
*Price:* ${plan.price}
*Payment:* ${orderData.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Online Payment'}

👤 *Customer Details:*
━━━━━━━━━━━━━━━━━━━━
*Name:* ${orderData.name}
*Email:* ${orderData.email}
*Phone:* ${orderData.phone}

📍 *Shipping Address:*
━━━━━━━━━━━━━━━━━━━━
${orderData.address}
${orderData.city} - ${orderData.pincode}
${orderData.state || ''}

⚡ *Action Required:*
Please process this order within 24 hours.

_This is an automated message from Suraksha Order System_`;

      // Encode message for URL
      const encodedMessage = encodeURIComponent(whatsappMessage);
      
      // Create WhatsApp URL
      const whatsappUrl = `https://wa.me/${sellerPhone}?text=${encodedMessage}`;
      
      // Open WhatsApp in new tab
      window.open(whatsappUrl, '_blank');

      // Move to success screen
      setCurrentStep(5);

    } catch (error) {
      console.error('❌ Order placement error:', error);
      alert('There was an error placing your order. Please try again.');
    }
  };

  // Step 1: Order Selection
  const OrderSelectionStep = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} className="text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-3 rounded-full mb-6"
        >
          <Sparkles className="h-5 w-5 text-purple-600" />
          <span className="text-purple-800 font-semibold">Limited Period Offer - Up to 40% OFF</span>
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Safety Plan</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Select the perfect Suraksha device package for you and your loved ones
        </p>
      </motion.div>

      {/* Device Image */}
      <motion.div
        variants={itemVariants}
        className="relative max-w-md mx-auto"
      >
        <motion.div
          animate={{
            y: [0, -10, 0],
            rotate: [0, 2, -2, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="relative z-10"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-300 to-pink-300 blur-3xl opacity-30 rounded-full" />
          <img
            src="/ws png.png"
            alt="Suraksha Device"
            className="w-full h-auto drop-shadow-2xl"
          />
        </motion.div>
      </motion.div>

      {/* Pricing Plans */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -8, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
            onClick={() => setSelectedPlan(plan.id)}
            className={`relative cursor-pointer rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
              selectedPlan === plan.id
                ? 'border-purple-500 shadow-xl scale-105'
                : 'border-gray-200 shadow-md hover:border-purple-300'
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-4 py-2 rounded-bl-xl">
                MOST POPULAR
              </div>
            )}

            <div className={`bg-gradient-to-br ${plan.color} p-6 text-white`}>
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-lg line-through opacity-70">{plan.originalPrice}</span>
              </div>
              <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold mt-2">
                {plan.discount}
              </div>
            </div>

            <div className="p-6 bg-white">
              <ul className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.05 }}
                    className="flex items-center gap-2 text-gray-700"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </motion.li>
                ))}
              </ul>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full mt-6 py-3 px-4 rounded-xl font-semibold transition-all ${
                  selectedPlan === plan.id
                    ? `bg-gradient-to-r ${plan.color} text-white shadow-lg`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
              </motion.button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Device Features */}
      <motion.div variants={itemVariants} className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Device Features
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {deviceFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + index * 0.05 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all text-center"
            >
              <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                <feature.icon className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 text-sm mb-1">{feature.title}</h4>
              <p className="text-xs text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Testimonials */}
      <motion.div variants={itemVariants} className="mt-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          What Our Customers Say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-white rounded-xl p-6 shadow-md"
            >
              <div className="flex items-center gap-1 mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-4 italic">"{testimonial.text}"</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{testimonial.avatar}</span>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">Verified Buyer</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Continue Button */}
      <motion.div
        variants={itemVariants}
        className="flex justify-center pt-8"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleNextStep}
          disabled={!selectedPlan}
          className={`group flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all ${
            selectedPlan
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <span>Continue to Shipping</span>
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </motion.div>
    </motion.div>
  );

  // Step 2: Shipping Information
  const ShippingStep = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto space-y-8"
    >
      <motion.div variants={itemVariants} className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Shipping Information
        </h2>
        <p className="text-gray-600">
          Enter your delivery address below
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={orderData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={orderData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone"
              value={orderData.phone}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
              placeholder="+91 XXXXX XXXXX"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Complete Address *
            </label>
            <textarea
              name="address"
              value={orderData.address}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none resize-none"
              placeholder="House/Flat No., Building Name, Street, Locality"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                City *
              </label>
              <input
                type="text"
                name="city"
                value={orderData.city}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                placeholder="Enter city"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                PIN Code *
              </label>
              <input
                type="text"
                name="pincode"
                value={orderData.pincode}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                placeholder="Enter PIN code"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePrevStep}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNextStep}
            disabled={!orderData.name || !orderData.email || !orderData.phone || !orderData.address || !orderData.city || !orderData.pincode}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              orderData.name && orderData.email && orderData.phone && orderData.address && orderData.city && orderData.pincode
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>Continue to Payment</span>
            <ArrowRight className="h-5 w-5" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );

  // Step 3: Payment
  const PaymentStep = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto space-y-8"
    >
      <motion.div variants={itemVariants} className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Method
        </h2>
        <p className="text-gray-600">
          Choose your preferred payment option
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        {/* Order Summary */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Order Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-gray-700">
              <span>Selected Plan</span>
              <span className="font-semibold">
                {plans.find(p => p.id === selectedPlan)?.name || 'Not selected'}
              </span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Original Price</span>
              <span className="line-through">
                {plans.find(p => p.id === selectedPlan)?.originalPrice || '₹0'}
              </span>
            </div>
            <div className="flex justify-between text-green-600 font-semibold">
              <span>Discount</span>
              <span>-{plans.find(p => p.id === selectedPlan)?.discount || '0%'}</span>
            </div>
            <div className="border-t border-purple-200 pt-3 flex justify-between items-center">
              <span className="font-bold text-gray-900">Total Amount</span>
              <span className="text-2xl font-bold text-purple-600">
                {plans.find(p => p.id === selectedPlan)?.price || '₹0'}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Options */}
        <div className="space-y-4 mb-6">
          <motion.label
            whileHover={{ scale: 1.01 }}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              orderData.paymentMethod === 'cod'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              checked={orderData.paymentMethod === 'cod'}
              onChange={handleInputChange}
              className="w-5 h-5 text-purple-600"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Cash on Delivery</p>
              <p className="text-sm text-gray-600">Pay when you receive your device</p>
            </div>
            <CreditCard className="h-6 w-6 text-gray-400" />
          </motion.label>

          <motion.label
            whileHover={{ scale: 1.01 }}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              orderData.paymentMethod === 'online'
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-300'
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="online"
              checked={orderData.paymentMethod === 'online'}
              onChange={handleInputChange}
              className="w-5 h-5 text-purple-600"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Online Payment</p>
              <p className="text-sm text-gray-600">UPI, Credit/Debit Card, Net Banking</p>
            </div>
            <div className="flex gap-2">
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">UPI</span>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">Card</span>
            </div>
          </motion.label>
        </div>

        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePrevStep}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNextStep}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <span>Review Order</span>
            <ArrowRight className="h-5 w-5" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );

  // Step 4: Confirmation
  const ConfirmationStep = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto space-y-8"
    >
      <motion.div variants={itemVariants} className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Review Your Order
        </h2>
        <p className="text-gray-600">
          Please verify all details before placing your order
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        {/* Selected Plan */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-600" />
            Selected Plan
          </h3>
          <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="font-bold text-gray-900 text-lg">
                  {plans.find(p => p.id === selectedPlan)?.name}
                </p>
                <p className="text-sm text-gray-600">
                  {plans.find(p => p.id === selectedPlan)?.features.length} features included
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-600">
                  {plans.find(p => p.id === selectedPlan)?.price}
                </p>
                <p className="text-sm text-green-600 font-semibold">
                  {plans.find(p => p.id === selectedPlan)?.discount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-purple-600" />
            Shipping Address
          </h3>
          <div className="bg-gray-50 rounded-xl p-6">
            <p className="font-semibold text-gray-900">{orderData.name}</p>
            <p className="text-gray-600 text-sm mt-2">{orderData.address}</p>
            <p className="text-gray-600 text-sm">{orderData.city} - {orderData.pincode}</p>
            <p className="text-gray-600 text-sm mt-2">📞 {orderData.phone}</p>
            <p className="text-gray-600 text-sm">✉️ {orderData.email}</p>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-purple-600" />
            Payment Method
          </h3>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="font-semibold text-gray-900">
              {orderData.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Online Payment'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {orderData.paymentMethod === 'cod' 
                ? 'Pay when you receive your device' 
                : 'You will be redirected to payment gateway'}
            </p>
          </div>
        </div>

        {/* Order Total */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-6">
            <span className="text-lg font-semibold text-gray-700">Total Amount</span>
            <span className="text-3xl font-bold text-purple-600">
              {plans.find(p => p.id === selectedPlan)?.price}
            </span>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePlaceOrder}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
          >
            <CheckCircle2 className="h-6 w-6" />
            <span>Place Order Now</span>
          </motion.button>
        </div>

        <div className="flex gap-4 mt-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePrevStep}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );

  // Step 5: Success
  const SuccessStep = () => {
    // Get order number from localStorage
    const lastOrder = JSON.parse(localStorage.getItem('lastOrder') || '{}');
    const [orderNumber] = useState(() => 
      lastOrder.orderNumber || `SURAKSHA-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
    );

    return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-lg mx-auto text-center py-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg"
      >
        <CheckCircle2 className="h-12 w-12 text-white" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold text-gray-900 mb-4"
      >
        Order Placed Successfully!
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-gray-600 mb-8"
      >
        Thank you for ordering! We've sent a confirmation email and WhatsApp message to your registered contact details.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 mb-8"
      >
        <p className="text-sm text-gray-600 mb-2">Order Reference</p>
        <p className="text-2xl font-bold text-purple-600">{orderNumber}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-4"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            const sellerPhone = '919369508929';
            const whatsappMessage = `🎉 *NEW ORDER RECEIVED!* 🎉

📋 *Order Details:*
━━━━━━━━━━━━━━━━━━━━
*Order ID:* ${orderNumber}
*Plan:* ${plans.find(p => p.id === selectedPlan)?.name || 'Selected Plan'}
*Price:* ${plans.find(p => p.id === selectedPlan)?.price || '₹0'}
*Payment:* ${orderData.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Online Payment'}

👤 *Customer Details:*
━━━━━━━━━━━━━━━━━━━━
*Name:* ${orderData.name}
*Email:* ${orderData.email}
*Phone:* ${orderData.phone}

📍 *Shipping Address:*
━━━━━━━━━━━━━━━━━━━━
${orderData.address}
${orderData.city} - ${orderData.pincode}

⚡ *Action Required:*
Please process this order within 24 hours.`;
            window.open(`https://wa.me/${sellerPhone}?text=${encodeURIComponent(whatsappMessage)}`, '_blank');
          }}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >
          <span>📱 Notify Seller on WhatsApp</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/')}
          className="w-full py-4 rounded-xl border-2 border-purple-500 text-purple-600 font-bold hover:bg-purple-50 transition-all"
        >
          Back to Home
        </motion.button>
      </motion.div>
    </motion.div>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50">
      {/* Progress Steps */}
      {currentStep <= 4 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-md"
        >
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center gap-3 ${
                      currentStep >= step.number ? 'text-purple-600' : 'text-gray-400'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                      currentStep >= step.number
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {currentStep > step.number ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <step.icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className="hidden sm:block font-semibold text-sm">{step.title}</span>
                  </motion.div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 sm:w-20 h-1 mx-2 rounded-full transition-all ${
                      currentStep > step.number
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                        : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {currentStep === 1 && <OrderSelectionStep key="step1" />}
          {currentStep === 2 && <ShippingStep key="step2" />}
          {currentStep === 3 && <PaymentStep key="step3" />}
          {currentStep === 4 && <ConfirmationStep key="step4" />}
          {currentStep === 5 && <SuccessStep key="step5" />}
        </AnimatePresence>
      </div>

      {/* Trust Badges */}
      {currentStep <= 4 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="max-w-4xl mx-auto px-4 py-8"
        >
          <div className="flex flex-wrap justify-center items-center gap-8 text-gray-500 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              <span>Free Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-600" />
              <span>1 Year Warranty</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-purple-600" />
              <span>24/7 Support</span>
            </div>
          </div>
        </motion.div>
      )}
    </main>
  );
};

export default GetDevice;
