import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  FiPhone,
  FiNavigation,
  FiClock,
  FiShield,
  FiExternalLink,
  FiCrosshair,
  FiCheck,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

// Helper to pan map smoothly when rider moves
function MapPanUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.panTo(center, { animate: true, duration: 1.0 });
    }
  }, [center, map]);
  return null;
}

// Haversine formula to compute distance in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 1.2;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function dotIcon(color, label = "") {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;gap:6px;background:white;padding:3px 10px;border-radius:14px;box-shadow:0 3px 8px rgba(0,0,0,0.22);border:2px solid ${color};font-size:11px;font-weight:700;color:#0f172a;white-space:nowrap;transform:translate(-50%,-100%)">
      <div style="width:10px;height:10px;border-radius:50%;background:${color};box-shadow:0 0 0 2px rgba(0,0,0,0.1)"></div>
      ${label}
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

const shopIcon = dotIcon("#ea580c", "🏪 Kirana Store");
const destIcon = dotIcon("#16a34a", "📍 Your Address");

// Blinkit/Zomato style scooter marker with pulsating radar halo
const createRiderIcon = (heading = 0) =>
  L.divIcon({
    className: "",
    html: `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);">
      <!-- Pulsating Radar Ring -->
      <div style="position:absolute;width:52px;height:52px;border-radius:50%;background:rgba(22,163,74,0.28);border:2px solid rgba(22,163,74,0.6);animation:ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;top:4px;"></div>
      
      <!-- Driver Label Badge -->
      <div style="position:relative;z-index:10;background:#0f172a;color:white;font-size:10px;font-weight:800;padding:2px 8px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.35);margin-bottom:2px;display:flex;align-items:center;gap:4px;white-space:nowrap;border:1px solid #22c55e;">
        <span style="width:6px;height:6px;border-radius:50%;background:#22c55e;display:inline-block;animation:pulse 1.2s infinite;"></span>
        Vikas (On the way)
      </div>

      <!-- Scooter Avatar Bubble -->
      <div style="position:relative;z-index:9;width:42px;height:42px;border-radius:50%;background:white;border:3px solid #16a34a;box-shadow:0 4px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:22px;transform:rotate(${heading || 0}deg);transition:transform 0.4s ease;">
        🛵
      </div>
    </div>
  `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

export default function LiveTrackingMap({
  orderId,
  shopLat,
  shopLng,
  destLat,
  destLng,
  riderLat,
  riderLng,
  orderStatus = "Out for Delivery",
  isRealGps = false,
  riderSpeed = 0,
}) {
  const [selectedInstruction, setSelectedInstruction] = useState(null);

  // Fallbacks to guarantee map coordinates
  const sLat = shopLat || 30.901;
  const sLng = shopLng || 75.8573;
  const dLat = destLat || 30.912;
  const dLng = destLng || 75.845;

  // Rider position: fallback to midpoint between shop and destination if not yet emitted
  const rLat = riderLat || sLat + (dLat - sLat) * 0.45;
  const rLng = riderLng || sLng + (dLng - sLng) * 0.45;

  // Real-time distance and ETA calculation
  const distanceKm = useMemo(() => {
    return calculateDistanceKm(rLat, rLng, dLat, dLng);
  }, [rLat, rLng, dLat, dLng]);

  const etaMinutes = useMemo(() => {
    if (orderStatus === "Delivered") return 0;
    if (distanceKm <= 0.08) return 1; // Under 80 meters
    // Average 20 km/h with traffic + signals
    const speed = riderSpeed > 5 ? riderSpeed : 20;
    const mins = Math.round((distanceKm / speed) * 60) + 2;
    return Math.max(2, mins);
  }, [distanceKm, orderStatus, riderSpeed]);

  const bounds = [
    [sLat, sLng],
    [dLat, dLng],
  ];

  const deliveryInstructions = [
    "🔔 Don't ring bell",
    "🚪 Leave at the door",
    "📞 Call on arrival",
    "🛡️ Leave with guard",
  ];

  function handleInstruction(inst) {
    setSelectedInstruction(inst);
    toast.success(`Instruction "${inst}" sent to delivery partner Vikas!`);
  }

  return (
    <div className="card overflow-hidden border border-gray-200/80 shadow-lg rounded-2xl bg-white">
      {/* Blinkit/Zomato Top Delivery Status Bar */}
      <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-700 text-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <span className="text-xs font-semibold tracking-wider uppercase text-emerald-100">
                Live Order Tracking
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight mt-0.5">
              {orderStatus === "Delivered"
                ? "Order Delivered Successfully 🎉"
                : `Arriving in ~${etaMinutes} mins`}
            </h2>
            <p className="text-xs text-emerald-100 mt-0.5 flex items-center gap-1.5 font-medium">
              <span>{distanceKm < 1 ? `${Math.round(distanceKm * 1000)} meters` : `${distanceKm.toFixed(1)} km`} away</span>
              <span>•</span>
              <span>{isRealGps ? `Live Mobile GPS (${riderSpeed ? `${riderSpeed} km/h` : "Active"})` : "Live Simulation Active"}</span>
            </p>
          </div>

          {/* Real GPS Badge */}
          <div className="text-right shrink-0">
            {isRealGps ? (
              <span className="inline-flex items-center gap-1 bg-white/20 border border-white/40 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                Real GPS
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-black/20 border border-white/20 text-[10px] font-medium px-2 py-0.5 rounded-full">
                Simulated
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Delivery Partner Profile Card (Zomato / Blinkit style) */}
      <div className="p-4 bg-slate-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-2xl shadow-sm">
              👨🏽‍🦱
            </div>
            <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full text-[10px]">
              <FiShield size={10} />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-sm">Vikas Kumar</h3>
              <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                ★ 4.9
              </span>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <FiNavigation size={11} className="text-emerald-600" /> Hero Splendor · PB 10 EK 4589
            </p>
            <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
              <FiCheck size={11} /> Vaccinated & Temperature Checked
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <a
            href="tel:+918283833894"
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm transition"
          >
            <FiPhone size={13} /> Call Vikas
          </a>

          {orderId && (
            <Link
              to={`/rider/${orderId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-bold px-2.5 py-2 rounded-xl transition shadow-sm"
              title="Open Delivery Partner Phone Transmitter"
            >
              <FiExternalLink size={12} className="text-emerald-600" /> Rider App
            </Link>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div style={{ height: 340, width: "100%", position: "relative" }}>
        <MapContainer
          bounds={bounds}
          boundsOptions={{ padding: [50, 50] }}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={false}
        >
          {/* CartoDB Voyager clean raster tiles — identical to modern food & grocery apps */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          <MapPanUpdater center={[rLat, rLng]} />

          {/* Shop Marker */}
          <Marker position={[sLat, sLng]} icon={shopIcon}>
            <Popup>
              <strong>ApnaKirana Partner Store</strong>
              <br />Order packed and dispatched from here
            </Popup>
          </Marker>

          {/* Customer Destination Marker */}
          <Marker position={[dLat, dLng]} icon={destIcon}>
            <Popup>
              <strong>Your Delivery Address</strong>
              <br />Delivery partner will reach here
            </Popup>
          </Marker>

          {/* Live Delivery Boy Marker */}
          <Marker position={[rLat, rLng]} icon={createRiderIcon(0)}>
            <Popup>
              <strong>Vikas Kumar (Delivery Partner)</strong>
              <br />
              {isRealGps ? "Transmitting real phone GPS" : "On the way to your doorstep"}
            </Popup>
          </Marker>

          {/* Route path */}
          <Polyline
            positions={[
              [sLat, sLng],
              [rLat, rLng],
              [dLat, dLng],
            ]}
            color="#16a34a"
            weight={4}
            dashArray="6 8"
          />
        </MapContainer>
      </div>

      {/* Quick Delivery Instructions (Zomato/Blinkit feature) */}
      <div className="p-3 bg-white border-t border-gray-100">
        <p className="text-[11px] font-bold text-gray-600 mb-2 uppercase tracking-wider">
          Delivery Instructions for Vikas
        </p>
        <div className="flex flex-wrap gap-1.5">
          {deliveryInstructions.map((inst) => {
            const isSelected = selectedInstruction === inst;
            return (
              <button
                key={inst}
                type="button"
                onClick={() => handleInstruction(inst)}
                className={`text-xs px-2.5 py-1 rounded-full border transition font-medium flex items-center gap-1 ${
                  isSelected
                    ? "bg-emerald-50 text-emerald-800 border-emerald-500 font-semibold"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {isSelected && <FiCheck size={11} className="text-emerald-600" />}
                {inst}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live status footer notice */}
      <div className="bg-gray-50 px-4 py-2 text-[11px] text-gray-500 flex items-center justify-between border-t border-gray-100">
        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
          <FiClock /> Live GPS active
        </span>
        {orderId && (
          <Link
            to={`/rider/${orderId}`}
            className="text-emerald-700 hover:underline font-semibold flex items-center gap-1"
          >
            Open Rider Transmitter on Mobile &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}
