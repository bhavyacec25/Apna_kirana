// data/seed.js
// Run with: node data/seed.js
// Wipes and repopulates the Firestore database with demo data.
// Requires Firebase credentials to already be set up (see backend/.env
// or backend/serviceAccountKey.json) — this will exit with a clear
// error if it can't authenticate.

import { getFirestore, insertRow } from "../db.js";

async function wipeCollection(name) {
  const db = getFirestore();
  const snapshot = await db.collection(name).get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function seed() {
  const collections = ["orders", "reviews", "wishlist", "products", "shops", "users", "counters"];
  for (const name of collections) {
    await wipeCollection(name);
  }

  const now = new Date().toISOString();

  // --- Users ---
  await insertRow("users", { id: "U0001", name: "Rahul Sharma", phone: "9876543210", role: "customer", address: "123, Model Town, Ludhiana", shopName: null, shopId: null, status: "active", createdAt: now });
  await insertRow("users", { id: "U0002", name: "Suresh Kirana Store", phone: "9998887776", role: "shopkeeper", address: "", shopName: "Suresh Kirana Store", shopId: "S001", status: "active", createdAt: now });
  await insertRow("users", { id: "U0003", name: "Platform Admin", phone: "8283833894", role: "admin", address: "", shopName: null, shopId: null, status: "active", createdAt: now });

  // --- Shops (real Ludhiana coordinates, used for the live tracking demo) ---
  await insertRow("shops", { id: "S001", name: "Suresh Kirana Store", area: "Model Town, Ludhiana", rating: 4.5, deliveryTime: "20-30 min", image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=60", ownerId: "U0002", status: "approved", latitude: 30.9010, longitude: 75.8573, createdAt: now });
  await insertRow("shops", { id: "S002", name: "Green Valley Fresh Mart", area: "Sarabha Nagar, Ludhiana", rating: 4.3, deliveryTime: "25-35 min", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60", ownerId: null, status: "approved", latitude: 30.8842, longitude: 75.8291, createdAt: now });

  // --- Products ---
  const products = [
    ["P001", "S001", "Amul Toned Milk", "500 ml", 27, "Dairy", "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=60", "2026-09-14"],
    ["P002", "S001", "Aashirvaad Atta", "5 kg", 245, "Staples", "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=60", null],
    ["P003", "S001", "Tata Salt", "1 kg", 25, "Staples", "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=500&auto=format&fit=crop&q=60", null],
    ["P004", "S001", "Fortune Sunflower Oil", "1 L", 149, "Staples", "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=60", "2026-12-31"],
    ["P005", "S001", "Britannia Daily Bread", "400 g", 45, "Bakery", "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=60", "2026-09-14"],
    ["P006", "S001", "Amul Butter", "100 g", 56, "Dairy", "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=500&auto=format&fit=crop&q=60", "2026-10-15"],
    ["P007", "S001", "Red Onion", "1 kg", 35, "Vegetables", "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&auto=format&fit=crop&q=60", "2026-09-22"],
    ["P008", "S001", "Potato", "1 kg", 28, "Vegetables", "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=60", "2026-09-25"],
    ["P009", "S002", "Fresh Farm Tomatoes", "1 kg", 40, "Vegetables", "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=60", "2026-09-15"],
    ["P010", "S002", "Fresh Banana Robusta", "1 dozen", 60, "Fruits", "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&auto=format&fit=crop&q=60", "2026-09-15"],
    ["P011", "S002", "Kashmir Apple", "1 kg", 180, "Fruits", "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=60", "2026-09-25"],
    ["P012", "S002", "Maggi 2-Min Noodles", "4 pack", 56, "Snacks", "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=500&auto=format&fit=crop&q=60", "2026-12-31"],
  ];
  for (const [id, shopId, name, unit, price, category, image, expiryDate] of products) {
    await insertRow("products", { id, shopId, name, unit, price, category, image, expiryDate, inStock: true });
  }

  console.log("✅ Seed complete:", { users: 3, shops: 2, products: products.length });
  console.log("Demo logins (OTP is 1234 in dev mode):");
  console.log("  Customer:   9876543210 (Rahul Sharma)");
  console.log("  Shopkeeper: 9998887776 (Suresh Kirana Store)");
  console.log("  Admin:      8283833894 (Platform Admin)");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
