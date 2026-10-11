const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const dayISO = (offset) => {
  const d = new Date(Date.now() - offset * 864e5);
  return d;
};

async function main() {
  const usuario = await prisma.user.findUnique({ where: { email: "usuario@nutriflow.com" } });
  const orientador = await prisma.user.findUnique({ where: { email: "orientador@nutriflow.com" } });
  const vendedor = await prisma.user.findUnique({ where: { email: "vendedor@nutriflow.com" } });
  if (!usuario || !orientador || !vendedor) throw new Error("Faltan usuarios base. Corre seed.js primero.");

  // Membresía premium + rutina del cliente
  await prisma.user.update({ where: { id: usuario.id }, data: { membership: "PREMIUM" } });
  await prisma.profile.upsert({
    where: { userId: usuario.id },
    update: { wakeTime: "06:00", workStart: "08:00", workEnd: "18:00", heightCm: 170, weightKg: 72 },
    create: { userId: usuario.id, wakeTime: "06:00", workStart: "08:00", workEnd: "18:00", heightCm: 170, weightKg: 72, activityLevel: "Moderado", goal: "Perder peso" },
  });

  // Comidas de 5 días (casa + restaurante) con nombres de platos
  if ((await prisma.meal.count({ where: { userId: usuario.id } })) === 0) {
    const menu = [
      ["Quinua con pollo y verduras", 520, 38, "CASA"],
      ["Lomo saltado saludable (Sabor Verde)", 610, 35, "RESTAURANTE"],
      ["Ensalada de atún con palta", 430, 32, "CASA"],
      ["Pollo a la plancha con camote", 540, 40, "CASA"],
      ["Bowl proteico (Sabor Verde)", 480, 30, "RESTAURANTE"],
    ];
    for (let i = 0; i < menu.length; i++) {
      const [name, calories, proteinG, source] = menu[i];
      await prisma.meal.create({
        data: { userId: usuario.id, type: "Comida", name, calories, proteinG, carbsG: 55, fatG: 15, source, scheduledAt: dayISO(4 - i) },
      });
    }
    console.log("✅ 5 comidas demo");
  }

  // Entrenos de la semana
  if ((await prisma.workout.count({ where: { userId: usuario.id } })) === 0) {
    const tipos = [["Carrera", 30, 300], ["Fuerza", 45, 350], ["Yoga", 40, 180]];
    for (let i = 0; i < tipos.length; i++) {
      await prisma.workout.create({
        data: { userId: usuario.id, type: tipos[i][0], durationMin: tipos[i][1], caloriesBurned: tipos[i][2], date: dayISO(4 - i * 2) },
      });
    }
    console.log("✅ 3 entrenos demo");
  }

  // Gimnasio del vendedor con horario y video
  let gym = await prisma.gym.findFirst({ where: { ownerId: vendedor.id } });
  if (!gym) {
    gym = await prisma.gym.create({
      data: { ownerId: vendedor.id, name: "Gimnasio Central", address: "Av. Principal 123, Miraflores", service: "Musculación y funcional", videoUrl: "https://www.youtube.com/results?search_query=gimnasio+tour", openHour: 6, closeHour: 22 },
    });
    console.log("✅ Gimnasio demo");
  }

  // Restaurante con platos y horario
  let rest = await prisma.restaurant.findFirst({ where: { ownerId: vendedor.id } });
  if (!rest) {
    rest = await prisma.restaurant.create({
      data: { ownerId: vendedor.id, name: "Sabor Verde", address: "Calle Salud 456, Miraflores", service: "Bowls y ensaladas", videoUrl: "https://www.youtube.com/results?search_query=restaurante+saludable", openHour: 8, closeHour: 22 },
    });
    const dishes = [
      ["Bowl proteico", 320, 28, 18.0, 1, true],
      ["Ensalada César light", 380, 25, 16.5, 2, false],
      ["Lomo saltado saludable", 610, 35, 22.0, 2, true],
    ];
    for (const [name, calories, proteinG, price, day, special] of dishes) {
      await prisma.dish.create({ data: { restaurantId: rest.id, name, calories, proteinG, price, day, special } });
    }
    console.log("✅ Restaurante + 3 platos demo");
  }

  // Producto con aval nutricional
  if ((await prisma.product.count({ where: { gymId: gym.id } })) === 0) {
    await prisma.product.create({ data: { gymId: gym.id, name: "Proteína Whey", brand: "Optimum", approved: true, approvedById: orientador.id } });
    await prisma.product.create({ data: { gymId: gym.id, name: "Creatina", brand: "Dymatize", approved: false } });
    console.log("✅ 2 productos demo (1 avalado)");
  }

  // Reels del profesional y del vendedor
  if ((await prisma.post.count({ where: { authorId: orientador.id } })) === 0) {
    await prisma.post.create({ data: { authorId: orientador.id, kind: "REEL", title: "Rutina de pierna en 20 min", description: "3 series de 12: sentadilla, zancada y puente.", specialty: "ENTRENADOR" } });
    await prisma.post.create({ data: { authorId: orientador.id, kind: "TIP", title: "Tip: proteína en cada comida", description: "20-30g por comida para mantener músculo.", specialty: "NUTRICIONISTA" } });
    console.log("✅ 2 reels demo");
  }
  if ((await prisma.post.count({ where: { authorId: vendedor.id } })) === 0) {
    await prisma.post.create({ data: { authorId: vendedor.id, kind: "SERVICIO", title: "Tour por Gimnasio Central", description: "Conoce nuestras áreas y horarios.", mediaUrl: "https://www.youtube.com/results?search_query=gimnasio+tour" } });
    console.log("✅ 1 servicio demo");
  }

  // Sesión (videollamada + live)
  if ((await prisma.session.count({ where: { professionalId: orientador.id } })) === 0) {
    await prisma.session.create({ data: { professionalId: orientador.id, clientId: usuario.id, type: "VIDEOCALL", topic: "Seguimiento semanal", meetUrl: "https://meet.jit.si/nf-demo-seguimiento" } });
    await prisma.session.create({ data: { professionalId: orientador.id, type: "LIVE", topic: "Clase abierta: core en casa", meetUrl: "https://meet.jit.si/nf-demo-live" } });
    console.log("✅ 2 sesiones demo");
  }

  // Pago mensual del plan premium
  const month = new Date().toISOString().slice(0, 7);
  if ((await prisma.payment.count({ where: { professionalId: orientador.id, month } })) === 0) {
    await prisma.payment.create({ data: { userId: usuario.id, professionalId: orientador.id, amount: 99.9, concept: "Membresía PREMIUM", month } });
    console.log("✅ 1 pago demo");
  }

  console.log("\n🌱 Demo completada. El admin mostrará datos vivos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
