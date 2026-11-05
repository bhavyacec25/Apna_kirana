import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  FiNavigation,
  FiPhone,
  FiCheckCircle,
  FiMapPin,
  FiActivity,
  FiCompass,
  FiShoppingBag,
  FiArrowLeft,
  FiAlertCircle,
  FiTruck,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { api } from "../services/api";

export default function RiderPortal() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [manualId, setManualId] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(null);
  const [pushedCount, setPushedCount] = useState(0);
  const [lastPushTime, setLastPushTime] = useState(null);

  const watchIdRef = useRef(null);
  const sendIntervalRef = useRef(null);
  const latestCoordsRef = useRef(null);

  // Fetch order details
  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Fetch delivery partner order details from public rider route
    api.get(`/orders/${orderId}/rider`)
      .then((data) => {
        if (data.order) {
          setOrder(data.order);
        } else {
          setError("Order not found");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  // Start real mobile phone GPS tracking
  function startGpsBroadcast() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your mobile browser.");
      return;
    }

    setIsTracking(true);
    toast.success("GPS transmitter active! Tracking live position...");

    // Watch real mobile GPS with high accuracy
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, speed: spd, heading: hdg } = pos.coords;
        const coords = { lat: latitude, lng: longitude };
        setCurrentCoords(coords);
        latestCoordsRef.current = coords;
        setGpsAccuracy(Math.round(accuracy));
        setSpeed(spd ? Math.round(spd * 3.6) : 0); // m/s to km/h
        setHeading(hdg ? Math.round(hdg) : null);
      },
      (err) => {
        console.error("GPS error:", err);
        toast.error(`GPS Error: ${err.message}. Ensure location permissions are allowed.`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    // Periodically stream real coordinates to server
    sendIntervalRef.current = setInterval(async () => {
      const coords = latestCoordsRef.current;
      if (!coords || !orderId) return;

      try {
        await api.post(`/orders/${orderId}/rider-location`, {
          riderLat: coords.lat,
          riderLng: coords.lng,
          speed: speed || 0,
          heading: heading || 0,
          accuracy: gpsAccuracy || 5,
        });

        setPushedCount((prev) => prev + 1);
        setLastPushTime(new Date().toLocaleTimeString("en-IN"));
      } catch (err) {
        console.warn("Failed to push GPS location:", err.message);
      }
    }, 2500);
  }

  function stopGpsBroadcast() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (sendIntervalRef.current) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
    }
    setIsTracking(false);
    toast("Live GPS transmitter stopped", { icon: "🛑" });
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (sendIntervalRef.current) clearInterval(sendIntervalRef.current);
    };
  }, []);

  async function updateStatus(newStatus) {
    try {
      await api.post(`/orders/${orderId}/rider-status`, { status: newStatus });
      setOrder((prev) => ({ ...prev, status: newStatus }));
      toast.success(`Status updated to: ${newStatus}`);
      if (newStatus === "Delivered") {
        stopGpsBroadcast();
      }
    } catch (err) {
      toast.error(err.message);
    }
  }

  function openGoogleMapsNavigation() {
    if (!order) return;
    const dest = order.destLat && order.destLng ? `${order.destLat},${order.destLng}` : encodeURIComponent(order.address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-12 font-sans">
      {/* Mobile Header Bar */}
      <div className="bg-slate-800/90 border-b border-slate-700/80 sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-xl shadow-md">
            🛵
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-white leading-tight">ApnaKirana Delivery Partner</h1>
            <p className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Live GPS Transmitter</p>
          </div>
        </div>
        <Link
          to={`/customer/order-tracking?id=${orderId}`}
          className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold px-3 py-1.5 rounded-lg border border-slate-600"
        >
          View Map
        </Link>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {loading && (
          <div className="text-center py-12 text-slate-400 text-sm">
            <FiActivity className="animate-spin mx-auto text-3xl mb-2 text-emerald-400" />
            Connecting to order {orderId}...
          </div>
        )}

        {error && (
          <div className="bg-red-950/50 border border-red-800 text-red-200 text-xs p-4 rounded-2xl flex items-center gap-2.5">
            <FiAlertCircle className="text-xl shrink-0" />
            <div>
              <p className="font-bold">Error loading order</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {!orderId && (
          <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-6 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner">
              🛵
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Delivery Partner GPS Console</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your assigned Order ID to stream live phone GPS to the customer.
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualId.trim()) navigate(`/rider/${manualId.trim().toUpperCase()}`);
              }}
              className="space-y-3"
            >
              <input
                type="text"
                placeholder="e.g. ORD0001"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-center font-mono font-bold tracking-wider uppercase placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!manualId.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:opacity-40 text-white font-extrabold rounded-xl text-sm transition shadow-lg shadow-emerald-900/30"
              >
                Connect to Order
              </button>
            </form>
          </div>
        )}

        {order && (
          <>
            {/* Live GPS Broadcast Control Card */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700/70 rounded-3xl p-5 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-400 font-bold tracking-wider uppercase">Delivery Partner</span>
                {isTracking ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> LIVE GPS BROADCASTING
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                    GPS Idle
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-3xl shadow-lg shrink-0">
                  🧑‍✈️
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white">Vikas Kumar</h2>
                  <p className="text-xs text-slate-400">Hero Splendor • PB 10 EK 4589</p>
                  <p className="text-[11px] text-emerald-400 mt-0.5 font-semibold">★ 4.9 • 1,280 Deliveries completed</p>
                </div>
              </div>

              {/* Real Phone GPS Stats Grid */}
              {isTracking && currentCoords && (
                <div className="grid grid-cols-3 gap-2 bg-slate-900/80 border border-slate-700/50 rounded-2xl p-3 mb-4 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Speed</p>
                    <p className="text-sm font-extrabold text-emerald-400">{speed} km/h</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Accuracy</p>
                    <p className="text-sm font-extrabold text-sky-400">±{gpsAccuracy}m</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Pushed</p>
                    <p className="text-sm font-extrabold text-purple-400">{pushedCount}x</p>
                  </div>
                </div>
              )}

              {/* Big Action Button */}
              {!isTracking ? (
                <button
                  onClick={startGpsBroadcast}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-sm shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <FiCompass className="text-lg animate-spin" />
                  START SHARING REAL PHONE GPS
                </button>
              ) : (
                <button
                  onClick={stopGpsBroadcast}
                  className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  🛑 STOP GPS BROADCAST
                </button>
              )}

              {isTracking && (
                <p className="text-[11px] text-slate-400 text-center mt-2">
                  Customer map is updating with your real mobile GPS location in real time.
                </p>
              )}
            </div>

            {/* Destination & Navigation Card */}
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-5 space-y-3.5 shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Order #{order.id}</span>
                  <h3 className="font-extrabold text-base text-white">{order.customer}</h3>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-700 text-slate-200">
                  {order.status}
                </span>
              </div>

              <div className="bg-slate-900/70 p-3.5 rounded-2xl border border-slate-700/60 flex items-start gap-2.5 text-xs">
                <FiMapPin className="text-emerald-400 text-lg shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-400 font-semibold">Delivery Address:</p>
                  <p className="text-white font-medium mt-0.5 leading-relaxed">{order.address}</p>
                </div>
              </div>

              {/* One-tap Google Maps Directions */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={openGoogleMapsNavigation}
                  className="py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md"
                >
                  <FiNavigation size={14} /> Open in Google Maps
                </button>

                <a
                  href={`tel:${order.phone}`}
                  className="py-3 px-3 rounded-2xl bg-slate-700 hover:bg-slate-650 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 border border-slate-600"
                >
                  <FiPhone size={14} /> Call Customer
                </a>
              </div>
            </div>

            {/* Quick Status Changers for Delivery Partner */}
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-5 space-y-2.5 shadow-md">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Update Delivery Progress</h3>

              {order.status !== "Out for Delivery" && order.status !== "Delivered" && (
                <button
                  onClick={() => updateStatus("Out for Delivery")}
                  className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center justify-center gap-2"
                >
                  <FiTruck /> Mark "Out for Delivery"
                </button>
              )}

              {order.status !== "Delivered" && (
                <button
                  onClick={() => updateStatus("Delivered")}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/50"
                >
                  <FiCheckCircle size={15} /> Mark Order "Delivered"
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
