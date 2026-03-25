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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("SUPABASE_URL e SUPABASE_ANON_KEY precisam estar configurados no .env");
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth Middleware (BYPASS ENABLED)
  const authenticate = async (req: any, res: any, next: any) => {
    // Mock user for bypass
    req.user = { id: 1, email: "admin@bypass.com", is_admin: 1, name: "Admin Convidado" };
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    // Bypass admin check
    next();
  };

  // API Routes
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    console.log(`[LOGIN] Tentativa de login para: ${email}`);
    
    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
    
    if (error) {
      console.error("[LOGIN] Erro ao buscar usuário no Supabase:", error.message, "| Code:", error.code);
      return res.status(401).json({ error: "Credenciais inválidas" });
    }
    
    if (!user) {
      console.warn("[LOGIN] Usuário não encontrado:", email);
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    console.log(`[LOGIN] Usuário encontrado: ID=${user.id}, is_admin=${user.is_admin}, hash_length=${user.password?.length}`);

    const isPasswordCorrect = bcrypt.compareSync(password, user.password);
    console.log(`[LOGIN] Senha correta? ${isPasswordCorrect}`);

    if (!isPasswordCorrect) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, is_admin: !!user.is_admin } });
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
    res.json({ user: { ...user, is_admin: !!user.is_admin } });
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

  // Bulk Import Endpoint
  app.post("/api/admin/products/import-process", authenticate, requireAdmin, async (req, res) => {
    const { link_produto: rawLink, link_afiliado, marketplace } = req.body;
    const link_produto = rawLink?.trim();

    if (!link_produto || !link_afiliado) {
      return res.status(400).json({ status: 'error', message: 'Link do produto e link de afiliado são obrigatórios.' });
    }

    try {
      // 1. Check for duplicates
      const { data: existing } = await supabase
        .from('products')
        .select('id, name')
        .eq('keywords', link_produto)
        .maybeSingle();

      if (existing) {
        return res.status(200).json({ 
          status: 'duplicate', 
          message: `Produto já cadastrado: ${existing.name}`, 
          product_id: existing.id 
        });
      }

      // --- STEALTH LOGIC (Improved) ---
      const UAs = [
        { ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", browser: 'chrome' },
        { ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36", browser: 'chrome' },
        { ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/124.0.0.0 Safari/537.36", browser: 'edge' },
        { ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0", browser: 'firefox' }
      ];
      const selected = UAs[Math.floor(Math.random() * UAs.length)];

      // --- MOBILE-FIRST STEALTH ---
      const baseHeaders: any = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Referer': 'https://www.google.com/',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };

      // 2. Fetch and Scrape
      console.log(`[IMPORT] Scraping (Mobile): ${link_produto}`);
      
      let response;
      try {
        response = await fetch(link_produto, { 
          headers: baseHeaders,
          signal: (AbortSignal as any).timeout(20000)
        });
      } catch (fetchErr: any) {
        console.error(`[IMPORT ERROR] Rede:`, fetchErr.message);
        return res.status(200).json({ status: 'error', message: `Rede: ${fetchErr.message}` });
      }
      
      let html = "";
      if (response.ok) {
        html = await response.text();
      }

      // DEBUG: Log first bit of HTML to console
      // console.log(`[IMPORT DEBUG] HTML Start: ${html.slice(0, 300).replace(/\n/g, ' ')}`);

      // Extract Meta Tags (Greddy Multiline safe)
      const getMeta = (prop: string) => {
        // [^>]*? [\s\S]*? to handle any attribute order and newlines
        const r1 = new RegExp(`<meta[^>]*?(?:property|name)=["'](?:og:|product:|)${prop}["'][^>]*?content=["']([^"']+)["']`, 'i');
        const r2 = new RegExp(`<meta[^>]*?content=["']([^"']+)["'][^>]*?(?:property|name)=["'](?:og:|product:|)${prop}["']`, 'i');
        return html.match(r1)?.[1] || html.match(r2)?.[1] || "";
      };

      let rawTitle = getMeta('title') || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.split('|')[0].trim() || "";
      let image = getMeta('image');
      let description = getMeta('description');
      
      // Price Extraction (Multiple fallbacks with sanitization)
      let priceStr = getMeta('price:amount');
      if (!priceStr || priceStr === "0") {
         priceStr = html.match(/"price":\s*["']?([\d.,]+)["']?/i)?.[1] || "0";
      }
      if (!priceStr || priceStr === "0") {
         // UI Fallback (Andes component)
         const fraction = html.match(/class=["']andes-money-amount__fraction["'][^>]*>([\d.,]+)<\/span>/i)?.[1];
         const cents = html.match(/class=["']andes-money-amount__cents[^>]*>([\d]+)<\/span>/i)?.[1] || "00";
         if (fraction) priceStr = `${fraction}.${cents}`;
      }
      
      const cleanPrice = priceStr.replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.');
      const price = parseFloat(cleanPrice) || 0;

      // --- HEURISTIC FALLBACKS ---
      if (!rawTitle || rawTitle.toLowerCase().includes("atendimento") || rawTitle.toLowerCase() === "mercado livre") {
        const urlObj = new URL(link_produto);
        const parts = urlObj.pathname.split('/');
        const slug = parts[1] === 'p' ? parts[parts.length - 1] : parts[1];
        if (slug && slug.length > 5 && !slug.includes('.php')) {
          rawTitle = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        }
      }

      if (!image) {
        const imgMatch = html.match(/https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[^"']+-[OF]\.(?:webp|jpg)/i);
        image = imgMatch ? imgMatch[0] : "";
      }

      // --- VALIDATION ---
      const genericTerms = ["mercado livre", "mercadolivre", "amazon.com.br", "shopee"];
      const isGeneric = !rawTitle || (genericTerms.includes(rawTitle.toLowerCase()) && !image);
      
      if (isGeneric) {
        return res.status(200).json({ 
          status: 'error', 
          message: `Bloqueio ou Link Inválido. HTML: ${html.slice(0, 50).replace(/[^a-z0-9 ]/gi, '')}...`,
          link: link_produto 
        });
      }
      if (!image) image = "https://via.placeholder.com/500?text=Imagem+Nao+Encontrada";
      const title = rawTitle;

      // 3. Category Logic
      let categoryName = "Variedades";
      let subcategoryName = "Geral";

      // Method 1: Breadcrumbs (Strong for ML)
      const bcMatches = Array.from(html.matchAll(/class=["']andes-breadcrumb__link["'][^>]*>([^<]+)<\/a>/gi));
      if (bcMatches && bcMatches.length >= 1) {
        const items = bcMatches.map(m => m[1].trim());
        categoryName = items[0] || categoryName;
        subcategoryName = items[items.length - 1] || items[1] || subcategoryName;
      } else {
        // Method 2: JSON-LD fallback
        const ldMatches = html.match(/<script type=["']application\/ld\+json["']>([^<]+)<\/script>/gi);
        // ... (rest of JSON-LD logic I'll keep but cleaner)
        if (ldMatches) {
          for (const match of ldMatches) {
            try {
              const content = match.replace(/<script[^>]*>|<\/script>/gi, '');
              const json = JSON.parse(content);
              const list = Array.isArray(json) ? json.find(i => i['@type'] === 'BreadcrumbList') : (json['@type'] === 'BreadcrumbList' ? json : null);
              if (list && list.itemListElement) {
                const items = list.itemListElement.map((i: any) => i.name || (i.item && i.item.name)).filter(Boolean);
                if (items.length >= 2) {
                  categoryName = items[0] || categoryName;
                  subcategoryName = items[items.length - 1] || subcategoryName;
                  break;
                }
              }
            } catch(e) {}
          }
        }
      }

      // Method 2: Marketplace specific fallbacks (if JSON-LD failed)
      if (categoryName === "Variedades") {
        if (link_produto.includes('mercadolivre.com.br')) {
          const mlBreadMatch = html.match(/class=["']andes-breadcrumb__item["'][^>]*>\s*<a[^>]*>([^<]+)<\/a>/gi);
          if (mlBreadMatch) {
            const items = mlBreadMatch.map(m => m.match(/>([^<]+)<\/a>/)?.[1].trim()).filter(Boolean);
            if (items.length >= 2) {
              categoryName = items[0];
              subcategoryName = items[1];
            }
          }
        } else if (link_produto.includes('amazon.com.br')) {
          const amzBreadMatch = html.match(/class=["']a-link-normal a-color-tertiary["'][^>]*>\s*([^<]+)\s*<\/a>/gi);
          if (amzBreadMatch) {
            const items = amzBreadMatch.map(m => m.match(/>([^<]+)<\/a>/)?.[1].trim()).filter(Boolean);
            if (items.length >= 2) {
              categoryName = items[0];
              subcategoryName = items[1];
            }
          }
        }
      }

      // Ensure Category exists (Trim to avoid subtle duplicates)
      categoryName = categoryName.trim();
      subcategoryName = subcategoryName.trim();

      let { data: cat } = await supabase.from('categories').select('id').ilike('name', categoryName).maybeSingle();
      if (!cat) {
        const { data: newCat, error: catErr } = await supabase.from('categories').insert([{ name: categoryName }]).select().single();
        if (catErr) throw catErr;
        cat = newCat;
      }

      // Ensure Subcategory exists
      let { data: sub } = await supabase.from('subcategories').select('id').ilike('name', subcategoryName).eq('category_id', cat.id).maybeSingle();
      if (!sub) {
        const { data: newSub, error: subErr } = await supabase.from('subcategories').insert([{ name: subcategoryName, category_id: cat.id }]).select().single();
        if (subErr) throw subErr;
        sub = newSub;
      }

      // 4. Create Product
      const { data: result, error: prodErr } = await supabase
        .from('products')
        .insert([{
          name: title,
          description: description,
          image: image,
          price: price,
          price_original: price * 1.2, // Placeholder for discount look
          link_afiliado: link_afiliado,
          keywords: link_produto, // Using keywords column to store source link for duplicate detection
          category_id: cat.id,
          subcategory_id: sub.id,
          featured: 0
        }])
        .select()
        .single();

      if (prodErr) throw prodErr;

      res.json({ status: 'success', product: result });

    } catch (err: any) {
      console.error(`[IMPORT ERROR] ${link_produto}:`, err.message);
      res.status(500).json({ status: 'error', message: err.message });
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

  app.delete("/api/admin/products/all", authenticate, requireAdmin, async (req, res) => {
    try {
      const { error } = await supabase.from('products').delete().gt('id', 0);
      if (error) throw error;
      res.json({ success: true, message: "Todos os produtos foram removidos." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
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

  // [TEMPORARY SEED] API to trigger seeding
  app.get("/api/admin/trigger-seed-categories", authenticate, requireAdmin, async (req, res) => {
    // ... logic already there, I'll just keep it but also run on start
    res.json({ message: "Seeding is also running on startup." });
  });

  const PORT = parseInt(process.env.PORT || "3000", 10);
  
  // Running seed on start
  (async () => {
    const categoryTree: Record<string, string[]> = {
      "Eletrônicos & Tecnologia": ["Celulares e Smartphones", "Informática e Laptops", "Tablets e iPads", "Smartwatches e Wearables", "Áudio e Fones de Ouvido", "Consoles e Games", "Câmeras e Fotografia", "Acessórios Tech"],
      "Casa & Decoração": ["Móveis para Sala", "Quarto e Colchões", "Cozinha e Utensílios", "Banheiro", "Iluminação", "Decoração e Quadros", "Cama, Mesa e Banho", "Jardim e Área Externa"],
      "Eletrodomésticos": ["Geladeiras e Freezers", "Fogões e Cooktops", "Máquinas de Lavar", "Micro-ondas", "Ar Condicionado e Ventilação", "Eletroportáteis", "Aspiradores e Limpeza"],
      "Beleza & Saúde": ["Maquiagem", "Cuidados com o Cabelo", "Perfumes Importados", "Skincare e Rosto", "Cuidados Pessoais", "Suplementos e Vitaminas", "Saúde e Bem-estar"],
      "Moda & Acessórios": ["Roupas Femininas", "Roupas Masculinas", "Calçados", "Relógios", "Óculos de Sol", "Bolsas e Mochilas", "Joias e Bijuterias"],
      "Esportes & Lazer": ["Academia e Fitness", "Ciclismo e Bikes", "Camping e Aventura", "Tênis Esportivos", "Futebol e Coletivos", "Pesca e Náutica"],
      "Bebês & Crianças": ["Brinquedos", "Roupas Infantis", "Carrinhos e Cadeirinhas", "Higiene e Banho", "Enxoval e Quarto", "Jogos Educativos"],
      "Automotivo": ["Acessórios Externos", "Acessórios Internos", "Som e Vídeo", "Pneus e Rodas", "Manutenção e Ferramentas", "Capacetes e Moto"],
      "Pets": ["Cães", "Gatos", "Peixes e Aquário", "Aves", "Rações e Petiscos", "Brinquedos e Acessórios"],
      "Papelaria & Escritório": ["Cadeiras e Móveis", "Material Escolar", "Escrita e Desenho", "Cadernos e Agendas", "Organização", "Impressoras e Tintas"],
      "Livros & Cultura": ["Literatura Brasileira", "Best Sellers", "HQs e Mangás", "Autoajuda", "Negócios e Carreira", "Instrumentos Musicais"],
      "Ferramentas & Construção": ["Ferramentas Elétricas", "Ferramentas Manuais", "Pintura e Reforma", "Segurança e EPI", "Hidráulica", "Material Elétrico"]
    };
    
    console.log('🌱 Start-up Seed: Verificando categorias...');
    for (const [catName, subcats] of Object.entries(categoryTree)) {
      let { data: cat } = await supabase.from('categories').select('id').ilike('name', catName).maybeSingle();
      if (!cat) {
        const { data: newCat } = await supabase.from('categories').insert([{ name: catName }]).select().single();
        cat = newCat;
      }
      if (cat) {
        for (const subName of subcats) {
          const { data: existingSub } = await supabase.from('subcategories').select('id').ilike('name', subName).eq('category_id', cat.id).maybeSingle();
          if (!existingSub) {
            await supabase.from('subcategories').insert([{ name: subName, category_id: cat.id }]);
          }
        }
      }
    }
    console.log('✅ Categorias sincronizadas.');
  })();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
