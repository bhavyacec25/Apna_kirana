// services/addressService.js
// Saved delivery addresses (Home/Work/Other), stored per-device under
// ONE localStorage key. This is legitimately client-side data (like
// browser-saved autofill), not something that needs to be shared
// across devices, so it doesn't need a backend table for this scope.

const ADDRESS_KEY = "apnakirana_addresses";

export function getAddresses() {
  try {
    const raw = localStorage.getItem(ADDRESS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveAddress({ label, text, lat, lng }) {
  const list = getAddresses();
  const newAddress = { id: `addr_${Date.now()}`, label: label || "Other", text, lat: lat ?? null, lng: lng ?? null };
  list.push(newAddress);
  localStorage.setItem(ADDRESS_KEY, JSON.stringify(list));
  return newAddress;
}

export function deleteAddress(id) {
  const list = getAddresses().filter((a) => a.id !== id);
  localStorage.setItem(ADDRESS_KEY, JSON.stringify(list));
  return list;
}
