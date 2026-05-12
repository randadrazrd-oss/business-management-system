import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { getUserProfile } from '../services/userService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // role, displayName, specialistId, etc.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        return onAuthStateChanged(auth, async (user) => {
          setCurrentUser(user);
          if (user) {
            try {
              const profile = await getUserProfile(user.uid);
              setUserProfile(profile);
            } catch (err) {
              console.error('Failed to load user profile:', err);
              setUserProfile(null);
            }
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        });
      })
      .catch((error) => {
        console.error("Auth persistence error:", error);
        setLoading(false);
      });
  }, []);

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    // Load user profile immediately after login
    try {
      const profile = await getUserProfile(credential.user.uid);
      if (profile && !profile.active) {
        await signOut(auth);
        throw new Error('ACCOUNT_DEACTIVATED');
      }
      setUserProfile(profile);
    } catch (err) {
      if (err.message === 'ACCOUNT_DEACTIVATED') throw err;
      console.error('Profile load error:', err);
    }
    return credential;
  };

  const logout = () => {
    setUserProfile(null);
    return signOut(auth);
  };

  // Convenience getters
  const userRole = userProfile?.role || null;
  const isAdmin = userRole === 'admin';
  const isSecretary = userRole === 'secretary';
  const isSpecialist = userRole === 'specialist';

  const value = {
    currentUser,
    userProfile,
    userRole,
    isAdmin,
    isSecretary,
    isSpecialist,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
