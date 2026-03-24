import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Category, Subcategory, AuthState } from "../types";
import { Menu, X, Search, ChevronRight, ChevronLeft, ChevronDown, ShoppingBag, Laptop, Home as HomeIcon, Shirt, User, LogOut, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  categories: Category[];
  auth: AuthState;
  onLogout: () => void;
}

export default function Layout({ children, categories, auth, onLogout }: LayoutProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const activeCategoryId = searchParams.get("category");
  const activeSubcategoryId = searchParams.get("subcategory");

  const activeCategory = categories.find(c => c.id.toString() === activeCategoryId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchQuery) newParams.set("search", searchQuery);
    else newParams.delete("search");
    setSearchParams(newParams);
  };

  const setCategory = (id: string | null) => {
    const newParams = new URLSearchParams();
    if (id) newParams.set("category", id);
    setSearchParams(newParams);
  };

  const setSubcategory = (id: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (id) newParams.set("subcategory", id);
    else newParams.delete("subcategory");
    setSearchParams(newParams);
  };

  const toggleCategory = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
    if (!isSidebarOpen) setIsSidebarOpen(true);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const getIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "tech": return <Laptop className="w-5 h-5" />;
      case "moda": return <Shirt className="w-5 h-5" />;
      case "casa": return <HomeIcon className="w-5 h-5" />;
      default: return <ShoppingBag className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50 h-16 flex items-center px-4 md:px-6">
        <div className="flex items-center gap-4 w-full max-w-7xl mx-auto">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link to="/" onClick={() => setCategory(null)} className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">Top Finds</span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative ml-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-100 border-none rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-brand/5 transition-all text-sm"
            />
          </form>

          <div className="flex items-center gap-2 ml-auto">
            {auth.user ? (
              <div className="flex items-center gap-4">
                {auth.user.is_admin && (
                  <Link to="/admin" className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-brand hover:text-brand/80 transition-colors">
                    <Shield className="w-4 h-4" />
                    <span>AdminHub</span>
                  </Link>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 rounded-full">
                  <div className="w-6 h-6 bg-brand/10 text-brand rounded-full flex items-center justify-center font-bold text-xs uppercase">
                    {auth.user.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-neutral-700 hidden sm:block whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">
                    {auth.user.name}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="hidden sm:flex text-sm font-medium text-neutral-600 hover:text-brand px-4 py-2 hover:bg-neutral-50 rounded-lg transition-colors">
                  Login
                </Link>
                <Link to="/register" className="text-sm font-bold text-white bg-neutral-900 hover:bg-black px-4 py-2 rounded-lg transition-colors">
                  Cadastrar
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full relative">
        {/* Sidebar */}
        <aside className={cn(
          "fixed md:sticky top-16 h-[calc(100vh-4rem)] bg-white border-r border-neutral-200 transition-all duration-300 z-40",
          isSidebarOpen ? "w-64 left-0" : "w-0 -left-64 md:w-20 md:left-0"
        )}>
          <div className="p-4 flex flex-col gap-2 overflow-y-auto h-full overflow-x-hidden">
            <div className="mb-4">
              <button
                onClick={() => setCategory(null)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium group",
                  !activeCategoryId ? "bg-brand text-white shadow-lg shadow-brand/10" : "text-neutral-600 hover:bg-neutral-100"
                )}
              >
                <div className={cn("shrink-0 transition-colors", !activeCategoryId ? "text-white" : "text-neutral-400 group-hover:text-brand")}>
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      Todos os Produtos
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>

            {categories.map((cat) => (
              <div key={cat.id} className="flex flex-col">
                <div className="flex items-center">
                  <button
                    onClick={() => setCategory(cat.id.toString())}
                    className={cn(
                      "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium group",
                      activeCategoryId === cat.id.toString() ? "bg-brand text-white shadow-lg shadow-brand/10" : "text-neutral-600 hover:bg-neutral-100"
                    )}
                  >
                    <div className={cn("shrink-0 transition-colors", activeCategoryId === cat.id.toString() ? "text-white" : "text-neutral-400 group-hover:text-brand")}>
                      {getIcon(cat.name)}
                    </div>
                    <AnimatePresence>
                      {isSidebarOpen && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          className="flex-1 text-left whitespace-nowrap overflow-hidden"
                        >
                          {cat.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                  <AnimatePresence>
                    {isSidebarOpen && cat.subcategories.length > 0 && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={(e) => toggleCategory(cat.id.toString(), e)}
                        className="p-2 text-neutral-400 hover:text-brand transition-colors shrink-0"
                      >
                        <ChevronDown className={cn("w-4 h-4 transition-transform", expandedCategories[cat.id] ? "rotate-180" : "")} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                <AnimatePresence>
                  {isSidebarOpen && expandedCategories[cat.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden flex flex-col gap-1 pl-11 pr-2 py-1"
                    >
                      <button
                        onClick={() => {
                          setCategory(cat.id.toString());
                          setSubcategory(null);
                        }}
                        className={cn(
                          "text-left text-xs py-1.5 px-2 rounded-lg transition-colors",
                          activeCategoryId === cat.id.toString() && !activeSubcategoryId ? "text-brand font-bold bg-brand/5" : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
                        )}
                      >
                        Ver Tudo
                      </button>
                      {cat.subcategories.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setCategory(cat.id.toString());
                            setSubcategory(sub.id.toString());
                          }}
                          className={cn(
                            "text-left text-xs py-1.5 px-2 rounded-lg transition-colors",
                            activeSubcategoryId === sub.id.toString() ? "text-brand font-bold bg-brand/5" : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100"
                          )}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Subcategories Bar */}
          {activeCategory && activeCategory.subcategories.length > 0 && (
            <div className="bg-white border-b border-neutral-200 sticky top-16 z-30 relative group">
              <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-white via-white to-transparent flex items-center justify-start pl-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <ChevronLeft className="w-4 h-4 text-neutral-600" />
              </button>

              <div
                ref={scrollContainerRef}
                className="flex items-center gap-2 p-3 px-6 overflow-x-auto no-scrollbar scroll-smooth"
              >
                <button
                  onClick={() => setSubcategory(null)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap",
                    !activeSubcategoryId ? "bg-brand text-white border-brand" : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                  )}
                >
                  Ver Tudo
                </button>
                {activeCategory.subcategories.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setSubcategory(sub.id.toString())}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap",
                      activeSubcategoryId === sub.id.toString() ? "bg-brand text-white border-brand" : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
                    )}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>

              <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white via-white to-transparent flex items-center justify-end pr-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <ChevronRight className="w-4 h-4 text-neutral-600" />
              </button>
            </div>
          )}

          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
