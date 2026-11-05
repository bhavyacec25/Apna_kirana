import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiImage,
  FiX,
  FiBox,
  FiClock,
  FiUploadCloud,
  FiAlertTriangle,
  FiSearch,
} from "react-icons/fi";
import ShopkeeperNavbar from "../../components/ShopkeeperNavbar";
import { SkeletonGrid, SkeletonCard } from "../../components/Skeleton";
import {
  getShopProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
} from "../../services/productService";
import { useAuth } from "../../context/AuthContext";

const EMPTY_FORM = {
  name: "",
  unit: "",
  price: "",
  category: "General",
  image: "",
  expiryDate: "",
  inStock: true,
};

function isRealImageUrl(image) {
  return (
    typeof image === "string" &&
    (image.startsWith("/uploads/") ||
      image.startsWith("http://") ||
      image.startsWith("https://") ||
      image.startsWith("data:"))
  );
}

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRefs = useRef({});
  const modalFileInputRef = useRef(null);

  function load() {
    if (!user?.shopId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getShopProducts(user.shopId)
      .then(setProducts)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [user?.shopId]);

  function openAddForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(product) {
    setForm({
      name: product.name,
      unit: product.unit,
      price: product.price,
      category: product.category,
      image: product.image || "",
      expiryDate: product.expiryDate || "",
      inStock: product.inStock,
    });
    setEditingId(product.id);
    setShowForm(true);
  }

  async function handleModalImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      // Use standard upload route
      const formData = new FormData();
      formData.append("image", file);

      // If already editing an existing product, upload directly
      if (editingId) {
        const updated = await uploadProductImage(editingId, file);
        setForm((f) => ({ ...f, image: updated.image }));
        setProducts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
        toast.success("Image uploaded!");
      } else {
        // Upload image via fetch to /api/products/xxx or convert to preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setForm((f) => ({ ...f, image: reader.result }));
        };
        reader.readAsDataURL(file);
        toast.success("Image attached! Will be saved with product.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSave() {
    if (!form.name.trim() || !form.price) {
      toast.error("Name and price are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        expiryDate: form.expiryDate ? form.expiryDate : null,
      };

      if (editingId) {
        const updated = await updateProduct(editingId, payload);
        setProducts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
        toast.success("Product updated successfully!");
      } else {
        const created = await createProduct({
          ...payload,
          shopId: user.shopId,
        });
        setProducts((prev) => [created, ...prev]);
        toast.success("Product added successfully!");
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remove this product from your shop?")) return;
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Product removed");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleToggleStock(product) {
    try {
      const updated = await updateProduct(product.id, { inStock: !product.inStock });
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleImageSelect(productId, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const updated = await uploadProductImage(productId, file);
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      toast.success("Image uploaded!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      e.target.value = "";
    }
  }

  const [search, setSearch] = useState("");
  const filtered = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/20 to-blue-50/10 pb-12">
      <ShopkeeperNavbar />

      {/* Gradient Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-700 to-brand-700 text-white px-6 py-10">
        <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
        <div className="max-w-6xl mx-auto relative flex items-center justify-between gap-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">Inventory</p>
            <h1 className="text-3xl font-extrabold drop-shadow">Products</h1>
            <p className="text-blue-100 text-sm mt-1">
              {products.length} items · Add images, prices &amp; expiry dates
            </p>
          </motion.div>
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            whileTap={{ scale: 0.95 }}
            onClick={openAddForm}
            className="flex items-center gap-2 bg-white text-blue-700 font-bold text-sm px-5 py-2.5 rounded-2xl shadow-lg hover:bg-blue-50 transition-colors"
          >
            <FiPlus size={16} /> Add Item
          </motion.button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-5">
        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="card p-3 mb-5 flex items-center gap-3"
        >
          <FiSearch className="text-gray-400 shrink-0" size={16} />
          <input
            className="flex-1 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400"
            placeholder="Search products by name or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
              <FiX size={14} />
            </button>
          )}
        </motion.div>

        {loading ? (
          <SkeletonGrid
            count={6}
            Component={SkeletonCard}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          />
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="card p-12 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <FiBox className="text-3xl text-blue-300" />
            </div>
            <h2 className="font-display font-bold text-lg mb-1 text-gray-900">
              {search ? "No matching products" : "No products in shop yet"}
            </h2>
            <p className="text-gray-500 text-sm mb-5">
              {search ? "Try a different search term." : "Add your first item with image and price."}
            </p>
            {!search && (
              <button onClick={openAddForm} className="btn-primary inline-block text-xs px-5 py-2.5">
                Add Product
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {filtered.map((product, i) => {
                const isExpired =
                  product.expiryDate && new Date(product.expiryDate + "T23:59:59") < new Date();

                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 30, scale: 0.93 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}
                    className={`card p-4 flex flex-col bg-white cursor-default ${
                      !product.inStock || isExpired ? "opacity-65" : ""
                    }`}
                  >
                    <div className="relative w-full aspect-square rounded-xl bg-gray-50 flex items-center justify-center mb-3 overflow-hidden group border border-gray-100">
                      {isRealImageUrl(product.image) ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentElement.innerHTML = `<span class="text-4xl">🛒</span>`;
                          }}
                        />
                      ) : (
                        <span className="text-4xl">🛒</span>
                      )}

                      {product.expiryDate && (
                        <div
                          className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1 ${
                            isExpired
                              ? "bg-red-500 text-white"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}
                        >
                          {isExpired ? <FiAlertTriangle size={10} /> : <FiClock size={10} />}
                          {isExpired ? "EXPIRED" : `Exp: ${product.expiryDate}`}
                        </div>
                      )}

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        ref={(el) => (fileInputRefs.current[product.id] = el)}
                        onChange={(e) => handleImageSelect(product.id, e)}
                      />
                      <button
                        onClick={() => fileInputRefs.current[product.id]?.click()}
                        className="absolute bottom-2 right-2 bg-white/95 rounded-lg p-1.5 shadow-card hover:bg-white text-gray-700 transition"
                        title="Upload / Change Image"
                      >
                        <FiImage size={14} />
                      </button>
                    </div>

                    <h3 className="font-display font-semibold text-sm leading-snug mb-0.5 line-clamp-1 text-gray-900">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mb-1">
                      {product.unit} · <span className="text-brand-700 font-medium">{product.category}</span>
                    </p>
                    <p className="font-extrabold text-brand-700 text-base mb-2">₹{product.price}</p>

                    <label className="flex items-center gap-2 text-xs mb-3 cursor-pointer text-gray-700 select-none">
                      <input
                        type="checkbox"
                        checked={product.inStock}
                        onChange={() => handleToggleStock(product)}
                        className="accent-brand-600 rounded"
                      />
                      <span className={product.inStock ? "text-emerald-700 font-semibold" : "text-red-500 font-semibold"}>
                        {product.inStock ? "✓ In Stock" : "✗ Out of Stock"}
                      </span>
                    </label>

                    <div className="mt-auto flex gap-2">
                      <button
                        onClick={() => openEditForm(product)}
                        className="flex-1 btn-outline text-xs px-2 py-1.5 flex items-center justify-center gap-1"
                      >
                        <FiEdit2 size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="flex-1 btn-outline text-xs px-2 py-1.5 flex items-center justify-center gap-1 !text-red-600 !border-red-200 hover:!bg-red-50"
                      >
                        <FiTrash2 size={12} /> Delete
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Modal: Add / Edit Product */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h2 className="font-display font-bold text-lg text-gray-900">
                {editingId ? "Edit Product" : "Add Product to Shop"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Product Name</label>
                <input
                  className="input"
                  placeholder="e.g. Britannia Brown Bread, Amul Taaza"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Unit / Pack Size</label>
                  <input
                    className="input"
                    placeholder="e.g. 400 g, 1 kg, 500 ml"
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Price (₹)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="e.g. 45"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Category</label>
                <input
                  className="input"
                  placeholder="e.g. Bakery, Dairy, Staples, Fruits"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                />
              </div>

              {/* Product Image Upload or URL */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Product Image</label>
                <div className="flex gap-2 items-center">
                  <input
                    className="input text-xs flex-1"
                    placeholder="Paste Image URL or upload below"
                    value={form.image}
                    onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={modalFileInputRef}
                    onChange={handleModalImageUpload}
                  />
                  <button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="btn-outline text-xs px-3 py-2 shrink-0 flex items-center gap-1"
                  >
                    <FiUploadCloud size={14} />
                    {uploadingImage ? "Uploading..." : "Upload File"}
                  </button>
                </div>

                {form.image && (
                  <div className="mt-2 w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                    <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Expiry Date for Perishable Goods */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
                  <FiClock /> Expiry / Best Before Date (For Perishables)
                </div>
                <p className="text-[11px] text-amber-700 mb-2">
                  For items with 1-2 days shelf-life (breads, milk, paneer, veggies). Expired items will automatically be hidden from customers!
                </p>
                <input
                  type="date"
                  className="input text-xs bg-white"
                  value={form.expiryDate}
                  onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                />
              </div>

              <label className="flex items-center gap-2 text-xs cursor-pointer select-none text-gray-800">
                <input
                  type="checkbox"
                  checked={form.inStock}
                  onChange={(e) => setForm((f) => ({ ...f, inStock: e.target.checked }))}
                  className="accent-brand-600 rounded"
                />
                <span className="font-medium">Item is in stock and available for sale</span>
              </label>
            </div>

            <div className="flex gap-2 mt-6 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-outline flex-1 text-xs py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 text-xs py-2"
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
