// services/adminService.js
import { api } from "./api";

export async function getAdminStats() {
  return api.get("/admin/stats");
}

export async function getAllShops() {
  const { shops } = await api.get("/admin/shops");
  return shops;
}

export async function updateShopStatus(id, status) {
  const { shop } = await api.patch(`/admin/shops/${id}/status`, { status });
  return shop;
}

export async function addShopkeeper(data) {
  return api.post("/admin/shopkeepers", data);
}

export async function updateShopLegalStatus(id, status, notes = "") {
  return api.patch(`/admin/shops/${id}/legal`, { status, notes });
}

export async function getAllOrdersAdmin() {
  const { orders } = await api.get("/admin/orders");
  return orders;
}

export async function getAllUsers(role) {
  const { users } = await api.get(`/admin/users${role ? `?role=${role}` : ""}`);
  return users;
}

export async function updateUserStatus(id, status) {
  const { user } = await api.patch(`/admin/users/${id}/status`, { status });
  return user;
}

export async function getAdminMembers() {
  const { admins } = await api.get("/admin/admins");
  return admins;
}

export async function addAdminMember(data) {
  return api.post("/admin/admins", data);
}

export async function revokeAdminMember(id) {
  return api.delete(`/admin/admins/${id}`);
}
