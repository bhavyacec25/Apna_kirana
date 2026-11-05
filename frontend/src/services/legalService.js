// services/legalService.js
import { api, getToken } from "./api";

export async function getShopDetails(shopId) {
  const { shop } = await api.get(`/shops/${shopId}`);
  return shop;
}

export async function submitShopLegal(shopId, legalData) {
  const { shop } = await api.put(`/shops/${shopId}/legal`, legalData);
  return shop;
}

export async function uploadLegalDocument(file) {
  const formData = new FormData();
  formData.append("document", file);

  const token = getToken();
  const res = await fetch("/api/upload/document", {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to upload document");
  }
  return data;
}
