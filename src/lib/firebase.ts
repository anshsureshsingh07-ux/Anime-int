import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBHaVRIMzYy2du_s2hCLmGlBsTFEtJ1DJc",
  authDomain: "anime-int.firebaseapp.com",
  projectId: "anime-int",
  storageBucket: "anime-int.firebasestorage.app",
  messagingSenderId: "685355500961",
  appId: "1:685355500961:web:a069250f614f5ee430f7e0",
  measurementId: "G-PZSC4WM727"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connection test disabled as per user request to not use Firestore yet
/*
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'system', 'health'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
*/
