import { FiPhone, FiMapPin, FiClock } from "react-icons/fi";
import StatusBadge from "./StatusBadge";
import { NEXT_ACTIONS } from "../services/orderService";

export default function OrderCard({ order, onStatusChange }) {
  const actions = NEXT_ACTIONS[order.status] || [];

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-display font-semibold">{order.id}</p>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <FiClock size={12} /> {order.date}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mb-3 text-sm">
        <p className="font-medium">{order.customer}</p>
        <p className="text-gray-500 flex items-center gap-1">
          <FiPhone size={12} /> {order.phone}
        </p>
        <p className="text-gray-500 flex items-center gap-1 mt-0.5">
          <FiMapPin size={12} /> {order.address}
        </p>
      </div>

      <div className="border-t border-gray-100 pt-3 mb-3">
        {order.items.map((item, idx) => (
          <div key={item.id || idx} className="flex justify-between text-sm py-0.5">
            <span className="text-gray-700">
              {item.name} <span className="text-gray-400">× {item.qty}</span>
            </span>
            <span className="font-medium">₹{item.price * item.qty}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-3 mb-4">
        <span className="text-sm text-gray-500">Total</span>
        <span className="font-display font-bold text-brand-700">₹{order.total}</span>
      </div>

      {actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map((action) => (
            <button
              key={action.status}
              onClick={() => onStatusChange(order.id, action.status)}
              className={
                action.status === "Cancelled"
                  ? "btn-outline flex-1 !text-red-600 !border-red-300 hover:!bg-red-50"
                  : "btn-primary flex-1"
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
