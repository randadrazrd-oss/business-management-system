import { db, storage } from '../config/firebase';
import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

export const getChildren = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'children'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching children from Firestore:", error);
    throw error;
  }
};

export const getChild = async (id) => {
  try {
    const docSnap = await getDoc(doc(db, 'children', id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error("Error fetching child:", error);
    throw error;
  }
};

export const addChild = async (childData) => {
  try {
    if (!childData.name) throw new Error("Child name is required");

    const finalData = {
      ...childData,
      totalSessions: Number(childData.totalSessions) || 12,
      completedSessions: 0,
      improvementStatus: 'stable',
      attachments: [],
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'children'), finalData);
    return { id: docRef.id, ...finalData };
  } catch (error) {
    console.error("Failed to save child:", error);
    throw error;
  }
};

export const updateChildProgress = async (id, data) => {
  try {
    await updateDoc(doc(db, 'children', id), {
        ...data,
        updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Error updating progress:", err);
    throw err;
  }
};

export const deleteChild = async (id) => {
  try {
    await deleteDoc(doc(db, 'children', id));
  } catch (err) {
    console.error("Error deleting child:", err);
    throw err;
  }
};

export const cleanupUnnamedChildren = async () => {
  try {
    const q = query(collection(db, 'children'));
    const snapshot = await getDocs(q);
    let count = 0;
    
    for (const d of snapshot.docs) {
      const data = d.data();
      if (!data.name || data.name.trim() === "" || data.name.toLowerCase() === "unnamed") {
        await deleteDoc(doc(db, 'children', d.id));
        count++;
      }
    }
    return { deleted: count };
  } catch (err) {
    console.error("Cleanup failed:", err);
    throw err;
  }
};

// --- Storage Functions ---

export const uploadChildDocument = async (childId, file, onProgress) => {
  if (!file) throw new Error('No file provided');
  
  // Format safe filename
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
  const filePath = `children/${childId}/documents/${timestamp}_${safeName}`;
  const storageRef = ref(storage, filePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        console.error("Upload error:", error);
        reject(error);
      },
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        const attachmentData = {
          name: file.name,
          url: downloadUrl,
          path: filePath,
          sizeBytes: file.size,
          uploadedAt: new Date().toISOString()
        };
        
        // Push attachment meta to firestore document
        await updateDoc(doc(db, 'children', childId), {
           attachments: arrayUnion(attachmentData)
        });
        
        resolve(attachmentData);
      }
    );
  });
};

export const deleteChildDocument = async (childId, attachmentObj) => {
  try {
    const storageRef = ref(storage, attachmentObj.path);
    await deleteObject(storageRef);
    
    // Remove from child doc array
    await updateDoc(doc(db, 'children', childId), {
       attachments: arrayRemove(attachmentObj)
    });
  } catch (err) {
    console.error("Error deleting document:", err);
    throw err;
  }
};
