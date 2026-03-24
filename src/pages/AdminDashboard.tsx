import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthState, Category, Product } from "../types";
import {
  LayoutDashboard,
  Package,
  Plus,
  LogOut,
  Trash2,
  Edit3,
  BarChart3,
  ExternalLink,
  MousePointer2,
  Check,
  Menu,
  X,
  Image as ImageIcon,
  Settings,
  Calendar,
  Clock,
  Filter,
  Tag,
  GripVertical,
  AlertTriangle,
  User as UserIcon,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useForm } from "react-hook-form";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface AdminDashboardProps {
  auth: AuthState;
  onLogout: () => void;
  categories: Category[];
  onRefreshCategories: () => void;
}

interface SortableSubcategoryProps {
  sub: any;
  onEdit: (id: number, name: string) => Promise<void> | void;
  onDelete: (id: number) => Promise<void> | void;
}

function SortableSubcategory({ sub, onEdit, onDelete }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sub.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-neutral-100 group ${isDragging ? "shadow-lg border-brand opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-neutral-300 hover:text-neutral-500 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-medium text-neutral-600">{sub.name}</span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(sub.id, sub.name)}
          className="p-1 text-neutral-400 hover:text-brand"
        >
          <Edit3 className="w-3 h-3" />
        </button>
        <button
          onClick={() => onDelete(sub.id)}
          className="p-1 text-neutral-400 hover:text-red-500"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

interface Stats {
  totalProducts: number;
  totalClicks: number;
  topProducts: { name: string; clicks: number }[];
}

export default function AdminDashboard({ auth, onLogout, categories, onRefreshCategories }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"stats" | "products" | "add" | "categories" | "users">("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserData, setNewUserData] = useState({ name: '', email: '', password: '' });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [statsFilters, setStatsFilters] = useState({
    start: "",
    end: "",
    category_id: "",
    subcategory_id: ""
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message?: string;
    type: 'prompt' | 'confirm' | 'alert';
    inputValue?: string;
    onConfirm?: (val?: string) => void;
  }>({ isOpen: false, title: '', type: 'alert' });

  const navigate = useNavigate();

  const showAlert = (title: string, message?: string) => {
    setModalConfig({ isOpen: true, title, message, type: 'alert' });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({ isOpen: true, title, message, type: 'confirm', onConfirm });
  };

  const showPrompt = (title: string, defaultValue: string, onConfirm: (val: string) => void) => {
    setModalConfig({ isOpen: true, title, type: 'prompt', inputValue: defaultValue, onConfirm });
  };

  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

  const { register, handleSubmit, reset, watch, setValue } = useForm();
  const selectedCategoryId = watch("category_id");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!auth.token) {
      navigate("/admin/login");
      return;
    }
    fetchStats();
    fetchProducts();
    fetchUsers();
  }, [auth.token, statsFilters, categories]);

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    if (res.ok) setAdminUsers(await res.json());
  };

  const toggleAdmin = async (id: number, currentStatus: boolean) => {
    const res = await fetch(`/api/admin/users/${id}/toggle-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ is_admin: !currentStatus })
    });
    if (res.ok) {
      fetchUsers();
    } else {
      const data = await res.json();
      showAlert("Erro", data.error || "Erro ao alterar permissão");
    }
  };

  const handleCreateAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.name || !newUserData.email || !newUserData.password) {
      showAlert("Erro", "Preencha todos os campos para cadastrar o usuário.");
      return;
    }

    const res = await fetch("/api/admin/users/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify(newUserData)
    });

    if (res.ok) {
      setNewUserData({ name: '', email: '', password: '' });
      setShowAddUser(false);
      fetchUsers();
      showAlert("Sucesso", "Usuário administrador criado com sucesso!");
    } else {
      const data = await res.json();
      showAlert("Erro", data.error || "Erro ao criar usuário.");
    }
  };

  const fetchStats = async () => {
    const params = new URLSearchParams();
    if (statsFilters.start) params.set("start", statsFilters.start);
    if (statsFilters.end) params.set("end", statsFilters.end);
    if (statsFilters.category_id) params.set("category_id", statsFilters.category_id);
    if (statsFilters.subcategory_id) params.set("subcategory_id", statsFilters.subcategory_id);

    const res = await fetch(`/api/stats?${params.toString()}`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    });
    if (res.ok) setStats(await res.json());
  };

  const fetchProducts = async () => {
    const res = await fetch("/api/products");
    if (res.ok) setProducts(await res.json());
  };

  const onSubmit = async (data: any) => {
    const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
    const method = editingProduct ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`
      },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      reset();
      setEditingProduct(null);
      setActiveTab("products");
      fetchProducts();
      fetchStats();
    }
  };

  const deleteProduct = async (id: number) => {
    showConfirm("Excluir Produto", "Tem certeza que deseja excluir este produto?", async () => {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      if (res.ok) {
        fetchProducts();
        fetchStats();
      }
    });
  };

  const handleAddCategory = async (name: string) => {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ name })
    });
    if (res.ok) {
      onRefreshCategories();
    } else {
      const data = await res.json();
      showAlert("Erro", data.error || "Erro ao adicionar categoria");
    }
  };

  const handleEditCategory = async (id: number, name: string) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ name })
    });
    if (res.ok) {
      onRefreshCategories();
    } else {
      const data = await res.json();
      showAlert("Erro", data.error || "Erro ao editar categoria");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    showConfirm("Excluir Categoria", "Isso excluirá todos os produtos desta categoria. Continuar?", async () => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      if (res.ok) {
        onRefreshCategories();
      } else {
        const data = await res.json();
        showAlert("Erro", data.error || "Erro ao excluir categoria");
      }
    });
  };

  const handleAddSubcategory = async (name: string, category_id: number) => {
    const res = await fetch("/api/subcategories", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ name, category_id })
    });
    if (res.ok) {
      onRefreshCategories();
    } else {
      const data = await res.json();
      showAlert("Erro", data.error || "Erro ao adicionar subcategoria");
    }
  };

  const handleEditSubcategory = async (id: number, name: string) => {
    const res = await fetch(`/api/subcategories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ name })
    });
    if (res.ok) {
      onRefreshCategories();
    } else {
      const data = await res.json();
      showAlert("Erro", data.error || "Erro ao editar subcategoria");
    }
  };

  const handleDeleteSubcategory = async (id: number) => {
    showConfirm("Excluir Subcategoria", "Isso excluirá todos os produtos desta subcategoria. Continuar?", async () => {
      const res = await fetch(`/api/subcategories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      if (res.ok) {
        onRefreshCategories();
      } else {
        const data = await res.json();
        showAlert("Erro", data.error || "Erro ao excluir subcategoria");
      }
    });
  };

  const handleDragEnd = async (event: DragEndEvent, categoryId: number) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const category = categories.find(c => c.id === categoryId);
      if (!category) return;

      const oldIndex = category.subcategories.findIndex(s => s.id === active.id);
      const newIndex = category.subcategories.findIndex(s => s.id === over.id);

      const newSubcategories = arrayMove(category.subcategories, oldIndex, newIndex);

      // Optimistic update
      // (Wait for refresh from server for full sync)

      const reorderData = newSubcategories.map((sub, index) => ({
        id: sub.id,
        order_index: index
      }));

      const res = await fetch("/api/subcategories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ subcategories: reorderData })
      });

      if (res.ok) {
        onRefreshCategories();
      }
    }
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setValue("name", product.name);
    setValue("description", product.description);
    setValue("image", product.image);
    setValue("price", product.price);
    setValue("price_original", product.price_original);
    setValue("keywords", product.keywords);
    setValue("link_afiliado", product.link_afiliado);
    setValue("category_id", product.category_id);
    setValue("subcategory_id", product.subcategory_id);
    setValue("featured", product.featured === 1);
    setValue("tag_label", product.tag_label);
    setValue("tag_color", product.tag_color);
    setActiveTab("add");
  };

  const selectedCategory = categories.find(c => c.id.toString() === selectedCategoryId?.toString());

  return (
    <div className="min-h-screen bg-neutral-50 flex font-sans">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 256 : 80 }}
        className="bg-brand text-white flex flex-col sticky top-0 h-screen overflow-hidden shrink-0 z-50"
      >
        <div className="p-6 flex items-center gap-3 h-20">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center shrink-0 transition-colors"
          >
            {isSidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="font-black text-lg tracking-tight whitespace-nowrap overflow-hidden"
              >
                AdminHub
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto overflow-x-hidden no-scrollbar">
          <button
            onClick={() => { setActiveTab("stats"); setEditingProduct(null); }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === "stats" ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
            title={!isSidebarOpen ? "Painel de Gestão" : undefined}
          >
            <div className="shrink-0 flex items-center justify-center w-6">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Painel de Gestão
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={() => { setActiveTab("products"); setEditingProduct(null); }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === "products" ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
            title={!isSidebarOpen ? "Produtos" : undefined}
          >
            <div className="shrink-0 flex items-center justify-center w-6">
              <Package className="w-5 h-5" />
            </div>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Produtos
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={() => { setActiveTab("categories"); setEditingProduct(null); }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === "categories" ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
            title={!isSidebarOpen ? "Categorias" : undefined}
          >
            <div className="shrink-0 flex items-center justify-center w-6">
              <Settings className="w-5 h-5" />
            </div>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Categorias
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={() => { setActiveTab("users"); setEditingProduct(null); }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === "users" ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
            title={!isSidebarOpen ? "Acessos" : undefined}
          >
            <div className="shrink-0 flex items-center justify-center w-6">
              <Shield className="w-5 h-5" />
            </div>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Acessos
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={() => setActiveTab("add")}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-sm font-bold ${activeTab === "add" ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white hover:bg-white/5"}`}
            title={!isSidebarOpen ? (editingProduct ? "Editar Produto" : "Novo Produto") : undefined}
          >
            <div className="shrink-0 flex items-center justify-center w-6">
              <Plus className="w-5 h-5" />
            </div>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  {editingProduct ? "Editar Produto" : "Novo Produto"}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </nav>

        <div className="p-4 mt-auto border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-3 mb-4">
            <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
              {auth.user?.name[0]}
            </div>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex flex-col overflow-hidden whitespace-nowrap"
                >
                  <span className="text-sm font-bold truncate max-w-[120px]">{auth.user?.name}</span>
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Administrador</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all text-sm font-bold"
            title={!isSidebarOpen ? "Sair" : undefined}
          >
            <div className="shrink-0 flex items-center justify-center w-6">
              <LogOut className="w-5 h-5" />
            </div>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Sair
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto min-w-0">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-neutral-900">
              {activeTab === "stats" && "Painel de Gestão"}
              {activeTab === "products" && "Gerenciar Produtos"}
              {activeTab === "categories" && "Gerenciar Categorias"}
              {activeTab === "users" && "Controle de Acessos"}
              {activeTab === "add" && (editingProduct ? "Editar Produto" : "Adicionar Novo Produto")}
            </h1>
            <p className="text-neutral-500 mt-1">
              Bem-vindo de volta, {auth.user?.name}. Aqui está o que está acontecendo hoje.
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 bg-white border border-neutral-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-all shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Ver Site
          </button>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === "stats" && stats && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats Filters */}
              <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Filter className="w-5 h-5 text-brand" />
                  <h2 className="font-bold text-sm uppercase tracking-widest text-neutral-400">Filtros de Gestão</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Início</label>
                    <input
                      type="datetime-local"
                      value={statsFilters.start}
                      onChange={(e) => setStatsFilters({ ...statsFilters, start: e.target.value })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand/5 focus:border-brand outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Fim</label>
                    <input
                      type="datetime-local"
                      value={statsFilters.end}
                      onChange={(e) => setStatsFilters({ ...statsFilters, end: e.target.value })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand/5 focus:border-brand outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Categoria</label>
                    <select
                      value={statsFilters.category_id}
                      onChange={(e) => setStatsFilters({ ...statsFilters, category_id: e.target.value, subcategory_id: "" })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand/5 focus:border-brand outline-none"
                    >
                      <option value="">Todas</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-1">Subcategoria</label>
                    <select
                      value={statsFilters.subcategory_id}
                      onChange={(e) => setStatsFilters({ ...statsFilters, subcategory_id: e.target.value })}
                      disabled={!statsFilters.category_id}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-brand/5 focus:border-brand outline-none disabled:opacity-50"
                    >
                      <option value="">Todas</option>
                      {categories.find(c => c.id.toString() === statsFilters.category_id)?.subcategories.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {(statsFilters.start || statsFilters.end || statsFilters.category_id) && (
                  <button
                    onClick={() => setStatsFilters({ start: "", end: "", category_id: "", subcategory_id: "" })}
                    className="mt-4 text-[10px] font-bold text-brand hover:underline"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                    <Package className="w-6 h-6" />
                  </div>
                  <p className="text-neutral-500 text-sm font-medium">Total de Produtos</p>
                  <p className="text-4xl font-black mt-1">{stats.totalProducts}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                    <MousePointer2 className="w-6 h-6" />
                  </div>
                  <p className="text-neutral-500 text-sm font-medium">Cliques Totais</p>
                  <p className="text-4xl font-black mt-1">{stats.totalClicks}</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                  <h2 className="font-black text-lg">Produtos mais clicados</h2>
                  <BarChart3 className="w-5 h-5 text-neutral-400" />
                </div>
                <div className="p-6">
                  {stats.topProducts.length > 0 ? (
                    <div className="space-y-4">
                      {stats.topProducts.map((p, i) => (
                        <div key={i} className="flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <span className="w-6 text-neutral-300 font-black text-xl italic">{i + 1}</span>
                            <span className="font-bold text-neutral-700 group-hover:text-brand transition-colors">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-lg">{p.clicks}</span>
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">cliques</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-neutral-400 text-sm">Nenhum dado de clique disponível ainda.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "categories" && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black">Estrutura de Categorias</h2>
                  <button
                    onClick={() => {
                      showPrompt("Nova Categoria", "", (name) => {
                        if (name) handleAddCategory(name);
                      });
                    }}
                    className="bg-brand text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nova Categoria
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map(cat => (
                    <div key={cat.id} className="bg-neutral-50 rounded-2xl p-6 border border-neutral-100">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-brand">{cat.name}</h3>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              showPrompt("Editar Categoria", cat.name, (name) => {
                                if (name) handleEditCategory(cat.id, name);
                              });
                            }}
                            className="p-1.5 text-neutral-400 hover:text-brand transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => handleDragEnd(event, cat.id)}
                        >
                          <SortableContext
                            items={cat.subcategories.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {cat.subcategories.map(sub => (
                                <SortableSubcategory
                                  key={sub.id}
                                  sub={sub}
                                  onEdit={(id: number, name: string) => {
                                    showPrompt("Editar Subcategoria", name, (newName) => {
                                      if (newName) handleEditSubcategory(id, newName);
                                    });
                                  }}
                                  onDelete={handleDeleteSubcategory}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                        <button
                          onClick={() => {
                            showPrompt("Nova Subcategoria", "", (name) => {
                              if (name) handleAddSubcategory(name, cat.id);
                            });
                          }}
                          className="w-full py-2 border-2 border-dashed border-neutral-200 rounded-lg text-[10px] font-bold text-neutral-400 uppercase tracking-widest hover:border-brand hover:text-brand transition-all"
                        >
                          + Adicionar Sub
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "products" && (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Produto</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Categoria</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center">Cliques</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center">Destaque</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {products.map(product => (
                      <tr key={product.id} className="hover:bg-neutral-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={product.image} className="w-10 h-10 rounded-lg object-contain bg-neutral-100 p-1" referrerPolicy="no-referrer" />
                            <div>
                              <p className="font-bold text-sm text-neutral-900 line-clamp-1">{product.name}</p>
                              <div className="flex items-center gap-2">
                                {product.price_original && (
                                  <span className="text-[10px] text-neutral-400 line-through">R$ {product.price_original.toLocaleString("pt-BR")}</span>
                                )}
                                <p className="text-[10px] text-neutral-600 font-bold">R$ {product.price?.toLocaleString("pt-BR")}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold text-neutral-600 bg-neutral-100 px-2 py-1 rounded-md">
                            {product.category_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-black text-neutral-700">{product.clicks}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {product.featured === 1 ? (
                            <Check className="w-5 h-5 text-emerald-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-neutral-200 mx-auto" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(product)}
                              className="p-2 text-neutral-400 hover:text-brand hover:bg-neutral-100 rounded-lg transition-all"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteProduct(product.id)}
                              className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-black">Usuários Autorizados</h2>
                  <p className="text-sm text-neutral-500 mt-1">Gerencie quem tem acesso ao painel administrativo (AdminHub).</p>
                </div>
                <button
                  onClick={() => setShowAddUser(!showAddUser)}
                  className="bg-brand text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-transform active:scale-95"
                >
                  {showAddUser ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {showAddUser ? "Cancelar" : "Novo Admin"}
                </button>
              </div>

              <AnimatePresence>
                {showAddUser && (
                  <motion.form
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 32 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="overflow-hidden"
                    onSubmit={handleCreateAdminUser}
                  >
                    <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
                      <h3 className="font-bold text-neutral-800 mb-4 block text-sm">Cadastrar Novo Administrador</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <input
                            type="text"
                            placeholder="Nome Completo"
                            value={newUserData.name}
                            onChange={e => setNewUserData({ ...newUserData, name: e.target.value })}
                            className="w-full bg-white border border-neutral-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none"
                          />
                        </div>
                        <div>
                          <input
                            type="email"
                            placeholder="E-mail"
                            value={newUserData.email}
                            onChange={e => setNewUserData({ ...newUserData, email: e.target.value })}
                            className="w-full bg-white border border-neutral-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            placeholder="Senha"
                            value={newUserData.password}
                            onChange={e => setNewUserData({ ...newUserData, password: e.target.value })}
                            className="w-full bg-white border border-neutral-200 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-brand/10 focus:border-brand outline-none"
                          />
                          <button type="submit" className="bg-emerald-600 text-white px-4 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors whitespace-nowrap">
                            Salvar
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Usuário</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">E-mail</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-center">Admin</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {adminUsers.map(user => (
                      <tr key={user.id} className="hover:bg-neutral-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs">
                              {user.name.charAt(0)}
                            </div>
                            <span className="font-bold text-sm text-neutral-900">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-neutral-600">{user.email}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {user.is_admin === 1 ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              Administrador
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600">
                              Usuário Comum
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={`flex items-center justify-end gap-2 transition-opacity ${user.email === "topfinds.dj2@gmail.com" ? "opacity-30 cursor-not-allowed" : "opacity-0 group-hover:opacity-100"}`}>
                            {user.email !== "topfinds.dj2@gmail.com" && (
                              <button
                                onClick={() => {
                                  if (user.id === auth.user?.id) {
                                    showConfirm("Atenção", "Você está removendo seu próprio acesso. Deseja continuar?", () => toggleAdmin(user.id, user.is_admin === 1));
                                  } else {
                                    toggleAdmin(user.id, user.is_admin === 1);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${user.is_admin === 1 ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}
                              >
                                {user.is_admin === 1 ? "Remover Acesso" : "Conceder Acesso"}
                              </button>
                            )}
                            {user.email === "topfinds.dj2@gmail.com" && (
                              <span className="text-xs text-brand font-bold">Mestre</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === "add" && (
            <motion.div
              key="add"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl"
            >
              <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5 col-span-1 md:col-span-1">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Nome do Produto</label>
                    <input
                      {...register("name", { required: true })}
                      placeholder="Ex: iPhone 15 Pro Max"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand/5 focus:border-brand transition-all text-sm outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Preço Original (DE)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("price_original")}
                      placeholder="0.00"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand/5 focus:border-brand transition-all text-sm outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Preço Atual (POR)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("price", { required: true })}
                      placeholder="0.00"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand/5 focus:border-brand transition-all text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Palavras-chave (Busca Inteligente)</label>
                  <input
                    {...register("keywords")}
                    placeholder="Ex: ps5, videogame, console, sony (separadas por vírgula)"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand/5 focus:border-brand transition-all text-sm outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Descrição Curta</label>
                  <textarea
                    {...register("description", { required: true })}
                    rows={3}
                    placeholder="Descreva as principais características do produto..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand/5 focus:border-brand transition-all text-sm outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">URL da Imagem</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        {...register("image", { required: true })}
                        placeholder="https://exemplo.com/imagem.jpg"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-brand/5 focus:border-brand transition-all text-sm outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Link de Afiliado</label>
                    <div className="relative">
                      <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        {...register("link_afiliado", { required: true })}
                        placeholder="https://amazon.com.br/..."
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-brand/5 focus:border-brand transition-all text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Categoria</label>
                    <select
                      {...register("category_id", { required: true })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand/5 focus:border-brand transition-all text-sm outline-none appearance-none"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Subcategoria</label>
                    <select
                      {...register("subcategory_id", { required: true })}
                      disabled={!selectedCategoryId}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand/5 focus:border-brand transition-all text-sm outline-none appearance-none disabled:opacity-50"
                    >
                      <option value="">Selecione uma subcategoria</option>
                      {selectedCategory?.subcategories.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Tag Personalizada (Opcional)</label>
                    <input
                      {...register("tag_label")}
                      placeholder="Ex: Oferta Relâmpago"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand/5 focus:border-brand transition-all text-sm outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Cor da Tag</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        {...register("tag_color")}
                        className="w-12 h-12 rounded-xl border-none p-0 overflow-hidden cursor-pointer"
                      />
                      <span className="text-xs text-neutral-500 font-medium">Selecione a cor de fundo da tag</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <input
                    type="checkbox"
                    id="featured"
                    {...register("featured")}
                    className="w-5 h-5 rounded-md border-neutral-300 text-brand focus:ring-brand"
                  />
                  <label htmlFor="featured" className="text-sm font-bold text-neutral-700 flex items-center gap-2 cursor-pointer">
                    <Tag className="w-4 h-4 text-amber-500" />
                    Destacar este produto na página inicial
                  </label>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-brand text-white font-bold py-4 rounded-xl hover:bg-brand/90 transition-all active:scale-[0.98] shadow-xl shadow-brand/10"
                  >
                    {editingProduct ? "Salvar Alterações" : "Cadastrar Produto"}
                  </button>
                  {editingProduct && (
                    <button
                      type="button"
                      onClick={() => { setEditingProduct(null); reset(); setActiveTab("products"); }}
                      className="px-8 bg-neutral-100 text-neutral-600 font-bold py-4 rounded-xl hover:bg-neutral-200 transition-all"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Custom Modal */}
      <AnimatePresence>
        {modalConfig.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  {modalConfig.type === 'alert' && <AlertTriangle className="w-6 h-6 text-amber-500" />}
                  <h3 className="text-xl font-black text-neutral-900">{modalConfig.title}</h3>
                </div>

                {modalConfig.message && (
                  <p className="text-neutral-600 text-sm mb-6">{modalConfig.message}</p>
                )}

                {modalConfig.type === 'prompt' && (
                  <input
                    type="text"
                    autoFocus
                    value={modalConfig.inputValue}
                    onChange={(e) => setModalConfig({ ...modalConfig, inputValue: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && modalConfig.inputValue?.trim()) {
                        modalConfig.onConfirm?.(modalConfig.inputValue.trim());
                        closeModal();
                      }
                    }}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-brand/5 focus:border-brand transition-all text-sm outline-none mb-6"
                    placeholder="Digite aqui..."
                  />
                )}

                <div className="flex items-center justify-end gap-3">
                  {modalConfig.type !== 'alert' && (
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 rounded-xl text-sm font-bold text-neutral-500 hover:bg-neutral-100 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (modalConfig.type === 'prompt') {
                        if (modalConfig.inputValue?.trim()) {
                          modalConfig.onConfirm?.(modalConfig.inputValue.trim());
                          closeModal();
                        }
                      } else {
                        modalConfig.onConfirm?.();
                        closeModal();
                      }
                    }}
                    className="px-6 py-2 bg-brand text-white rounded-xl text-sm font-bold hover:bg-brand/90 transition-colors shadow-lg shadow-brand/20"
                  >
                    {modalConfig.type === 'alert' ? 'OK' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
