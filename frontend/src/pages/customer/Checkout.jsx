import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiPlus,
  FiTrash2,
  FiHome,
  FiBriefcase,
  FiMapPin,
  FiCrosshair,
  FiShield,
  FiCheckCircle,
  FiSmartphone,
  FiCreditCard,
  FiGlobe,
  FiDollarSign,
} from "react-icons/fi";
import Navbar from "../../components/Navbar";
import PaymentModal from "../../components/PaymentModal";
import { getCart, getCartTotals, clearCart } from "../../services/cartService";
import { placeOrder } from "../../services/orderService";
import { getAddresses, saveAddress, deleteAddress } from "../../services/addressService";
import { getPaymentConfig, createPaymentOrder, verifyPayment, loadRazorpayScript } from "../../services/paymentService";
import { useAuth } from "../../context/AuthContext";

const ADDRESS_ICONS = { Home: FiHome, Work: FiBriefcase, Other: FiMapPin };
const DELIVERY_SLOTS = ["As soon as possible (10-15 mins)", "Today, 6:00 PM - 8:00 PM", "Tomorrow, 9:00 AM - 11:00 AM"];

const PAYMENT_METHODS = [
  {
    id: "UPI",
    name: "UPI (GPay / PhonePe / Paytm / QR)",
    description: "Instant dynamic QR code, UPI apps & VPA with zero fees",
    badge: "Fastest & Recommended",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    icon: FiSmartphone,
  },
  {
    id: "Card",
    name: "Credit / Debit Card",
    description: "Visa, Mastercard, RuPay with Bank 3D-Secure OTP",
    badge: "RBI Compliant",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    icon: FiCreditCard,
  },
  {
    id: "Net Banking",
    name: "Net Banking",
    description: "SBI, HDFC, ICICI, Axis, Kotak & 50+ Indian Banks",
    badge: null,
    badgeColor: "",
    icon: FiGlobe,
  },
  {
    id: "Cash on Delivery",
    name: "Cash on Delivery (COD)",
    description: "Pay with cash or scan delivery partner's QR at doorstep",
    badge: null,
    badgeColor: "",
    icon: FiDollarSign,
  },
];

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [address, setAddress] = useState(user?.address || "");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("Home");
  const [newAddressText, setNewAddressText] = useState("");
  const [newAddressCoords, setNewAddressCoords] = useState(null); // { lat, lng } | null
  const [locatingMe, setLocatingMe] = useState(false);
  const [deliveryTime, setDeliveryTime] = useState(DELIVERY_SLOTS[0]);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
  const [paymentConfig, setPaymentConfig] = useState({ enabled: false, keyId: null });

  // Payment Modal state
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);

  useEffect(() => {
    getPaymentConfig().then(setPaymentConfig).catch(() => {});
  }, []);

  useEffect(() => {
    const cart = getCart();
    setCartItems(cart);
    if (cart.length === 0) navigate("/customer/cart");

    const saved = getAddresses();
    setAddresses(saved);
    if (saved.length > 0) {
      setSelectedAddressId(saved[0].id);
      setAddress(saved[0].text);
    } else {
      setShowAddForm(true);
    }
  }, [navigate]);

  function handleSelectAddress(addr) {
    setSelectedAddressId(addr.id);
    setAddress(addr.text);
    setShowAddForm(false);
  }

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  function handleSaveNewAddress() {
    if (!newAddressText.trim()) {
      toast.error("Enter an address before saving.");
      return;
    }
    const saved = saveAddress({
      label: newLabel,
      text: newAddressText.trim(),
      lat: newAddressCoords?.lat,
      lng: newAddressCoords?.lng,
    });
    const updated = getAddresses();
    setAddresses(updated);
    setSelectedAddressId(saved.id);
    setAddress(saved.text);
    setNewAddressText("");
    setNewAddressCoords(null);
    setShowAddForm(false);
    toast.success("Address saved");
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support location access.");
      return;
    }
    setLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewAddressCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        toast.success("Location captured — this enables live delivery tracking on this order.");
        setLocatingMe(false);
      },
      () => {
        toast.error("Couldn't access your location. You can still check out without it — live tracking just won't be available.");
        setLocatingMe(false);
      },
      { timeout: 10000 }
    );
  }

  function handleDeleteAddress(id) {
    const updated = deleteAddress(id);
    setAddresses(updated);
    if (selectedAddressId === id) {
      if (updated.length > 0) {
        setSelectedAddressId(updated[0].id);
        setAddress(updated[0].text);
      } else {
        setSelectedAddressId(null);
        setAddress("");
        setShowAddForm(true);
      }
    }
  }

  const { subtotal, deliveryFee, platformFee, discount, total, appliedCoupon } = getCartTotals(cartItems);

  async function finalizeOrder(paymentInfo = {}) {
    if (subtotal < 350) {
      throw new Error("Online delivery is only possible for orders with an item bill of ₹350 or more.");
    }

    const effectivePhone = (contactPhone || user?.phone || "").trim();
    if (!/^\d{10}$/.test(effectivePhone)) {
      throw new Error("Please enter a valid 10-digit mobile number for delivery contact.");
    }

    // Ensure coordinates are present for real map tracking of the delivery boy
    const destLat = selectedAddress?.lat || 30.9120;
    const destLng = selectedAddress?.lng || 75.8450;

    const finalMethod = paymentInfo.paymentMethod || paymentMethod;
    const finalStatus = paymentInfo.paymentStatus || (finalMethod === "Cash on Delivery" ? "Pending" : "Paid");

    const order = await placeOrder({
      customer: user?.name || "Customer",
      phone: effectivePhone,
      email: user?.email || "",
      address,
      shopId: cartItems[0]?.shopId,
      shopName: cartItems[0]?.shopName,
      deliveryTime,
      notes,
      paymentMethod: finalMethod,
      paymentStatus: finalStatus,
      paymentId: paymentInfo.paymentId || (finalMethod === "Cash on Delivery" ? null : `TXN_${Date.now().toString(36).toUpperCase()}`),
      paymentDetails: paymentInfo.paymentDetails || null,
      items: cartItems.map((i) => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
        qty: i.quantity,
        price: i.price,
        image: i.image || "",
        expiryDate: i.expiryDate || null,
      })),
      destLat,
      destLng,
      discount: discount || 0,
      couponCode: appliedCoupon?.code || null,
    });

    clearCart();
    toast.success(`Order ${order.id} placed successfully!`);
    navigate(`/customer/orders?justPlaced=${order.id}`);
  }

  // Official Razorpay Widget Handler (fallback or user choice)
  async function launchOfficialRazorpay() {
    setPlacing(true);
    try {
      const payOrder = await createPaymentOrder(total);
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Could not load Razorpay script. Using direct secure gateway instead.");
      }

      const rzp = new window.Razorpay({
        key: paymentConfig.keyId,
        amount: Math.round(total * 100),
        currency: "INR",
        name: "ApnaKirana",
        description: "Grocery Order Payment",
        order_id: payOrder.razorpayOrderId,
        handler: async (response) => {
          try {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await finalizeOrder({
              paymentMethod: "Razorpay (Online)",
              paymentId: response.razorpay_payment_id,
              paymentStatus: "Paid",
              paymentDetails: response,
            });
          } catch (err) {
            setError(err.message);
            toast.error(err.message);
          } finally {
            setPlacing(false);
          }
        },
        modal: { ondismiss: () => setPlacing(false) },
        theme: { color: "#059669" },
      });
      rzp.open();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      setPlacing(false);
    }
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    setError("");

    if (subtotal < 350) {
      const needed = 350 - subtotal;
      setError(`Online delivery requires a minimum item bill of ₹350. Please add ₹${needed} more items to your cart.`);
      toast.error(`Minimum order bill is ₹350. Add ₹${needed} more to proceed.`);
      return;
    }
    if (!address.trim()) {
      setError("Please enter a delivery address.");
      toast.error("Please select or enter a delivery address.");
      return;
    }
    if (cartItems.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    const effectivePhone = (contactPhone || user?.phone || "").trim();
    if (!/^\d{10}$/.test(effectivePhone)) {
      setError("Please enter a valid 10-digit mobile number for delivery contact.");
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    // Cash on Delivery places immediately
    if (paymentMethod === "Cash on Delivery") {
      setPlacing(true);
      try {
        await finalizeOrder({ paymentMethod: "Cash on Delivery", paymentStatus: "Pending" });
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setPlacing(false);
      }
      return;
    }

    // Online Payments (UPI, Card, Net Banking): Open Interactive Gateway
    setShowPaymentGateway(true);
  }

  const handleGatewaySuccess = async (result) => {
    setShowPaymentGateway(false);
    setPlacing(true);
    try {
      await finalizeOrder(result);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen pb-12">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link to="/customer/cart" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-4 font-medium">
          <FiArrowLeft /> Back to Cart
        </Link>

        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-black">Checkout & Delivery</h1>
          <span className="text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full font-bold flex items-center gap-1.5 border border-emerald-200/60 dark:border-emerald-800">
            <FiShield size={13} /> 100% Safe Checkout
          </span>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-5 border border-red-200">{error}</div>}

        <form onSubmit={handlePlaceOrder} className="space-y-5">
          {/* Contact Mobile Number */}
          <div className="card p-5">
            <h2 className="font-display font-semibold mb-2 flex items-center justify-between">
              <span>Contact Phone for Delivery</span>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                Rider Contact
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
                +91
              </span>
              <input
                type="tel"
                maxLength={10}
                className="input flex-1 font-mono tracking-wider text-sm font-semibold"
                placeholder="Enter 10-digit delivery mobile number"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                required
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              The delivery partner will call this number when arriving at your location.
            </p>
          </div>

          {/* Delivery Address */}
          <div className="card p-5">
            <h2 className="font-display font-semibold mb-3">Delivery Address</h2>

            {addresses.length > 0 && (
              <div className="space-y-2 mb-3">
                {addresses.map((addr) => {
                  const Icon = ADDRESS_ICONS[addr.label] || FiMapPin;
                  const selected = selectedAddressId === addr.id;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => handleSelectAddress(addr)}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        selected
                          ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/20 ring-1 ring-brand-500"
                          : "border-gray-200 dark:border-gray-700 hover:border-brand-300"
                      }`}
                    >
                      <Icon className={`mt-0.5 shrink-0 ${selected ? "text-brand-600" : "text-gray-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold flex items-center gap-1.5">
                          {addr.label}
                          {addr.lat && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                              📍 Live tracking enabled
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{addr.text}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAddress(addr.id);
                        }}
                        className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                        aria-label="Delete address"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {!showAddForm ? (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 py-1"
              >
                <FiPlus /> Add new address
              </button>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="flex gap-2">
                  {["Home", "Work", "Other"].map((label) => (
                    <button
                      type="button"
                      key={label}
                      onClick={() => setNewLabel(label)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        newLabel === label ? "bg-brand-500 text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  className="input min-h-[75px]"
                  placeholder="House no, street, landmark, area, city, pincode"
                  value={newAddressText}
                  onChange={(e) => setNewAddressText(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={locatingMe}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  <FiCrosshair size={14} />
                  {locatingMe ? "Detecting GPS coordinates..." : newAddressCoords ? "✓ Location captured for live tracking" : "Use current GPS location (Enables live rider map)"}
                </button>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={handleSaveNewAddress} className="btn-primary text-xs px-4 py-2">
                    Save Address
                  </button>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Delivery Slot */}
          <div className="card p-5">
            <h2 className="font-display font-semibold mb-3">Delivery Time Slot</h2>
            <div className="space-y-2">
              {DELIVERY_SLOTS.map((slot) => (
                <label key={slot} className="flex items-center gap-2.5 text-sm cursor-pointer p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <input
                    type="radio"
                    name="deliveryTime"
                    checked={deliveryTime === slot}
                    onChange={() => setDeliveryTime(slot)}
                    className="accent-brand-500 w-4 h-4"
                  />
                  <span className="font-medium text-gray-700 dark:text-gray-200">{slot}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Order Notes */}
          <div className="card p-5">
            <h2 className="font-display font-semibold mb-2">Delivery Notes (optional)</h2>
            <textarea
              className="input min-h-[60px] text-xs"
              placeholder="e.g. Ring the bell twice, leave groceries at door, avoid calling..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Payment Method Cards */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold">Payment Method</h2>
              <span className="text-[11px] text-gray-400 font-medium">Select your preferred option</span>
            </div>

            <div className="space-y-2.5">
              {PAYMENT_METHODS.map((pm) => {
                const isSelected = paymentMethod === pm.id;
                const IconComponent = pm.icon;
                return (
                  <label
                    key={pm.id}
                    className={`flex items-start gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-500"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={pm.id}
                      checked={isSelected}
                      onChange={() => setPaymentMethod(pm.id)}
                      className="accent-emerald-600 mt-1 w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{pm.name}</span>
                        {pm.badge && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pm.badgeColor}`}>
                            {pm.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{pm.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Order Summary */}
          <div className="card p-5 space-y-2 text-sm">
            <h2 className="font-display font-semibold mb-2">Order Bill Summary</h2>
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between text-gray-600 dark:text-gray-300 text-xs py-0.5">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">₹{item.price * item.quantity}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-2.5 mt-2 flex justify-between text-gray-600 dark:text-gray-300 text-xs">
              <span>Item Subtotal</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">₹{subtotal}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300 text-xs">
              <span>Delivery Charges</span>
              <span>{deliveryFee === 0 ? <strong className="text-emerald-600">FREE</strong> : `₹${deliveryFee}`}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300 text-xs">
              <span>Platform Fee</span>
              <span>₹{platformFee}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold text-xs">
                <span>Coupon Savings ({appliedCoupon?.code})</span>
                <span>-₹{discount}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-base border-t border-gray-100 dark:border-gray-800 pt-3 mt-2">
              <span>Grand Total</span>
              <span className="text-emerald-700 dark:text-emerald-400 text-lg">₹{total}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={placing}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-lg shadow-emerald-200/50 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50"
          >
            {placing ? (
              "Securing Order..."
            ) : paymentMethod === "Cash on Delivery" ? (
              `Place Order (Pay on Delivery) · ₹${total}`
            ) : (
              `Pay & Place Order · ₹${total}`
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
            <FiShield className="text-emerald-600" />
            <span>256-bit SSL encrypted · Verified UPI QR & Bank Gateways · RBI Safe Standards</span>
          </p>
        </div>
      </div>

      {/* Interactive Payment Gateway Modal */}
      {showPaymentGateway && (
        <PaymentModal
          total={total}
          paymentConfig={paymentConfig}
          onSuccess={handleGatewaySuccess}
          onClose={() => setShowPaymentGateway(false)}
          onRazorpayDirect={() => {
            setShowPaymentGateway(false);
            launchOfficialRazorpay();
          }}
        />
      )}
    </div>
  );
}
