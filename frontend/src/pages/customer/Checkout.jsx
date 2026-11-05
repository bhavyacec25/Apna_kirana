import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiArrowLeft, FiPlus, FiTrash2, FiHome, FiBriefcase, FiMapPin, FiCrosshair } from "react-icons/fi";
import Navbar from "../../components/Navbar";
import { getCart, getCartTotals, clearCart } from "../../services/cartService";
import { placeOrder } from "../../services/orderService";
import { getAddresses, saveAddress, deleteAddress } from "../../services/addressService";
import { getPaymentConfig, createPaymentOrder, verifyPayment, loadRazorpayScript } from "../../services/paymentService";
import { useAuth } from "../../context/AuthContext";

const ADDRESS_ICONS = { Home: FiHome, Work: FiBriefcase, Other: FiMapPin };

const DELIVERY_SLOTS = ["As soon as possible", "Today, 6:00 PM - 8:00 PM", "Tomorrow, 9:00 AM - 11:00 AM"];
const PAYMENT_METHODS = ["Cash on Delivery", "UPI", "Card"];

export default function Checkout() {
  const { user, login } = useAuth();
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
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
  const [paymentConfig, setPaymentConfig] = useState({ enabled: false, keyId: null });
  const [paymentStep, setPaymentStep] = useState(null); // null | { razorpayOrderId, amount }

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

  async function finalizeOrder() {
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

    const order = await placeOrder({
      customer: user?.name || "Customer",
      phone: effectivePhone,
      email: user?.email || "",
      address,
      shopId: cartItems[0]?.shopId,
      shopName: cartItems[0]?.shopName,
      deliveryTime,
      notes,
      paymentMethod,
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
    toast.success(`Order ${order.id} placed!`);
    navigate(`/customer/orders?justPlaced=${order.id}`);
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
      return;
    }
    if (cartItems.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setPlacing(true);
    try {
      if (paymentMethod === "Cash on Delivery") {
        await finalizeOrder();
        return;
      }

      // UPI / Card: create a payment order first, then collect payment
      // before actually placing the order.
      const payOrder = await createPaymentOrder(total);

      if (payOrder.devMode) {
        // Dev mode: no real Razorpay keys configured — show a simulate button instead of a real widget.
        setPaymentStep(payOrder);
        setPlacing(false);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Could not load the payment widget. Check your connection and try again.");
      }

      const rzp = new window.Razorpay({
        key: paymentConfig.keyId,
        amount: Math.round(total * 100),
        currency: "INR",
        name: "ApnaKirana",
        description: "Order payment",
        order_id: payOrder.razorpayOrderId,
        handler: async (response) => {
          try {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await finalizeOrder();
          } catch (err) {
            setError(err.message);
            toast.error(err.message);
          } finally {
            setPlacing(false);
          }
        },
        modal: { ondismiss: () => setPlacing(false) },
        theme: { color: "#E3A008" },
      });
      rzp.open();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      setPlacing(false);
    }
  }

  async function handleSimulatePayment() {
    setPlacing(true);
    try {
      await verifyPayment({ razorpay_order_id: paymentStep.razorpayOrderId });
      setPaymentStep(null);
      await finalizeOrder();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link to="/customer/cart" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-4">
          <FiArrowLeft /> Back to Cart
        </Link>

        <h1 className="text-2xl font-extrabold mb-5">Checkout</h1>

        {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

        <form onSubmit={handlePlaceOrder} className="space-y-5">
          {/* Contact Mobile Number */}
          <div className="card p-5">
            <h2 className="font-display font-semibold mb-2 flex items-center justify-between">
              <span>Contact Phone for Delivery</span>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                Rider Contact
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
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
              The delivery partner will call this number when arriving at your address.
            </p>
          </div>

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
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        selected ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-brand-300"
                      }`}
                    >
                      <Icon className={`mt-0.5 shrink-0 ${selected ? "text-brand-600" : "text-gray-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold flex items-center gap-1.5">
                          {addr.label}
                          {addr.lat && (
                            <span className="text-[10px] font-medium text-leaf-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                              📍 Live tracking enabled
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{addr.text}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAddress(addr.id);
                        }}
                        className="text-gray-300 hover:text-red-500 p-1"
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
                className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        newLabel === label ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  className="input min-h-[70px]"
                  placeholder="House no, street, area, city, pincode"
                  value={newAddressText}
                  onChange={(e) => setNewAddressText(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={locatingMe}
                  className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
                >
                  <FiCrosshair size={14} />
                  {locatingMe ? "Getting your location..." : newAddressCoords ? "✓ Location captured" : "Use my current location (enables live tracking)"}
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={handleSaveNewAddress} className="btn-primary text-sm px-4 py-2">
                    Save Address
                  </button>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-sm text-gray-500 hover:text-brand-600 px-2"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="font-display font-semibold mb-3">Delivery Time</h2>
            <div className="space-y-2">
              {DELIVERY_SLOTS.map((slot) => (
                <label key={slot} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryTime"
                    checked={deliveryTime === slot}
                    onChange={() => setDeliveryTime(slot)}
                    className="accent-brand-500"
                  />
                  {slot}
                </label>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-display font-semibold mb-3">Order Notes (optional)</h2>
            <textarea
              className="input min-h-[60px]"
              placeholder="e.g. Ring the bell, leave at door..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="card p-5">
            <h2 className="font-display font-semibold mb-3">Payment Method</h2>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((method) => (
                <label key={method} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                    className="accent-brand-500"
                  />
                  {method}
                </label>
              ))}
            </div>
          </div>

          <div className="card p-5 space-y-2 text-sm">
            <h2 className="font-display font-semibold mb-1">Order Summary</h2>
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between text-gray-600">
                <span>{item.name} × {item.quantity}</span>
                <span>₹{item.price * item.quantity}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 mt-2 flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Platform Fee</span>
              <span>₹{platformFee}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Coupon Discount ({appliedCoupon?.code})</span>
                <span>-₹{discount}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2 mt-2">
              <span>Total</span>
              <span className="text-brand-700">₹{total}</span>
            </div>
          </div>

          <button type="submit" disabled={placing} className="btn-primary w-full">
            {placing ? "Processing..." : paymentMethod === "Cash on Delivery" ? `Place Order · ₹${total}` : `Pay & Place Order · ₹${total}`}
          </button>
        </form>

        {!paymentConfig.enabled && paymentMethod !== "Cash on Delivery" && (
          <p className="text-xs text-gray-400 text-center mt-3">
            Demo mode: no real payment gateway configured, so payment will be simulated.
          </p>
        )}
      </div>

      {paymentStep && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="card p-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-3">💳</div>
            <h2 className="font-display font-semibold text-lg mb-1">Demo Payment</h2>
            <p className="text-sm text-gray-500 mb-5">
              No real payment gateway is configured yet, so this simulates a successful payment of{" "}
              <span className="font-semibold text-brand-700">₹{paymentStep.amount}</span> via {paymentMethod}.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPaymentStep(null)} className="btn-outline flex-1">
                Cancel
              </button>
              <button onClick={handleSimulatePayment} disabled={placing} className="btn-primary flex-1">
                {placing ? "Processing..." : "Simulate Payment Success"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
