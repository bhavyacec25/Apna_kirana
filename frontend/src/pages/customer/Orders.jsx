import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiSearch, FiRefreshCw, FiPackage, FiXCircle, FiStar } from "react-icons/fi";
import Navbar from "../../components/Navbar";
import StatusBadge from "../../components/StatusBadge";
import StarRating from "../../components/StarRating";
import { SkeletonGrid, SkeletonRow } from "../../components/Skeleton";
import { getOrders, normalizeOrderForDisplay, cancelOrder } from "../../services/orderService";
import { addItemsToCart } from "../../services/cartService";
import { submitReview, getMyReviews } from "../../services/reviewService";
import { getSocket } from "../../services/socket";
import { notify } from "../../services/notify";
import { useAuth } from "../../context/AuthContext";

const FILTERS = ["All", "Pending", "Accepted", "Packed", "Out for Delivery", "Delivered", "Cancelled"];

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justPlaced = searchParams.get("justPlaced");

  const [orders, setOrders] = useState([]);
  const [reviewedOrderIds, setReviewedOrderIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [cancellingId, setCancellingId] = useState(null);
  const [ratingOrder, setRatingOrder] = useState(null); // order currently being rated in the modal

  function load() {
    getOrders()
      .then((data) => setOrders(data.map(normalizeOrderForDisplay)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    getMyReviews()
      .then((reviews) => setReviewedOrderIds(new Set(reviews.map((r) => r.orderId))))
      .catch(() => {});

    const interval = setInterval(load, 15000); // slow fallback poll
    const socket = getSocket();
    const handleStatusUpdate = (order) => {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? normalizeOrderForDisplay(order) : o)));
      toast(`Order ${order.id} is now ${order.status}`, { icon: "📦" });
      notify(`Order ${order.id} update`, `Status: ${order.status}`);
    };
    socket.on("order:status", handleStatusUpdate);

    return () => {
      clearInterval(interval);
      socket.off("order:status", handleStatusUpdate);
    };
  }, [user?.id, user?.phone]);

  const filtered = orders.filter((o) => {
    const matchesFilter = filter === "All" || o.status === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q || o.id.toLowerCase().includes(q) || (o.shopName || "").toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  function handleReorder(order) {
    addItemsToCart(
      order.items.map((it) => ({
        id: it.id,
        name: it.name,
        unit: it.unit,
        price: it.price,
        quantity: it.qty,
        shopId: order.shopId,
        shopName: order.shopName,
      }))
    );
    toast.success("Items added to cart");
    navigate("/customer/cart");
  }

  async function handleCancel(orderId) {
    setCancellingId(orderId);
    try {
      const updated = await cancelOrder(orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? normalizeOrderForDisplay(updated) : o)));
      toast.success("Order cancelled");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancellingId(null);
    }
  }

  async function handleSubmitRating(rating, comment) {
    try {
      await submitReview({ orderId: ratingOrder.id, rating, comment });
      setReviewedOrderIds((prev) => new Set(prev).add(ratingOrder.id));
      toast.success("Thanks for your feedback!");
      setRatingOrder(null);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-extrabold mb-1">My Orders</h1>

        {justPlaced && (
          <div className="bg-green-50 text-green-700 text-sm rounded-lg px-3 py-2 mb-4">
            🎉 Order {justPlaced} placed successfully!
          </div>
        )}

        <div className="relative mb-3">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-10"
            placeholder="Search by Order ID or Shop"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f ? "bg-brand-500 text-white" : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading && <SkeletonGrid count={4} Component={SkeletonRow} className="space-y-3" />}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && filtered.length === 0 && (
          <div className="card p-10 text-center">
            <FiPackage className="mx-auto text-4xl text-gray-300 mb-3" />
            <h2 className="font-display font-semibold text-lg mb-1">No orders here</h2>
            <p className="text-gray-500 text-sm mb-5">Your orders will show up once you place one.</p>
            <Link to="/customer" className="btn-primary inline-block">
              Start Shopping
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((order) => {
            const isCancelling = cancellingId === order.id;
            const alreadyReviewed = reviewedOrderIds.has(order.id);
            return (
              <div key={order.id} className={`card p-4 ${isCancelling ? "opacity-60 pointer-events-none" : ""}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-display font-semibold">{order.id}</p>
                    <p className="text-xs text-gray-500">{order.shopName} · {order.date}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <p className="text-sm text-gray-600 mb-3">
                  {order.items.map((it) => it.name).join(", ")}
                </p>

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold text-brand-700">₹{order.total}</span>
                  <div className="flex gap-2 flex-wrap">
                    {order.status === "Pending" && (
                      <button
                        onClick={() => handleCancel(order.id)}
                        className="flex items-center gap-1 btn-outline text-xs px-3 py-1.5 !text-red-600 !border-red-300 hover:!bg-red-50"
                      >
                        <FiXCircle size={12} /> Cancel
                      </button>
                    )}
                    {order.status === "Out for Delivery" ? (
                      <Link
                        to={`/customer/order-tracking?id=${order.id}`}
                        className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold shadow-md shadow-emerald-200/50 hover:brightness-105 animate-pulse"
                      >
                        🛵 Live GPS Tracking
                      </Link>
                    ) : order.status !== "Cancelled" ? (
                      <Link to={`/customer/order-tracking?id=${order.id}`} className="btn-outline text-xs px-3 py-1.5 font-semibold">
                        Track Order
                      </Link>
                    ) : null}
                    <button
                      onClick={() => handleReorder(order)}
                      className="flex items-center gap-1 btn-primary text-xs px-3 py-1.5"
                    >
                      <FiRefreshCw size={12} /> Reorder
                    </button>
                    {order.status === "Delivered" && !alreadyReviewed && (
                      <button
                        onClick={() => setRatingOrder(order)}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold"
                      >
                        <FiStar size={12} /> Rate Order
                      </button>
                    )}
                    {order.status === "Delivered" && alreadyReviewed && (
                      <span className="text-xs text-green-600 font-medium px-2 py-1.5">✓ Reviewed</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {ratingOrder && (
        <RatingModal order={ratingOrder} onClose={() => setRatingOrder(null)} onSubmit={handleSubmitRating} />
      )}
    </div>
  );
}

function RatingModal({ order, onClose, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    await onSubmit(rating, comment);
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display font-semibold text-lg mb-1">Rate your order</h2>
        <p className="text-sm text-gray-500 mb-4">{order.shopName} · {order.id}</p>

        <div className="flex justify-center mb-4">
          <StarRating value={rating} onChange={setRating} size={32} />
        </div>

        <textarea
          className="input min-h-[70px] mb-4"
          placeholder="Anything you'd like to share? (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-outline flex-1">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-1">
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
