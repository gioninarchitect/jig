// P41 — Reusable breadcrumb component
import { Link } from 'react-router-dom';

export default function BreadCrumbs({ items = [] }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-400 py-4">
      <Link to="/home" className="hover:text-or-gold transition-colors">Home</Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          <span>/</span>
          {item.to ? (
            <Link to={item.to} className="hover:text-or-gold transition-colors">{item.label}</Link>
          ) : (
            <span className="text-gray-600">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
