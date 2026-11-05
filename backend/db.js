// db.js
// Firebase Firestore database (via firebase-admin) with resilient persistent local store
// fallback if serviceAccountKey.json is still pending generation in Firebase Console.

import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadServiceAccount() {
  const keyPath = path.join(__dirname, "serviceAccountKey.json");
  if (fs.existsSync(keyPath)) {
    try {
      return JSON.parse(fs.readFileSync(keyPath, "utf-8"));
    } catch (err) {
      console.warn("⚠️ Could not parse backend/serviceAccountKey.json:", err.message);
    }
  }

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  return null;
}

const serviceAccount = loadServiceAccount();
let firestoreDb = null;
let isFirebaseActive = false;

if (serviceAccount) {
  try {
    const adminConfig = {
      credential: admin.credential.cert(serviceAccount),
    };
    if (process.env.FIREBASE_DATABASE_URL) {
      adminConfig.databaseURL = process.env.FIREBASE_DATABASE_URL;
    }
    if (process.env.FIREBASE_STORAGE_BUCKET) {
      adminConfig.storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
    }

    admin.initializeApp(adminConfig);
    firestoreDb = admin.firestore();
    isFirebaseActive = true;
    console.log(`🔥 Connected to Firebase project "${serviceAccount.projectId}" (Firestore active).`);
  } catch (err) {
    console.warn(`⚠️ Firebase Admin initialization failed (${err.message}). Using local store fallback.`);
  }
} else {
  console.log(
    "\n💡 Firebase Web Config active. (Service Account key backend/serviceAccountKey.json can be added for Admin Firestore).\n" +
    "   Running with persistent local datastore so server starts immediately without errors.\n"
  );
}

const COLLECTION_MAP = {
  users: "users",
  shops: "shops",
  products: "products",
  orders: "orders",
  reviews: "reviews",
  wishlist: "wishlist",
  counters: "counters",
  legal: "legal",
};

// --- Resilient Local Datastore Fallback ---
const STORE_DIR = path.join(__dirname, "data");
const STORE_FILE = path.join(STORE_DIR, "store.json");

function getInitialStore() {
  const now = new Date().toISOString();
  return {
    users: [
      { id: "U0001", name: "Rahul Sharma", phone: "9876543210", email: "customer@apnakirana.com", role: "customer", address: "123, Model Town, Ludhiana", shopName: null, shopId: null, status: "active", createdAt: now },
      { id: "U0002", name: "Suresh Kumar", phone: "9998887776", email: "suresh@apnakirana.com", role: "shopkeeper", address: "Shop 4, Model Town, Ludhiana", shopName: "Suresh Kirana Store", shopId: "S001", status: "active", createdAt: now },
      { id: "U0003", name: "Platform Admin", phone: "8283833894", email: "admin@apnakirana.com", role: "admin", address: "", shopName: null, shopId: null, status: "active", createdAt: now },
    ],
    shops: [
      {
        id: "S001",
        name: "Suresh Kirana Store",
        area: "Model Town, Ludhiana",
        rating: 4.5,
        deliveryTime: "20-30 min",
        image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=60",
        ownerId: "U0002",
        status: "approved",
        latitude: 30.9010,
        longitude: 75.8573,
        createdAt: now,
        legal: {
          gstin: "03AAAAA0000A1Z5",
          fssaiNumber: "12345678901234",
          panNumber: "AAAAA0000A",
          tradeLicense: "TL/LUD/2026/8941",
          status: "verified",
          bankDetails: {
            bankName: "State Bank of India",
            accountNumber: "98765432101",
            ifsc: "SBIN0001234",
            accountHolder: "Suresh Kumar",
          },
          verifiedAt: now,
        }
      },
      {
        id: "S002",
        name: "Green Valley Fresh Mart",
        area: "Sarabha Nagar, Ludhiana",
        rating: 4.3,
        deliveryTime: "25-35 min",
        image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60",
        ownerId: null,
        status: "approved",
        latitude: 30.8842,
        longitude: 75.8291,
        createdAt: now,
        legal: {
          status: "pending",
        }
      },
    ],
    products: [
      { id: "P001", shopId: "S001", name: "Amul Toned Milk", unit: "500 ml", price: 27, category: "Dairy", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=60", expiryDate: "2026-09-14", inStock: true },
      { id: "P002", shopId: "S001", name: "Aashirvaad Atta", unit: "5 kg", price: 245, category: "Staples", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=60", expiryDate: null, inStock: true },
      { id: "P003", shopId: "S001", name: "Tata Salt", unit: "1 kg", price: 25, category: "Staples", image: "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=500&auto=format&fit=crop&q=60", expiryDate: null, inStock: true },
      { id: "P004", shopId: "S001", name: "Fortune Sunflower Oil", unit: "1 L", price: 149, category: "Staples", image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=60", expiryDate: "2026-12-31", inStock: true },
      { id: "P005", shopId: "S001", name: "Britannia Daily Bread", unit: "400 g", price: 45, category: "Bakery", image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=60", expiryDate: "2026-09-14", inStock: true },
      { id: "P006", shopId: "S001", name: "Amul Butter", unit: "100 g", price: 56, category: "Dairy", image: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&auto=format&fit=crop&q=60", expiryDate: "2026-10-15", inStock: true },
      { id: "P007", shopId: "S001", name: "Red Onion", unit: "1 kg", price: 35, category: "Vegetables", image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&auto=format&fit=crop&q=60", expiryDate: "2026-09-22", inStock: true },
      { id: "P008", shopId: "S001", name: "Potato", unit: "1 kg", price: 28, category: "Vegetables", image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=60", expiryDate: "2026-09-25", inStock: true },
      { id: "P009", shopId: "S002", name: "Fresh Farm Tomatoes", unit: "1 kg", price: 40, category: "Vegetables", image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=60", expiryDate: "2026-09-15", inStock: true },
      { id: "P010", shopId: "S002", name: "Fresh Banana Robusta", unit: "1 dozen", price: 60, category: "Fruits", image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&auto=format&fit=crop&q=60", expiryDate: "2026-09-15", inStock: true },
      { id: "P011", shopId: "S002", name: "Kashmir Apple", unit: "1 kg", price: 180, category: "Fruits", image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=60", expiryDate: "2026-09-25", inStock: true },
      { id: "P012", shopId: "S002", name: "Maggi 2-Min Noodles", unit: "4 pack", price: 56, category: "Snacks", image: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=60", expiryDate: "2026-12-31", inStock: true },
    ],
    orders: [],
    reviews: [],
    wishlist: [],
    counters: { S: 2, P: 12, U: 3, ORD: 0 },
    legal: [],
  };
}

function readStore() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_FILE)) {
    const initial = getInitialStore();
    fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), "utf-8");
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
  } catch (err) {
    console.error("Error reading store file:", err.message);
    return getInitialStore();
  }
}

function writeStore(data) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing store file:", err.message);
  }
}

export async function initSchema() {
  return true;
}

export async function getAll(collection, where = {}) {
  if (isFirebaseActive && firestoreDb) {
    const colName = COLLECTION_MAP[collection];
    if (!colName) throw new Error(`Unknown collection: ${collection}`);
    let ref = firestoreDb.collection(colName);
    for (const [key, value] of Object.entries(where)) {
      ref = ref.where(key, "==", value);
    }
    const snapshot = await ref.get();
    return snapshot.docs.map((doc) => doc.data());
  }

  // Local persistent datastore
  const store = readStore();
  const list = store[collection] || [];
  return list.filter((item) => {
    for (const [key, val] of Object.entries(where)) {
      if (item[key] !== val) return false;
    }
    return true;
  });
}

export async function getOne(collection, where = {}) {
  const rows = await getAll(collection, where);
  return rows[0] || null;
}

export async function insertRow(collection, row) {
  if (isFirebaseActive && firestoreDb) {
    const colName = COLLECTION_MAP[collection];
    await firestoreDb.collection(colName).doc(row.id).set(row);
    return row;
  }

  const store = readStore();
  if (!store[collection]) store[collection] = [];
  store[collection].push(row);
  writeStore(store);
  return row;
}

export async function updateRow(collection, id, patch) {
  if (isFirebaseActive && firestoreDb) {
    const colName = COLLECTION_MAP[collection];
    await firestoreDb.collection(colName).doc(id).set(patch, { merge: true });
    return getOne(collection, { id });
  }

  const store = readStore();
  const items = store[collection] || [];
  const idx = items.findIndex((it) => it.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...patch };
  store[collection] = items;
  writeStore(store);
  return items[idx];
}

export async function deleteRow(collection, id) {
  if (isFirebaseActive && firestoreDb) {
    const colName = COLLECTION_MAP[collection];
    const docRef = firestoreDb.collection(colName).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return false;
    await docRef.delete();
    return true;
  }

  const store = readStore();
  const items = store[collection] || [];
  const newItems = items.filter((it) => it.id !== id);
  if (newItems.length === items.length) return false;
  store[collection] = newItems;
  writeStore(store);
  return true;
}

export async function getNextId(prefix) {
  if (isFirebaseActive && firestoreDb) {
    const counterRef = firestoreDb.collection("counters").doc(prefix);
    const next = await firestoreDb.runTransaction(async (tx) => {
      const doc = await tx.get(counterRef);
      const current = doc.exists ? doc.data().value : 0;
      const value = current + 1;
      tx.set(counterRef, { value });
      return value;
    });
    return `${prefix}${String(next).padStart(4, "0")}`;
  }

  const store = readStore();
  if (!store.counters) store.counters = {};
  const current = typeof store.counters[prefix] === "number" ? store.counters[prefix] : 0;
  const next = current + 1;
  store.counters[prefix] = next;
  writeStore(store);
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export function getFirestore() {
  return firestoreDb;
}

export function getAdminAuth() {
  if (isFirebaseActive) {
    return admin.auth();
  }
  return null;
}
