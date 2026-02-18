import * as admin from "firebase-admin";

let initialized = false;

export function initializeFirebase(): void {
  if (initialized) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    console.log("Firebase Admin SDK initialized");
  } else {
    console.warn(
      "Firebase credentials not configured. Running in mock mode."
    );
  }

  initialized = true;
}

export function isFirebaseConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

export function getDb(): FirebaseFirestore.Firestore {
  return admin.firestore();
}

export function getBucket(): any {
  return admin.storage().bucket();
}
