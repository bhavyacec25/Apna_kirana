// deliverySimulation.js
// There's no real delivery-partner app in this project yet, so instead
// of a fake static "on the way" message, this simulates a rider moving
// in real time from the shop's location to the customer's delivery
// coordinates once an order hits "Out for Delivery". It's a stand-in
// for what a real delivery-partner GPS feed would eventually replace —
// same event shape (`order:location` with riderLat/riderLng), so
// swapping in real GPS later means changing what feeds updateRiderPosition,
// not the tracking UI.

import { getOne, updateRow } from "./db.js";
import { emitOrderLocation } from "./realtime.js";

const TICK_MS = 2500; // how often the rider position advances
const TOTAL_TICKS = 24; // ~60 seconds shop-to-door for the demo

const activeSimulations = new Map(); // orderId -> interval handle

export async function startDeliverySimulation(order) {
  if (activeSimulations.has(order.id)) return; // already running
  if (order.isRealGps) return; // real phone GPS is active, do not simulate

  const shop = order.shopId ? await getOne("shops", { id: order.shopId }) : null;
  const startLat = shop?.latitude || 30.9010;
  const startLng = shop?.longitude || 75.8573;
  const destLat = order.destLat || 30.9120;
  const destLng = order.destLng || 75.8450;

  let tick = 0;

  const interval = setInterval(async () => {
    // Check if real GPS took over in the meantime
    const current = await getOne("orders", { id: order.id });
    if (current?.isRealGps) {
      stopDeliverySimulation(order.id);
      return;
    }

    tick += 1;
    const progress = Math.min(tick / TOTAL_TICKS, 1);
    const riderLat = startLat + (destLat - startLat) * progress;
    const riderLng = startLng + (destLng - startLng) * progress;

    const updated = await updateRow("orders", order.id, { riderLat, riderLng, isRealGps: false });
    emitOrderLocation({ ...updated, progress });

    if (progress >= 1) {
      stopDeliverySimulation(order.id);
    }
  }, TICK_MS);

  activeSimulations.set(order.id, interval);
}

export function stopDeliverySimulation(orderId) {
  const interval = activeSimulations.get(orderId);
  if (interval) {
    clearInterval(interval);
    activeSimulations.delete(orderId);
  }
}
