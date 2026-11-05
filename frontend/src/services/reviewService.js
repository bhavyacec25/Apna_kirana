// services/reviewService.js
import { api } from "./api";

export async function submitReview({ orderId, rating, comment }) {
  const { review } = await api.post("/reviews", { orderId, rating, comment });
  return review;
}

export async function getMyReviews() {
  const { reviews } = await api.get("/reviews/mine");
  return reviews;
}

export async function getShopReviews(shopId) {
  const { reviews } = await api.get(`/reviews/shop/${shopId}`);
  return reviews;
}
