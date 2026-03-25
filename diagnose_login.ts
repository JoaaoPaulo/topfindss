import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log("=== DIAGNÓSTICO DE LOGIN ===\n");
console.log(`SUPABASE_URL: ${supabaseUrl ? "✅ Configurado" : "❌ Não configurado"}`);
console.log(`SUPABASE_ANON_KEY: ${supabaseKey ? "✅ Configurado" : "❌ Não configurado"}`);
console.log(`Key type: ${supabaseKey?.substring(0, 20)}...`);

if (!supabaseUrl || !supabaseKey) {
  console.error("\n❌ Variáveis de ambiente faltando!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  const email = "topfinds.dj2@gmail.com";
  const password = "TopFinds@2026";

  console.log(`\n--- Buscando usuário: ${email} ---`);
  
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.error("❌ Erro ao buscar usuário:", error.message);
    console.error("   Código:", error.code);
    console.error("   Detalhes:", error.details);
    console.error("   Dica:", error.hint);
    
    // Try listing all users
    console.log("\n--- Tentando listar todos os usuários ---");
    const { data: allUsers, error: listError } = await supabase
      .from('users')
      .select('id, email, is_admin');
    
    if (listError) {
      console.error("❌ Erro ao listar usuários:", listError.message);
      console.error("   Isso pode indicar problema de RLS ou tabela inexistente.");
    } else {
      console.log(`Total de usuários: ${allUsers?.length || 0}`);
      allUsers?.forEach(u => console.log(`  - ID: ${u.id}, Email: ${u.email}, Admin: ${u.is_admin}`));
    }
    return;
  }

  if (!user) {
    console.log("❌ Usuário não encontrado no banco!");
    return;
  }

  console.log("✅ Usuário encontrado!");
  console.log(`   ID: ${user.id}`);
  console.log(`   Nome: ${user.name}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   is_admin: ${user.is_admin} (tipo: ${typeof user.is_admin})`);
  console.log(`   Hash armazenado: ${user.password}`);

  console.log(`\n--- Testando senha: "${password}" ---`);
  const isMatch = bcrypt.compareSync(password, user.password);
  console.log(`Resultado bcrypt.compareSync: ${isMatch ? "✅ MATCH" : "❌ NÃO MATCH"}`);

  if (!isMatch) {
    console.log("\n--- Gerando novo hash para comparação ---");
    const newHash = bcrypt.hashSync(password, 10);
    console.log(`Novo hash gerado: ${newHash}`);
    console.log(`Hash antigo:       ${user.password}`);
    console.log("\n⚠️  A senha armazenada no banco NÃO corresponde à senha esperada.");
    console.log("   Possíveis causas:");
    console.log("   1. A senha foi alterada");
    console.log("   2. O hash foi corrompido");
    console.log("   3. O fix_admin.ts não foi executado corretamente");
  }
}

diagnose().catch(console.error);
