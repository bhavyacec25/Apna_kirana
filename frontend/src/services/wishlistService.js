// services/wishlistService.js
import { api } from "./api";

export async function getWishlist() {
  const { items } = await api.get("/wishlist");
  return items;
}

export async function addToWishlist(productId) {
  return api.post("/wishlist", { productId });
}

export async function removeFromWishlist(productId) {
  return api.del(`/wishlist/${productId}`);
}
