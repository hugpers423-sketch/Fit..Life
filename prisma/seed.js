const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { hashPassword } = require("../apps/api/src/auth");

// Credenciales demo (se guardan hasheadas, nunca en texto plano).
const PASSWORDS = {
  SUPER_ADMIN: "password123",
  VENDEDOR: "123456",
  USUARIO: "password123",
  ORIENTADOR: "orientador1",
  QUIOSK: "kiosk123",
};

async function main() {
  // 1. Crear usuarios con todos los roles
  const roles = ["SUPER_ADMIN", "VENDEDOR", "USUARIO", "ORIENTADOR", "QUIOSK"];

  for (const role of roles) {
    const email = `${role.toLowerCase()}@nutriflow.com`;
    const passwordHash = hashPassword(PASSWORDS[role]);
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: `${role} NutriFlow`,
        role: role,
        specialty: role === 'ORIENTADOR' ? 'NUTRICIONISTA' : null,
        passwordHash,
      },
      create: {
        email,
        name: `${role} NutriFlow`,
        role: role,
        passwordHash,
      },
    });
    console.log(`✅ Usuario ${role} creado: ${user.email}`);

    // 2. Crear perfil para cada usuario (con objetivos nutricionales de demo,
    //    así las apps pueden mostrar metas, IMC y TMB reales desde el día 1).
    const heightCm = role === "SUPER_ADMIN" ? 180 : (role === "VENDEDOR" ? 175 : 165);
    const weightKg = role === "SUPER_ADMIN" ? 80 : (role === "VENDEDOR" ? 75 : 60);
    const edad = 36;
    const gender = role === "SUPER_ADMIN" ? "Masculino" : "Femenino";
    const bmi = Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1));
    const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * edad + (gender === "Masculino" ? 5 : -161));
    const tdee = Math.round(bmr * 1.55); // Moderado

    const profileData = {
      birthDate: new Date("1990-01-15"),
      gender,
      heightCm,
      weightKg,
      activityLevel: "Moderado",
      goal: "Perder grasa",
      targetWeightKg: weightKg - 3,
      bmi,
      bmr,
      tdee,
      targetCalories: Math.round((tdee - 300) / 10) * 10,
      targetProtein: 2 * weightKg,
      targetCarbs: Math.round((tdee * 0.45) / 4 / 10) * 10,
      targetFat: Math.round((tdee * 0.3) / 9 / 10) * 10,
      wakeTime: "06:00",
      workStart: "08:00",
      workEnd: "18:00",
    };

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: { userId: user.id, ...profileData },
    });
    console.log(`✅ Perfil creado para ${role}`);
  }

  // 3. Sembrar 15 alimentos básicos
  const foods = [
    { name: "Chicken breast", nameEs: "Pechuga de pollo", category: "PROTEIN", calories100g: 165, protein100g: 31, carbs100g: 0, fat100g: 3.6, healthScore: 92, tags: ["KETO", "HIGH_PROTEIN"] },
    { name: "Salmon", nameEs: "Salmón", category: "PROTEIN", calories100g: 208, protein100g: 25, carbs100g: 0, fat100g: 12, healthScore: 95, tags: ["OMEGA3", "KETO"] },
    { name: "Egg", nameEs: "Huevo", category: "PROTEIN", calories100g: 155, protein100g: 13, carbs100g: 1.1, fat100g: 11, healthScore: 88, tags: ["KETO", "VEGETARIAN"] },
    { name: "Brown rice", nameEs: "Arroz integral", category: "CARB", calories100g: 111, protein100g: 2.6, carbs100g: 23, fat100g: 0.9, fiber100g: 1.8, healthScore: 82, tags: ["VEGAN", "WHOLE_GRAIN"] },
    { name: "Quinoa", nameEs: "Quinoa", category: "CARB", calories100g: 120, protein100g: 4.4, carbs100g: 22, fat100g: 1.9, fiber100g: 2.8, healthScore: 90, tags: ["VEGAN", "GLUTEN_FREE"] },
    { name: "Broccoli", nameEs: "Brócoli", category: "VEGETABLE", calories100g: 35, protein100g: 2.4, carbs100g: 7, fat100g: 0.4, fiber100g: 3.3, healthScore: 98, tags: ["VEGAN", "CRUCIFEROUS"] },
    { name: "Spinach", nameEs: "Espinacas", category: "VEGETABLE", calories100g: 23, protein100g: 2.9, carbs100g: 3.6, fat100g: 0.4, fiber100g: 2.2, healthScore: 99, tags: ["VEGAN", "IRON"] },
    { name: "Avocado", nameEs: "Aguacate", category: "VEGETABLE", calories100g: 160, protein100g: 2, carbs100g: 9, fat100g: 15, fiber100g: 7, healthScore: 93, tags: ["VEGAN", "KETO"] },
    { name: "Banana", nameEs: "Plátano", category: "FRUIT", calories100g: 89, protein100g: 1.1, carbs100g: 23, fat100g: 0.3, fiber100g: 2.6, sugar100g: 12, healthScore: 85, tags: ["VEGAN", "POTASSIUM"] },
    { name: "Blueberries", nameEs: "Arándanos", category: "FRUIT", calories100g: 57, protein100g: 0.7, carbs100g: 14, fat100g: 0.3, fiber100g: 2.4, sugar100g: 10, healthScore: 98, tags: ["VEGAN", "ANTIOXIDANT"] },
    { name: "Almonds", nameEs: "Almendras", category: "FAT", calories100g: 579, protein100g: 21, carbs100g: 22, fat100g: 50, fiber100g: 12, healthScore: 88, tags: ["VEGAN", "KETO"] },
    { name: "Olive oil", nameEs: "Aceite de oliva", category: "FAT", calories100g: 884, protein100g: 0, carbs100g: 0, fat100g: 100, healthScore: 85, tags: ["VEGAN", "KETO"] },
    { name: "Sweet potato", nameEs: "Batata", category: "CARB", calories100g: 86, protein100g: 1.6, carbs100g: 20, fat100g: 0.1, fiber100g: 3, healthScore: 85, tags: ["VEGAN", "VITAMIN_A"] },
    { name: "Greek yogurt", nameEs: "Yogur griego", category: "PROTEIN", calories100g: 59, protein100g: 10, carbs100g: 3.6, fat100g: 0.4, sugar100g: 3.6, healthScore: 90, tags: ["VEGETARIAN", "PROBIOTIC"] },
    { name: "Oats", nameEs: "Avena", category: "CARB", calories100g: 389, protein100g: 17, carbs100g: 66, fat100g: 7, fiber100g: 10, healthScore: 88, tags: ["VEGAN", "BETA_GLUCAN"] },
  ];

  for (const food of foods) {
    await prisma.food.upsert({
      where: { name: food.name },
      update: food,
      create: food,
    });
  }
  console.log(`✅ Sembrados ${foods.length} alimentos`);

  console.log('\n🌱 Seed completado con todos los roles!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });