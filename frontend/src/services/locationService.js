// services/locationService.js
import { api } from "./api";

export async function getOrderLocation(orderId) {
  return api.get(`/orders/${orderId}/location`);
}
