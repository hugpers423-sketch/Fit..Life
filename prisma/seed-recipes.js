const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const RECIPES = [
  { day: 1, name: "Quinua con pollo y verduras", videoUrl: "https://www.youtube.com/results?search_query=quinua+con+pollo+receta", calories: 520, proteinG: 38, ingredients: [{ name: "Quinua (100g)", qty: "100g", price: 2.5 }, { name: "Pechuga de pollo (150g)", qty: "150g", price: 4.5 }, { name: "Verduras mixtas", qty: "200g", price: 2.0 }, { name: "Aceite de oliva", qty: "1 cda", price: 0.5 }] },
  { day: 2, name: "Lomo saltado saludable", videoUrl: "https://www.youtube.com/results?search_query=lomo+saltado+saludable", calories: 610, proteinG: 35, ingredients: [{ name: "Lomo fino (150g)", qty: "150g", price: 7.0 }, { name: "Papa amarilla (1 und)", qty: "1 und", price: 1.0 }, { name: "Cebolla y tomate", qty: "150g", price: 1.5 }, { name: "Arroz integral (80g)", qty: "80g", price: 1.2 }] },
  { day: 3, name: "Ensalada de atún con palta", videoUrl: "https://www.youtube.com/results?search_query=ensalada+atun+palta", calories: 430, proteinG: 32, ingredients: [{ name: "Atún en agua (1 lata)", qty: "1 lata", price: 4.0 }, { name: "Palta (1/2 und)", qty: "1/2 und", price: 2.0 }, { name: "Lechuga y tomate", qty: "200g", price: 2.0 }, { name: "Limón y oliva", qty: "c/n", price: 0.5 }] },
  { day: 4, name: "Pollo a la plancha con camote", videoUrl: "https://www.youtube.com/results?search_query=pollo+plancha+camote", calories: 540, proteinG: 40, ingredients: [{ name: "Pechuga de pollo (180g)", qty: "180g", price: 5.4 }, { name: "Camote (200g)", qty: "200g", price: 1.5 }, { name: "Brócoli", qty: "150g", price: 2.0 }] },
  { day: 5, name: "Tallarines rojos con pollo", videoUrl: "https://www.youtube.com/results?search_query=tallarines+rojos+pollo+saludable", calories: 590, proteinG: 33, ingredients: [{ name: "Fideos integrales (100g)", qty: "100g", price: 2.2 }, { name: "Pollo (150g)", qty: "150g", price: 4.5 }, { name: "Salsa de tomate natural", qty: "100g", price: 2.0 }, { name: "Queso parmesano", qty: "20g", price: 1.5 }] },
  { day: 6, name: "Causa de pollo ligera", videoUrl: "https://www.youtube.com/results?search_query=causa+pollo+ligera", calories: 460, proteinG: 30, ingredients: [{ name: "Papa amarilla (300g)", qty: "300g", price: 2.0 }, { name: "Pollo deshilachado (120g)", qty: "120g", price: 3.6 }, { name: "Mayonesa light", qty: "2 cda", price: 1.0 }, { name: "Palta (1/4 und)", qty: "1/4 und", price: 1.0 }] },
  { day: 7, name: "Pescado al horno con ensalada", videoUrl: "https://www.youtube.com/results?search_query=pescado+horno+ensalada", calories: 440, proteinG: 36, ingredients: [{ name: "Filete de pescado (180g)", qty: "180g", price: 6.0 }, { name: "Ensalada fresca", qty: "250g", price: 2.5 }, { name: "Limón y especias", qty: "c/n", price: 0.5 }] },
];

async function main() {
  for (const r of RECIPES) {
    const totalPrice = r.ingredients.reduce((a, i) => a + Number(i.price || 0), 0);
    await prisma.recipe.upsert({
      where: { day_mealType: { day: r.day, mealType: "Comida" } },
      update: { name: r.name, videoUrl: r.videoUrl, ingredients: r.ingredients, totalPrice, calories: r.calories, proteinG: r.proteinG },
      create: { name: r.name, day: r.day, mealType: "Comida", videoUrl: r.videoUrl, ingredients: r.ingredients, totalPrice, calories: r.calories, proteinG: r.proteinG },
    });
  }
  console.log(`Seeded ${RECIPES.length} recipes`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
