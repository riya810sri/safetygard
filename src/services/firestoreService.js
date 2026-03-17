import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  increment,
  onSnapshot,
  orderBy,
  limit
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

// Create user profile on signup
export const createUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log("User profile created ✅");
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
};

// Get user profile
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      // Create default profile if doesn't exist
      const defaultProfile = {
        name: 'User',
        email: '',
        safetyScore: 100,
        emergencyContacts: [],
      };
      await setDoc(userRef, defaultProfile);
      return defaultProfile;
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
    return { safetyScore: 100, emergencyContacts: [] };
  }
};

// Update user profile
export const updateUserProfile = async (userId, data) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    console.log("User profile updated ✅");
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

// Add emergency contact
export const addEmergencyContact = async (userId, contact) => {
  try {
    const contactsRef = collection(db, "users", userId, "contacts");
    await addDoc(contactsRef, {
      ...contact,
      createdAt: serverTimestamp()
    });
    console.log("Emergency contact added ✅");
  } catch (error) {
    console.error("Error adding emergency contact:", error);
    throw error;
  }
};

// Get emergency contacts
export const getEmergencyContacts = async (userId) => {
  try {
    const contactsRef = collection(db, "users", userId, "contacts");
    const querySnapshot = await getDocs(contactsRef);
    
    const contacts = [];
    querySnapshot.forEach((doc) => {
      contacts.push({ id: doc.id, ...doc.data() });
    });
    
    return contacts;
  } catch (error) {
    console.error("Error getting emergency contacts:", error);
    return [];
  }
};

// Add SOS alert/incident
export const addSOSAlert = async (userId, alertData) => {
  try {
    // Save to user's incidents (for user history)
    const incidentsRef = collection(db, "users", userId, "incidents");
    await addDoc(incidentsRef, {
      ...alertData,
      type: 'sos',
      createdAt: serverTimestamp()
    });
    
    // Also save to global SOS alerts collection (for public map and web dashboard)
    const globalSosRef = collection(db, "sos_alerts");
    await addDoc(globalSosRef, {
      userId: userId,
      message: alertData.message,
      location: alertData.location,
      timestamp: alertData.timestamp || new Date().toISOString(),
      status: alertData.status || 'active',
      contactsNotified: alertData.contactsNotified || 0,
      createdAt: serverTimestamp()
    });
    
    console.log("SOS alert saved to user incidents and global collection ✅");
  } catch (error) {
    console.error("Error adding SOS alert:", error);
    throw error;
  }
};

// Get user incidents/history
export const getUserIncidents = async (userId) => {
  try {
    const incidentsRef = collection(db, "users", userId, "incidents");
    const querySnapshot = await getDocs(incidentsRef);
    
    const incidents = [];
    querySnapshot.forEach((doc) => {
      incidents.push({ id: doc.id, ...doc.data() });
    });
    
    return incidents.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error("Error getting incidents:", error);
    return [];
  }
};

// Add location share
export const addLocationShare = async (userId, locationData) => {
  try {
    const locationsRef = collection(db, "users", userId, "locations");
    await addDoc(locationsRef, {
      ...locationData,
      createdAt: serverTimestamp()
    });
    console.log("Location shared ✅");
  } catch (error) {
    console.error("Error sharing location:", error);
    throw error;
  }
};

// Get user locations
export const getUserLocations = async (userId) => {
  try {
    const locationsRef = collection(db, "users", userId, "locations");
    const querySnapshot = await getDocs(locationsRef);
    
    const locations = [];
    querySnapshot.forEach((doc) => {
      locations.push({ id: doc.id, ...doc.data() });
    });
    
    return locations;
  } catch (error) {
    console.error("Error getting locations:", error);
    return [];
  }
};

// Get user stats
export const getUserStats = async (userId) => {
  try {
    const contacts = await getEmergencyContacts(userId);
    const incidents = await getUserIncidents(userId);
    const locations = await getUserLocations(userId);
    
    return {
      totalContacts: contacts.length,
      totalIncidents: incidents.length,
      totalLocations: locations.length,
      recentIncidents: incidents.slice(0, 5)
    };
  } catch (error) {
    console.error("Error getting stats:", error);
    return {
      totalContacts: 0,
      totalIncidents: 0,
      totalLocations: 0,
      recentIncidents: []
    };
  }
};

// Upload profile photo
export const uploadProfilePhoto = async (userId, file) => {
  try {
    if (!file) return null;
    
    // Create unique filename
    const filename = `${userId}_${Date.now()}`;
    const storageRef = ref(storage, `profilePictures/${userId}/${filename}`);
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Update user profile with photo URL
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      photoURL: downloadURL,
      updatedAt: serverTimestamp()
    });
    
    console.log("Profile photo uploaded ✅");
    return downloadURL;
  } catch (error) {
    console.error("Error uploading profile photo:", error);
    throw error;
  }
};

// Get user profile with photo
export const getUserProfileWithPhoto = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        ...data,
        photoURL: data.photoURL || null
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

// Create community post
export const createCommunityPost = async (userId, postData) => {
  try {
    const postsRef = collection(db, "community");
    const post = {
      ...postData,
      authorId: userId,
      createdAt: serverTimestamp(),
      likes: 0,
      comments: 0
    };
    await addDoc(postsRef, post);
    console.log("Community post created ✅");
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
};

// Get community posts
export const getCommunityPosts = async () => {
  try {
    const postsRef = collection(db, "community");
    const q = query(postsRef);
    const querySnapshot = await getDocs(q);
    
    const posts = [];
    querySnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    
    return posts.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error("Error getting posts:", error);
    return [];
  }
};

// Like post
export const likePost = async (postId) => {
  try {
    const postRef = doc(db, "community", postId);
    await updateDoc(postRef, {
      likes: increment(1)
    });
    console.log("Post liked ✅");
  } catch (error) {
    console.error("Error liking post:", error);
    throw error;
  }
};

// Subscribe to global SOS alerts in real-time
export const subscribeToGlobalSOSAlerts = (callback, limitCount = 20) => {
  try {
    const sosRef = collection(db, "sos_alerts");
    const q = query(sosRef, orderBy("createdAt", "desc"), limit(limitCount));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alerts = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        alerts.push({
          id: doc.id,
          userId: data.userId,
          message: data.message || 'Emergency Alert',
          location: data.location,
          timestamp: data.timestamp || data.createdAt?.toDate(),
          status: data.status || 'active',
          contactsNotified: data.contactsNotified || 0
        });
      });
      callback(alerts);
    }, (error) => {
      console.error("Error subscribing to SOS alerts:", error);
      callback([]);
    });

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up SOS subscription:", error);
    return () => {};
  }
};
