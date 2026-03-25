import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAdmin() {
  const email = "topfinds.dj2@gmail.com";
  const password = "TopFinds@2026";

  console.log(`Buscando usuário: ${email}`);
  
  // Apaga usuário se existir (para garantir recriação limpa)
  const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  if (existingUser) {
    console.log(`Usuário antigo encontrado (ID: ${existingUser.id}). Apagando...`);
    await supabase.from('users').delete().eq('id', existingUser.id);
  } else {
    console.log("Nenhum usuário antigo encontrado. Criando um novo...");
  }

  // Insere novo
  console.log("Gerando hash seguro para a senha...");
  const hashedPassword = bcrypt.hashSync(password, 10);

  console.log("Inserindo Administrador Mestre...");
  const { data, error } = await supabase.from('users').insert([{
    name: 'Administrador Mestre',
    email: email,
    password: hashedPassword,
    is_admin: 1
  }]).select().single();

  if (error) {
    console.error("Erro ao inserir usuário:", error);
    process.exit(1);
  } else {
    console.log(`Sucesso! Administrador Mestre inserido. ID: ${data.id}`);
    console.log(`Login para usar: ${email}`);
    console.log(`Senha: ${password}`);
  }
}

fixAdmin().catch(console.error);
