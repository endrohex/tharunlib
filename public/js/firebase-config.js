/**
 * Firebase Client Configuration (Firebase Web SDK)
 * Used ONLY for Library Administrator Authentication
 */
const firebaseConfig = {
  apiKey: "AIzaSyCl6fgf9HR0s0GVimLYU40tRARa607VzpI",
  authDomain: "library-6fe26.firebaseapp.com",
  projectId: "library-6fe26",
  storageBucket: "library-6fe26.firebasestorage.app",
  messagingSenderId: "619549666869",
  appId: "1:619549666869:web:3a124c3a509f4690594b7c"
};

// Initialize Firebase if not already initialized
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
