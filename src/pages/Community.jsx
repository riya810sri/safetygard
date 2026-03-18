import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquare,
  Heart,
  Share2,
  Award,
  Shield,
  Star,
  TrendingUp,
  Plus,
  X,
  CheckCircle
} from 'lucide-react';
import { useState } from 'react';

const Community = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'tips'
  });

  const discussions = [
    { id: 1, title: 'Best safety practices for late night travel?', author: 'Priya S.', replies: 45, likes: 128, category: 'tips', pinned: true },
    { id: 2, title: 'How to use the SOS feature effectively?', author: 'Rahul M.', replies: 32, likes: 95, category: 'help', pinned: true },
    { id: 3, title: 'Community meet-up in Delhi this weekend', author: 'Amit K.', replies: 67, likes: 234, category: 'event', pinned: false },
    { id: 4, title: 'Success story: Suraksha helped me reach home safely', author: 'Neha G.', replies: 89, likes: 456, category: 'story', pinned: false },
    { id: 5, title: 'New features request: Voice-activated SOS', author: 'Karan P.', replies: 23, likes: 78, category: 'feedback', pinned: false },
  ];

  const topRiders = [
    { id: 1, name: 'Rajesh Kumar', company: 'Uber', rating: 4.97, trips: '5,234', badge: 'Platinum', image: 'https://i.pravatar.cc/150?img=11', specialty: 'Night Safety Expert', verified: true, years: 5 },
    { id: 2, name: 'Amit Sharma', company: 'Rapido', rating: 4.94, trips: '3,891', badge: 'Gold', image: 'https://i.pravatar.cc/150?img=12', specialty: 'Route Knowledge', verified: true, years: 3 },
    { id: 3, name: 'Suresh Yadav', company: 'Swiggy', rating: 4.91, trips: '8,456', badge: 'Gold', image: 'https://i.pravatar.cc/150?img=13', specialty: 'Fast & Safe Delivery', verified: true, years: 4 },
    { id: 4, name: 'Mohd. Irfan', company: 'Zomato', rating: 4.93, trips: '4,123', badge: 'Gold', image: 'https://i.pravatar.cc/150?img=14', specialty: 'Area Expert', verified: true, years: 3 },
    { id: 5, name: 'Vikram Singh', company: 'Ola', rating: 4.89, trips: '6,789', badge: 'Silver', image: '/boy2.jpg', specialty: 'Women Safety Champion', verified: true, years: 6 },
    { id: 6, name: 'Arjun Reddy', company: 'Uber', rating: 4.96, trips: '4,567', badge: 'Platinum', image: '/boy1.avif', specialty: 'Emergency Response', verified: true, years: 4 },
    { id: 7, name: 'Karan Patel', company: 'Rapido', rating: 4.88, trips: '2,345', badge: 'Silver', image: 'https://i.pravatar.cc/150?img=17', specialty: 'Safe Driving', verified: true, years: 2 },
    { id: 8, name: 'Rahul Verma', company: 'Swiggy', rating: 4.95, trips: '7,890', badge: 'Gold', image: 'https://i.pravatar.cc/150?img=18', specialty: 'Night Delivery Expert', verified: true, years: 5 },
  ];

  const studentVolunteers = [
    { id: 1, name: 'Ananya Gupta', college: 'IIT Delhi', rating: 4.98, hoursVolunteered: 156, badge: 'Gold', image: 'https://i.pravatar.cc/150?img=5', specialty: 'Campus Safety Lead', verified: true, year: 3 },
    { id: 2, name: 'Priya Menon', college: 'DU - LSR', rating: 4.95, hoursVolunteered: 203, badge: 'Platinum', image: 'https://i.pravatar.cc/150?img=9', specialty: 'Night Escort Volunteer', verified: true, year: 2 },
    { id: 3, name: 'Sneha Reddy', college: 'IIIT Hyderabad', rating: 4.92, hoursVolunteered: 128, badge: 'Gold', image: 'https://i.pravatar.cc/150?img=10', specialty: 'Self-Defense Trainer', verified: true, year: 4 },
    { id: 4, name: 'Kavya Nair', college: 'NIT Trichy', rating: 4.89, hoursVolunteered: 95, badge: 'Silver', image: 'https://i.pravatar.cc/150?img=20', specialty: 'First Aid Certified', verified: true, year: 2 },
    { id: 5, name: 'Aditi Sharma', college: 'BITS Pilani', rating: 4.96, hoursVolunteered: 178, badge: 'Platinum', image: 'https://i.pravatar.cc/150?img=24', specialty: 'Mental Health Advocate', verified: true, year: 3 },
    { id: 6, name: 'Riya Patel', college: 'VIT Vellore', rating: 4.91, hoursVolunteered: 142, badge: 'Gold', image: 'https://i.pravatar.cc/150?img=25', specialty: 'Awareness Campaign Lead', verified: true, year: 3 },
    { id: 7, name: 'Ishita Singh', college: 'JNU', rating: 4.87, hoursVolunteered: 89, badge: 'Silver', image: 'https://i.pravatar.cc/150?img=26', specialty: 'Legal Aid Volunteer', verified: true, year: 4 },
    { id: 8, name: 'Meera Iyer', college: 'Christ University', rating: 4.94, hoursVolunteered: 167, badge: 'Gold', image: 'https://i.pravatar.cc/150?img=28', specialty: 'Peer Counselor', verified: true, year: 2 },
  ];

  const categories = [
    { id: 'all', label: 'All Posts' },
    { id: 'tips', label: 'Safety Tips' },
    { id: 'help', label: 'Help & Support' },
    { id: 'event', label: 'Events' },
    { id: 'story', label: 'Success Stories' },
    { id: 'feedback', label: 'Feedback' },
  ];

  const handleCreatePost = (e) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) {
      alert('Please fill in all fields');
      return;
    }
    alert('Post created successfully! ✅ (Demo mode)');
    setShowCreatePost(false);
    setNewPost({ title: '', content: '', category: 'tips' });
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Community Hub
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Connect with volunteers, share experiences, and learn from the community
          </p>
        </motion.div>

        {/* Top Rated Riders Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                🏆 Top Rated Riders
              </h2>
              <p className="text-gray-600 mt-1">Verified safe drivers from Uber, Ola, Rapido, Swiggy & Zomato</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {topRiders.map((rider, index) => (
              <motion.div
                key={rider.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-white rounded-2xl shadow-lg p-5 border-2 border-transparent hover:border-primary-200 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="relative">
                    <img
                      src={rider.image}
                      alt={rider.name}
                      className="w-16 h-16 rounded-full object-cover border-3 border-primary-100"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow">
                      {rider.badge === 'Platinum' && (
                        <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                          <Star className="w-3 h-3 text-white fill-white" />
                        </div>
                      )}
                      {rider.badge === 'Gold' && (
                        <div className="w-6 h-6 bg-gradient-to-br from-amber-300 to-amber-500 rounded-full flex items-center justify-center">
                          <Star className="w-3 h-3 text-white fill-white" />
                        </div>
                      )}
                      {rider.badge === 'Silver' && (
                        <div className="w-6 h-6 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center">
                          <Star className="w-3 h-3 text-white fill-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 bg-green-50 px-2 py-1 rounded-full">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-bold text-green-700">{rider.rating}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center">
                  {rider.name}
                  {rider.verified && (
                    <CheckCircle className="w-4 h-4 text-blue-500 ml-1.5" />
                  )}
                </h3>

                <div className="flex items-center space-x-2 mb-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    rider.company === 'Uber' ? 'bg-black text-white' :
                    rider.company === 'Ola' ? 'bg-blue-100 text-blue-700' :
                    rider.company === 'Rapido' ? 'bg-yellow-100 text-yellow-800' :
                    rider.company === 'Swiggy' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {rider.company}
                  </span>
                  <span className="text-xs text-gray-500">{rider.trips} trips</span>
                </div>

                <p className="text-sm text-gray-600 mb-3">{rider.specialty}</p>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Experience</span>
                    <span className="text-xs font-bold text-gray-700">{rider.years} yrs</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-green-600" />
                    <span className="text-sm font-bold text-green-600">98%</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Student Volunteers Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                🎓 Student Volunteers
              </h2>
              <p className="text-gray-600 mt-1">Campus safety champions from top colleges across India</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {studentVolunteers.map((volunteer, index) => (
              <motion.div
                key={volunteer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="bg-white rounded-2xl shadow-lg p-5 border-2 border-transparent hover:border-purple-200 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="relative">
                    <img
                      src={volunteer.image}
                      alt={volunteer.name}
                      className="w-16 h-16 rounded-full object-cover border-3 border-purple-100"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow">
                      {volunteer.badge === 'Platinum' && (
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                          <Star className="w-3 h-3 text-white fill-white" />
                        </div>
                      )}
                      {volunteer.badge === 'Gold' && (
                        <div className="w-6 h-6 bg-gradient-to-br from-amber-300 to-amber-500 rounded-full flex items-center justify-center">
                          <Star className="w-3 h-3 text-white fill-white" />
                        </div>
                      )}
                      {volunteer.badge === 'Silver' && (
                        <div className="w-6 h-6 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center">
                          <Star className="w-3 h-3 text-white fill-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 bg-purple-50 px-2 py-1 rounded-full">
                    <Star className="w-4 h-4 text-purple-500 fill-purple-500" />
                    <span className="text-sm font-bold text-purple-700">{volunteer.rating}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center">
                  {volunteer.name}
                  {volunteer.verified && (
                    <CheckCircle className="w-4 h-4 text-blue-500 ml-1.5" />
                  )}
                </h3>

                <div className="flex items-center space-x-2 mb-2">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                    {volunteer.college}
                  </span>
                  <span className="text-xs text-gray-500">Year {volunteer.year}</span>
                </div>

                <p className="text-sm text-gray-600 mb-3">{volunteer.specialty}</p>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <Heart className="w-3 h-3 text-purple-600" />
                    <span className="text-xs font-bold text-purple-700">{volunteer.hoursVolunteered} hrs</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-green-600" />
                    <span className="text-sm font-bold text-green-600">Verified</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Search and Filter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-4"
            >
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search discussions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreatePost(true)}
                  className="flex items-center justify-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-all shadow-md"
                >
                  <Plus className="h-5 w-5" />
                  <span>New Post</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Category Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex gap-2 overflow-x-auto pb-2"
            >
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-300 ${
                    activeTab === category.id
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </motion.div>

            {/* Discussions List */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {discussions.filter(d => {
                const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesCategory = activeTab === 'all' || d.category === activeTab;
                return matchesSearch && matchesCategory;
              }).map((discussion, index) => (
                <motion.div
                  key={discussion.id}
                  variants={itemVariants}
                  whileHover={{ y: -3, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  className="bg-white rounded-xl shadow-lg p-6 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {discussion.pinned && (
                        <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full flex items-center space-x-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>Pinned</span>
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        discussion.category === 'tips' ? 'bg-green-100 text-green-700' :
                        discussion.category === 'help' ? 'bg-blue-100 text-blue-700' :
                        discussion.category === 'event' ? 'bg-purple-100 text-purple-700' :
                        discussion.category === 'story' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {discussion.category}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2 hover:text-primary-600 transition-colors">
                    {discussion.title}
                  </h3>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full" />
                      <span className="text-sm text-gray-600">by {discussion.author}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{discussion.replies}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Heart className="h-4 w-4" />
                        <span>{discussion.likes}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-6"
          >
            {/* Safety Tips */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Award className="h-5 w-5 text-primary-600" />
                <span>Quick Safety Tips</span>
              </h3>
              <ul className="space-y-3">
                {[
                  'Always share your live location with trusted contacts',
                  'Keep emergency numbers on speed dial',
                  'Trust your instincts - if something feels wrong, leave',
                  'Use well-lit and populated routes at night',
                ].map((tip, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-2 text-sm text-gray-600"
                  >
                    <div className="w-5 h-5 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary-600 text-xs font-bold">{index + 1}</span>
                    </div>
                    <span>{tip}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Become a Volunteer */}
            <motion.div
              whileHover={{ y: -5 }}
              className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl shadow-lg p-6 text-white"
            >
              <Shield className="h-12 w-12 mb-4" />
              <h3 className="text-xl font-bold mb-2">Become a Volunteer</h3>
              <p className="text-primary-100 mb-4">
                Join our community of safety champions and help make a difference.
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full bg-white text-primary-600 font-semibold py-3 rounded-lg hover:bg-primary-50 transition-colors"
              >
                Apply Now
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreatePost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreatePost(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                  <MessageSquare className="h-6 w-6 text-primary-600" />
                  <span>Create New Post</span>
                </h3>
                <button
                  onClick={() => setShowCreatePost(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    placeholder="What's on your mind?"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newPost.category}
                    onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="tips">Safety Tips</option>
                    <option value="help">Help & Support</option>
                    <option value="event">Events</option>
                    <option value="story">Success Stories</option>
                    <option value="feedback">Feedback</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    placeholder="Share your thoughts, experiences, or questions..."
                    rows="5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all resize-none"
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCreatePost(false)}
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
                    Post
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default Community;
