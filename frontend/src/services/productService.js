// services/productService.js
import { api } from "./api";

export async function getShopProducts(shopId) {
  const { products } = await api.get(`/products?shopId=${shopId}`);
  return products;
}

export async function createProduct(product) {
  const { product: created } = await api.post("/products", product);
  return created;
}

export async function updateProduct(id, patch) {
  const { product } = await api.patch(`/products/${id}`, patch);
  return product;
}

export async function deleteProduct(id) {
  return api.del(`/products/${id}`);
}

// Image upload is multipart/form-data, so it bypasses the JSON-only
// api.js wrapper and builds its own fetch call with the auth header.
export async function uploadProductImage(id, file) {
  const token = localStorage.getItem("apnakirana_token");
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`/api/products/${id}/image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Image upload failed.");
  return data.product;
}
