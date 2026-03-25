import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const categoryTree: Record<string, string[]> = {
  "Eletrônicos & Tecnologia": [
    "Celulares e Smartphones",
    "Informática e Laptops",
    "Tablets e iPads",
    "Smartwatches e Wearables",
    "Áudio e Fones de Ouvido",
    "Consoles e Games",
    "Câmeras e Fotografia",
    "Acessórios Tech"
  ],
  "Casa & Decoração": [
    "Móveis para Sala",
    "Quarto e Colchões",
    "Cozinha e Utensílios",
    "Banheiro",
    "Iluminação",
    "Decoração e Quadros",
    "Cama, Mesa e Banho",
    "Jardim e Área Externa"
  ],
  "Eletrodomésticos": [
    "Geladeiras e Freezers",
    "Fogões e Cooktops",
    "Máquinas de Lavar",
    "Micro-ondas",
    "Ar Condicionado e Ventilação",
    "Eletroportáteis",
    "Aspiradores e Limpeza"
  ],
  "Beleza & Saúde": [
    "Maquiagem",
    "Cuidados com o Cabelo",
    "Perfumes Importados",
    "Skincare e Rosto",
    "Cuidados Pessoais",
    "Suplementos e Vitaminas",
    "Saúde e Bem-estar"
  ],
  "Moda & Acessórios": [
    "Roupas Femininas",
    "Roupas Masculinas",
    "Calçados",
    "Relógios",
    "Óculos de Sol",
    "Bolsas e Mochilas",
    "Joias e Bijuterias"
  ],
  "Esportes & Lazer": [
    "Academia e Fitness",
    "Ciclismo e Bikes",
    "Camping e Aventura",
    "Tênis Esportivos",
    "Futebol e Coletivos",
    "Pesca e Náutica"
  ],
  "Bebês & Crianças": [
    "Brinquedos",
    "Roupas Infantis",
    "Carrinhos e Cadeirinhas",
    "Higiene e Banho",
    "Enxoval e Quarto",
    "Jogos Educativos"
  ],
  "Automotivo": [
    "Acessórios Externos",
    "Acessórios Internos",
    "Som e Vídeo",
    "Pneus e Rodas",
    "Manutenção e Ferramentas",
    "Capacetes e Moto"
  ],
  "Pets": [
    "Cães",
    "Gatos",
    "Peixes e Aquário",
    "Aves",
    "Rações e Petiscos",
    "Brinquedos e Acessórios"
  ],
  "Papelaria & Escritório": [
    "Cadeiras e Móveis",
    "Material Escolar",
    "Escrita e Desenho",
    "Cadernos e Agendas",
    "Organização",
    "Impressoras e Tintas"
  ],
  "Livros & Cultura": [
    "Literatura Brasileira",
    "Best Sellers",
    "HQs e Mangás",
    "Autoajuda",
    "Negócios e Carreira",
    "Instrumentos Musicais"
  ],
  "Ferramentas & Construção": [
    "Ferramentas Elétricas",
    "Ferramentas Manuais",
    "Pintura e Reforma",
    "Segurança e EPI",
    "Hidráulica",
    "Material Elétrico"
  ]
};

async function seed() {
  console.log('🚀 Iniciando seeding de categorias...');

  for (const [catName, subcats] of Object.entries(categoryTree)) {
    console.log(`\n📂 Categoria: ${catName}`);
    
    // Check/Insert Category
    let { data: cat, error: catErr } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', catName)
      .maybeSingle();

    if (!cat) {
      const { data: newCat, error: insertErr } = await supabase
        .from('categories')
        .insert([{ name: catName }])
        .select()
        .single();
      
      if (insertErr) {
        console.error(`❌ Erro ao criar categoria ${catName}:`, insertErr.message);
        continue;
      }
      cat = newCat;
      console.log(`✅ Categoria ${catName} criada.`);
    } else {
      console.log(`ℹ️ Categoria ${catName} já existe.`);
    }

    // Insert Subcategories
    for (const subName of subcats) {
      const { data: existingSub } = await supabase
        .from('subcategories')
        .select('id')
        .ilike('name', subName)
        .eq('category_id', cat.id)
        .maybeSingle();

      if (!existingSub) {
        const { error: subErr } = await supabase
          .from('subcategories')
          .insert([{ name: subName, category_id: cat.id }]);
        
        if (subErr) {
          console.error(`  ❌ Erro na subcategoria ${subName}:`, subErr.message);
        } else {
          console.log(`  ✅ Subcategoria ${subName} adicionada.`);
        }
      } else {
        console.log(`  ℹ️ Subcategoria ${subName} já existe.`);
      }
    }
  }

  console.log('\n✨ Seeding finalizado com sucesso!');
}

seed().catch(err => {
  console.error('💥 Erro crítico no seeding:', err);
  process.exit(1);
});
