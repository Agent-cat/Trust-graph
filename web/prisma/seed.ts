import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with demo data...");

  // Create test users
  const admin = await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@test.com",
      emailVerified: true,
      role: "admin",
    },
  });

  const sellers = [];
  for (let i = 1; i <= 3; i++) {
    const seller = await prisma.user.upsert({
      where: { email: `seller${i}@test.com` },
      update: {},
      create: {
        name: `Test Seller ${i}`,
        email: `seller${i}@test.com`,
        emailVerified: true,
        role: "seller",
      },
    });
    sellers.push(seller);
  }

  const customers = [];
  for (let i = 1; i <= 2; i++) {
    const customer = await prisma.user.upsert({
      where: { email: `customer${i}@test.com` },
      update: {},
      create: {
        name: `Test Customer ${i}`,
        email: `customer${i}@test.com`,
        emailVerified: true,
        role: "customer",
      },
    });
    customers.push(customer);
  }

  console.log(`✅ Created users: admin, ${sellers.length} sellers, ${customers.length} customers`);

  // Create products for each seller
  const productCategories = ["Electronics", "Clothing", "Books", "Home & Kitchen"];
  const productTemplates = [
    { name: "Wireless Headphones", price: 2999, description: "High quality wireless noise-cancelling headphones" },
    { name: "Cotton T-Shirt", price: 499, description: "Premium 100% cotton t-shirt" },
    { name: "Programming Book", price: 899, description: "A comprehensive guide to programming" },
    { name: "Blender Pro", price: 3499, description: "High-speed kitchen blender" },
    { name: "Smart Watch", price: 4999, description: "Fitness tracker and smart watch" },
    { name: "Running Shoes", price: 2499, description: "Lightweight running shoes" },
  ];

  for (let i = 0; i < sellers.length; i++) {
    const seller = sellers[i];
    for (let j = 0; j < 4; j++) {
      const template = productTemplates[(i * 2 + j) % productTemplates.length];
      const category = productCategories[(i + j) % productCategories.length];
      await prisma.product.create({
        data: {
          name: `${template.name} ${i + 1}`,
          description: template.description,
          price: template.price + j * 100,
          stock: 10 + j * 5,
          category,
          sellerId: seller.id,
        },
      });
    }
  }

  console.log("✅ Products created");

  // Create a sample order for first customer
  const sampleProducts = await prisma.product.findMany({ take: 2 });
  if (sampleProducts.length >= 2) {
    const total = sampleProducts.reduce((sum, p) => sum + p.price, 0);
    await prisma.order.create({
      data: {
        userId: customers[0].id,
        status: "delivered",
        total,
        shippingAddress: "123 Test Street, Mumbai",
        paymentMethod: "cod",
        items: {
          create: sampleProducts.map((p) => ({
            productId: p.id,
            quantity: 1,
            price: p.price,
          })),
        },
      },
    });
    console.log("✅ Sample order created");
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });