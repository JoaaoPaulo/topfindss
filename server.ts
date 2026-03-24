import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config(); // Load before everything 

import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || "https://muagiwdidfahamwptqlf.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "sb_publishable_J4bgcE-hJjShw8Xqss_0OQ_vNJHMicK";

if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL e SUPABASE_ANON_KEY precisam estar configurados no .env");
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth Middleware
  const authenticate = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);

      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, is_admin')
        .eq('id', decoded.id)
        .single();

      if (error || !user) {
        return res.status(401).json({ error: "User not found" });
      }
      req.user = user;
      next();
    } catch (e) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user || req.user.is_admin !== 1) {
      return res.status(403).json({ error: "Forbidden: Admins only" });
    }
    next();
  };

  // API Routes
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error || !user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, is_admin: user.is_admin === 1 } });
  });

  app.post("/api/register", async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const { data: valUser } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
      if (valUser) return res.status(400).json({ error: "E-mail já cadastrado" });

      const hashedPassword = bcrypt.hashSync(password, 10);
      const { data: result, error } = await supabase
        .from('users')
        .insert([{ name, email, password: hashedPassword, is_admin: 0 }])
        .select()
        .single();

      if (error) throw error;

      const token = jwt.sign({ id: result.id }, JWT_SECRET, { expiresIn: "1d" });
      res.json({ token, user: { id: result.id, name, email, is_admin: false } });
    } catch (e) {
      res.status(400).json({ error: "Erro ao registrar usuário" });
    }
  });

  app.get("/api/auth/me", authenticate, async (req: any, res) => {
    const { data: user, error } = await supabase.from('users').select('id, name, email, is_admin').eq('id', req.user.id).single();
    if (error || !user) return res.status(404).json({ error: "User not found" });
    res.json({ user: { ...user, is_admin: user.is_admin === 1 } });
  });

  // Users Management (Admin Only)
  app.get("/api/admin/users", authenticate, requireAdmin, async (req, res) => {
    const { data: users, error } = await supabase.from('users').select('id, name, email, is_admin').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: "Failed to fetch users" });
    res.json(users);
  });

  app.post("/api/admin/users/:id/toggle-admin", authenticate, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { is_admin } = req.body;

    // Prevent removing master admin
    if (Number(id) === 1 || is_admin === false) {
      const { data: user } = await supabase.from('users').select('email').eq('id', id).single();
      if (user && user.email === "topfinds.dj2@gmail.com") {
        return res.status(400).json({ error: "Cannot modify access for master admin" });
      }
    }

    const { error } = await supabase.from('users').update({ is_admin: is_admin ? 1 : 0 }).eq('id', id);
    if (error) return res.status(500).json({ error: "Update failed" });
    res.json({ success: true });
  });

  app.post("/api/admin/users/create", authenticate, requireAdmin, async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const { data: valUser } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      if (valUser) return res.status(400).json({ error: "E-mail já está em uso" });

      const hashedPassword = bcrypt.hashSync(password, 10);
      const { error } = await supabase.from('users').insert([{ name, email, password: hashedPassword, is_admin: 1 }]);
      if (error) throw error;

      res.status(201).json({ message: "Administrador criado com sucesso" });
    } catch (e) {
      res.status(400).json({ error: "Erro ao criar novo administrador" });
    }
  });

  // Categories & Subcategories
  // Categories & Subcategories
  app.get("/api/categories", async (req, res) => {
    const { data: cats, error: catError } = await supabase.from('categories').select('*');
    if (catError) return res.status(500).json({ error: "Failed to fetch categories" });

    const { data: subcats, error: subError } = await supabase.from('subcategories').select('*').order('order_index', { ascending: true });
    if (subError) return res.status(500).json({ error: "Failed to fetch subcategories" });

    const result = cats.map((cat: any) => ({
      ...cat,
      subcategories: subcats.filter((sub: any) => sub.category_id === cat.id)
    }));
    res.json(result);
  });

  app.post("/api/categories", authenticate, requireAdmin, async (req, res) => {
    const { name } = req.body;
    try {
      const { data, error } = await supabase.from('categories').insert([{ name }]).select().single();
      if (error) throw error;
      res.json({ id: data.id });
    } catch (e) {
      res.status(400).json({ error: "Category already exists" });
    }
  });

  app.put("/api/categories/:id", authenticate, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const { error } = await supabase.from('categories').update({ name }).eq('id', id);
    if (error) return res.status(400).json({ error: "Update failed" });
    res.json({ success: true });
  });

  app.delete("/api/categories/:id", authenticate, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) return res.status(400).json({ error: "Delete failed" });
    res.json({ success: true });
  });

  app.post("/api/subcategories", authenticate, requireAdmin, async (req, res) => {
    const { name, category_id } = req.body;
    try {
      const { data: maxOrder } = await supabase
        .from('subcategories')
        .select('order_index')
        .eq('category_id', category_id)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (maxOrder?.order_index || 0) + 1;

      const { data, error } = await supabase
        .from('subcategories')
        .insert([{ name, category_id, order_index: nextOrder }])
        .select()
        .single();

      if (error) throw error;
      res.json({ id: data.id });
    } catch (e) {
      res.status(400).json({ error: "Subcategory already exists in this category" });
    }
  });

  app.post("/api/subcategories/reorder", authenticate, requireAdmin, async (req, res) => {
    const { subcategories } = req.body; // Array of { id, order_index }

    // Supabase does not have true batch update, so we map update promises
    const updates = subcategories.map((item: any) =>
      supabase.from('subcategories').update({ order_index: item.order_index }).eq('id', item.id)
    );

    await Promise.all(updates);
    res.json({ success: true });
  });

  app.put("/api/subcategories/:id", authenticate, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const { error } = await supabase.from('subcategories').update({ name }).eq('id', id);
    if (error) return res.status(400).json({ error: "Update failed" });
    res.json({ success: true });
  });

  app.delete("/api/subcategories/:id", authenticate, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('subcategories').delete().eq('id', id);
    if (error) return res.status(400).json({ error: "Delete failed" });
    res.json({ success: true });
  });

  // Products
  app.get("/api/products", async (req, res) => {
    const { category, subcategory, featured, search } = req.query;

    let query = supabase
      .from('products')
      .select('*, categories(name), subcategories(name)')
      .order('created_at', { ascending: false });

    if (category) query = query.eq('category_id', category);
    if (subcategory) query = query.eq('subcategory_id', subcategory);
    if (featured === "true") query = query.eq('featured', 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,keywords.ilike.%${search}%`);
    }

    const { data: products, error } = await query;
    if (error) return res.status(500).json({ error: "Failed to fetch products" });

    // Format top match SQLite structure "category_name" & "subcategory_name"
    const formatted = products.map((p: any) => ({
      ...p,
      category_name: p.categories?.name,
      subcategory_name: p.subcategories?.name
    }));

    res.json(formatted);
  });

  app.post("/api/products", authenticate, requireAdmin, async (req, res) => {
    const { name, description, image, price, price_original, keywords, link_afiliado, category_id, subcategory_id, featured, tag_label, tag_color } = req.body;

    const { data: result, error } = await supabase
      .from('products')
      .insert([{
        name, description, image, price, price_original, keywords, link_afiliado, category_id, subcategory_id, featured: featured ? 1 : 0, tag_label, tag_color
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: "Failed to save product" });
    res.json({ id: result.id });
  });

  app.put("/api/products/:id", authenticate, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, description, image, price, price_original, keywords, link_afiliado, category_id, subcategory_id, featured, tag_label, tag_color } = req.body;

    const { error } = await supabase
      .from('products')
      .update({ name, description, image, price, price_original, keywords, link_afiliado, category_id, subcategory_id, featured: featured ? 1 : 0, tag_label, tag_color })
      .eq('id', id);

    if (error) return res.status(500).json({ error: "Update failed" });
    res.json({ success: true });
  });

  app.delete("/api/products/:id", authenticate, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return res.status(500).json({ error: "Delete failed" });
    res.json({ success: true });
  });

  // Click Tracking
  app.post("/api/products/:id/click", async (req, res) => {
    const { id } = req.params;

    // Increment clicks using rpc or two queries
    // Usually Supabase recommends RPC for increment: `CREATE OR REPLACE FUNCTION increment_click(row_id bigint) RETURNS void...`
    // Alternatively, fetch and update:
    const { data } = await supabase.from('products').select('clicks').eq('id', id).single();
    if (data) {
      await supabase.from('products').update({ clicks: (data.clicks || 0) + 1 }).eq('id', id);
    }

    await supabase.from('clicks_log').insert([{ product_id: id }]);

    res.json({ success: true });
  });

  // Stats
  // Since complex aggregations with dynamic WHEREs are hard with pure PostgREST (Supabase Client),
  // we will fetch necessary data and aggregate in JS for simplicity, or use simple counts.
  app.get("/api/stats", authenticate, async (req, res) => {
    const { start, end, category_id, subcategory_id } = req.query;

    // 1. Total Products Count
    let productsQuery = supabase.from('products').select('id', { count: 'exact', head: true });
    if (category_id) productsQuery = productsQuery.eq('category_id', category_id);
    if (subcategory_id) productsQuery = productsQuery.eq('subcategory_id', subcategory_id);
    const { count: totalProducts } = await productsQuery;

    // 2. Fetch Clicks Log for total clicks and top products aggregation
    let clicksQuery = supabase
      .from('clicks_log')
      .select('product_id, products!inner(id, name, category_id, subcategory_id)');

    if (start) clicksQuery = clicksQuery.gte('created_at', start);
    if (end) clicksQuery = clicksQuery.lte('created_at', end);
    if (category_id) clicksQuery = clicksQuery.eq('products.category_id', category_id);
    if (subcategory_id) clicksQuery = clicksQuery.eq('products.subcategory_id', subcategory_id);

    const { data: clicksData, error: clicksError } = await clicksQuery;

    if (clicksError) return res.status(500).json({ error: "Failed to load stats" });

    const totalClicks = clicksData.length;

    // Aggregate Top Products in memory
    const productCounts: Record<string, { name: string, clicks: number }> = {};

    clicksData.forEach((click: any) => {
      const pid = click.product_id;
      if (!productCounts[pid]) {
        productCounts[pid] = { name: click.products.name, clicks: 0 };
      }
      productCounts[pid].clicks++;
    });

    const topProducts = Object.values(productCounts)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    res.json({
      totalProducts: totalProducts || 0,
      totalClicks: totalClicks,
      topProducts
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = parseInt(process.env.PORT || "3000", 10);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
