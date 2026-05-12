import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth, secondaryAuth } from '../config/firebase';

/**
 * Create a Firebase Auth account + Firestore user profile
 * Uses secondary auth instance to avoid signing out the admin
 */
export const createUserAccount = async ({ email, password, displayName, role, specialistId = null, secretaryId = null, specialistSubRole = null }) => {
  // Create Firebase Auth account using the secondary app
  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  const uid = credential.user.uid;

  // Sign the secondary auth out immediately (it's only used for creation)
  await signOut(secondaryAuth);

  // Create Firestore user profile
  const profileData = {
    uid,
    email,
    displayName,
    role, // 'admin' | 'secretary' | 'specialist'
    active: true,
    createdAt: serverTimestamp(),
    ...(specialistId && { specialistId }),
    ...(secretaryId && { secretaryId }),
    ...(specialistSubRole && { specialistSubRole }) // 'trainee' | 'employee'
  };

  await setDoc(doc(db, 'users', uid), profileData);
  return { uid, ...profileData };
};

/**
 * Fetch a single user profile from Firestore by UID
 */
export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  return null;
};

/**
 * Fetch all user profiles (admin only)
 */
export const getAllUsers = async () => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/**
 * Update a user's Firestore profile
 */
export const updateUserProfile = async (uid, data) => {
  await updateDoc(doc(db, 'users', uid), data);
};

/**
 * Soft-deactivate a user (does not delete Firebase Auth account)
 */
export const deactivateUser = async (uid) => {
  await updateDoc(doc(db, 'users', uid), { active: false });
};

/**
 * Reactivate a previously deactivated user
 */
export const reactivateUser = async (uid) => {
  await updateDoc(doc(db, 'users', uid), { active: true });
};

/**
 * Seed the first admin account. 
 * Call this once if no admin exists.
 */
export const seedAdminAccount = async ({ email, password, displayName }) => {
  // Check if any admin already exists
  const q = query(collection(db, 'users'), where('role', '==', 'admin'));
  const snap = await getDocs(q);
  if (!snap.empty) {
    throw new Error('An admin account already exists.');
  }

  // Create admin account using primary auth
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;

  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    displayName: displayName || 'System Admin',
    role: 'admin',
    active: true,
    createdAt: serverTimestamp()
  });

  return uid;
};

/**
 * Send password reset email
 */
export const resetUserPassword = async (email) => {
  await sendPasswordResetEmail(auth, email);
};
