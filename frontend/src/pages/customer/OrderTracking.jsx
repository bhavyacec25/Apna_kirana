import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { FiCheck, FiArrowLeft, FiRefreshCw, FiMap } from "react-icons/fi";
import Navbar from "../../components/Navbar";
import LiveTrackingMap from "../../components/LiveTrackingMap";
import { getOrderById, normalizeOrderForDisplay, ORDER_STATUSES } from "../../services/orderService";
import { getOrderLocation } from "../../services/locationService";
import { getSocket } from "../../services/socket";

export default function OrderTracking() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("id");

  const [order, setOrder] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    if (!orderId) {
      setError("No order ID provided.");
      setLoading(false);
      return;
    }
    setLoading(true);
    getOrderById(orderId)
      .then((data) => setOrder(normalizeOrderForDisplay(data)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  function loadLocation() {
    if (!orderId) return;
    getOrderLocation(orderId)
      .then(setLocation)
      .catch(() => {}); // non-critical — the timeline still works without the map
  }

  useEffect(load, [orderId]);
  useEffect(loadLocation, [orderId]);

  useEffect(() => {
    const socket = getSocket();

    const handleStatusUpdate = (updated) => {
      if (updated.id === orderId) {
        setOrder(normalizeOrderForDisplay(updated));
        if (updated.status === "Out for Delivery") loadLocation();
      }
    };
    const handleLocationUpdate = (updated) => {
      if (updated.id === orderId) {
        setLocation((prev) => ({
          ...prev,
          riderLat: updated.riderLat,
          riderLng: updated.riderLng,
          isRealGps: Boolean(updated.isRealGps),
          riderSpeed: updated.speed || updated.riderSpeed,
          riderHeading: updated.heading || updated.riderHeading,
        }));
      }
    };

    socket.on("order:status", handleStatusUpdate);
    socket.on("order:location", handleLocationUpdate);
    return () => {
      socket.off("order:status", handleStatusUpdate);
      socket.off("order:location", handleLocationUpdate);
    };
  }, [orderId]);

  const isCancelled = order?.status === "Cancelled";
  const currentIdx = order && !isCancelled ? ORDER_STATUSES.indexOf(order.status) : -1;
  const showMap = order && !isCancelled && (order.status === "Out for Delivery" || order.status === "Delivered");

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-6">
        <Link to="/customer/orders" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-4">
          <FiArrowLeft /> Back to My Orders
        </Link>

        {loading && <p className="text-gray-500">Loading order...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {order && (
          <>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-extrabold">{order.id}</h1>
                <p className="text-gray-500 text-sm">{order.shopName} · {order.date}</p>
              </div>
              <button onClick={() => { load(); loadLocation(); }} className="text-gray-400 hover:text-brand-600" aria-label="Refresh status">
                <FiRefreshCw />
              </button>
            </div>

            {isCancelled ? (
              <div className="card p-5 mb-6 bg-red-50 text-red-700 font-medium">This order was cancelled.</div>
            ) : (
              <>
                {showMap && location && (
                  <div className="mb-6">
                    <h2 className="font-display font-semibold mb-3 flex items-center gap-1.5">
                      <FiMap size={16} /> Live Location
                    </h2>
                    <LiveTrackingMap
                      orderId={order.id}
                      orderStatus={order.status}
                      shopLat={location.shopLat}
                      shopLng={location.shopLng}
                      destLat={location.destLat}
                      destLng={location.destLng}
                      riderLat={location.riderLat}
                      riderLng={location.riderLng}
                      isRealGps={location.isRealGps}
                      riderSpeed={location.riderSpeed}
                    />
                    {order.status === "Out for Delivery" && (
                      <p className="text-xs text-gray-400 mt-2 text-center">Updates automatically as your delivery approaches.</p>
                    )}
                  </div>
                )}

                <div className="card p-6 mb-6">
                  {ORDER_STATUSES.map((status, idx) => {
                    const done = idx <= currentIdx;
                    const isLast = idx === ORDER_STATUSES.length - 1;
                    return (
                      <div key={status} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              done ? "bg-leaf-500 text-white" : "bg-gray-200 text-gray-400"
                            }`}
                          >
                            {done ? <FiCheck size={14} /> : <span className="text-xs">{idx + 1}</span>}
                          </div>
                          {!isLast && <div className={`w-0.5 flex-1 min-h-[28px] ${done ? "bg-leaf-500" : "bg-gray-200"}`} />}
                        </div>
                        <div className="pb-6">
                          <p className={`font-medium text-sm ${done ? "text-gray-800 dark:text-gray-200" : "text-gray-400"}`}>{status}</p>
                          {status === order.status && <p className="text-xs text-brand-600 mt-0.5">Current status</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="card p-5 mb-4">
              <h2 className="font-display font-semibold mb-3">Order Items</h2>
              {order.items.map((item, idx) => (
                <div key={item.id || idx} className="flex justify-between text-sm py-1">
                  <span className="text-gray-700 dark:text-gray-300">{item.name} × {item.qty}</span>
                  <span className="font-medium">₹{item.price * item.qty}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-base border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
                <span>Total</span>
                <span className="text-brand-700 dark:text-brand-400">₹{order.total}</span>
              </div>
            </div>

            <div className="card p-5 text-sm text-gray-600 dark:text-gray-300">
              <p><span className="font-medium text-gray-800 dark:text-gray-200">Delivering to:</span> {order.address}</p>
              <p className="mt-1"><span className="font-medium text-gray-800 dark:text-gray-200">Payment:</span> {order.paymentMethod}</p>
              {order.notes && <p className="mt-1"><span className="font-medium text-gray-800 dark:text-gray-200">Notes:</span> {order.notes}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
