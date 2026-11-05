import { FiMinus, FiPlus, FiTrash2 } from "react-icons/fi";

// The single canonical cart-row component (there is no separate
// "CardItem.jsx" in this project — this is the one and only version).
export default function CartItem({ item, onQuantityChange, onRemove }) {
  if (!item) return null;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-b-0">
      <div className="w-14 h-14 rounded-lg bg-brand-50 flex items-center justify-center text-2xl shrink-0">
        🛒
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.name}</p>
        <p className="text-xs text-gray-500">{item.unit}</p>
        <p className="text-sm font-semibold text-brand-700 mt-0.5">₹{item.price}</p>
      </div>

      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-1.5 py-1">
        <button
          onClick={() => onQuantityChange(item.id, item.quantity - 1)}
          className="w-6 h-6 flex items-center justify-center text-brand-600 hover:bg-brand-50 rounded"
          aria-label="Decrease quantity"
        >
          <FiMinus size={14} />
        </button>
        <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
        <button
          onClick={() => onQuantityChange(item.id, item.quantity + 1)}
          className="w-6 h-6 flex items-center justify-center text-brand-600 hover:bg-brand-50 rounded"
          aria-label="Increase quantity"
        >
          <FiPlus size={14} />
        </button>
      </div>

      <button
        onClick={() => onRemove(item.id)}
        className="text-gray-400 hover:text-red-500 transition-colors p-2"
        aria-label="Remove item"
      >
        <FiTrash2 size={16} />
      </button>
    </div>
  );
}
