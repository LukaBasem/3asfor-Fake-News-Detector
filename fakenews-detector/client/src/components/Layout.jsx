import { NavLink } from "react-router-dom";
import { Shield, Search, Clock, Zap } from "lucide-react";

const navItems = [
  { to: "/", icon: Search, label: "Analyze" },
  { to: "/history", icon: Clock, label: "History" },
];

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-800 border-r border-surface-700 flex flex-col fixed h-full z-20">
        {/* Logo */}
        <div className="p-6 border-b border-surface-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm leading-tight">VerifyAI</h1>
              <p className="text-slate-500 text-xs">Fake News Detector</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                ${isActive
                  ? "bg-brand-500/10 text-brand-400 border border-brand-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-surface-700"
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-surface-700">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-700/50">
            <Zap size={14} className="text-brand-400" />
            <span className="text-xs text-slate-400 font-mono">LLaMA 3 · Ollama</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
