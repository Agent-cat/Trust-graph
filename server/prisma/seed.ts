import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const ACTIONS = ["ALLOW", "STEP_UP_VERIFICATION", "HUMAN_REVIEW", "PAYOUT_HOLD"];
const ORDER_STATUSES = ["completed", "refunded", "disputed"];
const TX_TYPES = ["payment", "refund", "payout"];

function randomIp() {
  return `${faker.number.int({ min: 1, max: 223 })}.${faker.number.int({ min: 0, max: 255 })}.${faker.number.int({ min: 0, max: 255 })}.${faker.number.int({ min: 1, max: 254 })}`;
}

function randomDeviceId() {
  return `device_${faker.string.alphanumeric(8)}`;
}

async function main() {
  console.log("Seeding database...");

  // Create 20 sellers
  const sellers = [];
  for (let i = 0; i < 20; i++) {
    const seller = await prisma.seller.create({
      data: {
        name: faker.company.name(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        gstin: faker.string.alphanumeric(15),
        accountAgeDays: faker.number.int({ min: 1, max: 2000 }),
        refundRate: parseFloat(faker.number.float({ min: 0, max: 0.8, fractionDigits: 2 }).toFixed(2)),
        totalOrders: faker.number.int({ min: 10, max: 5000 }),
        totalRevenue: faker.number.float({ min: 50000, max: 5000000, fractionDigits: 2 }),
        isFlagged: faker.datatype.boolean({ probability: 0.3 }),
      },
    });
    sellers.push(seller);
  }
  console.log(`Created ${sellers.length} sellers`);

  // Create 100 orders with transactions
  for (let i = 0; i < 100; i++) {
    const seller = faker.helpers.arrayElement(sellers);
    const deviceId = randomDeviceId();
    const ipAddress = randomIp();
    const amount = faker.number.float({ min: 100, max: 100000, fractionDigits: 2 });
    const status = faker.helpers.arrayElement(ORDER_STATUSES);

    const order = await prisma.order.create({
      data: {
        sellerId: seller.id,
        customerId: `customer_${faker.string.alphanumeric(6)}`,
        amount,
        status,
        deviceId,
        ipAddress,
      },
    });

    // Create 1-3 transactions per order
    const txCount = faker.number.int({ min: 1, max: 3 });
    for (let j = 0; j < txCount; j++) {
      await prisma.transaction.create({
        data: {
          orderId: order.id,
          amount: amount / txCount,
          type: faker.helpers.arrayElement(TX_TYPES),
          status: "completed",
          deviceId,
          ipAddress,
          refundRate: seller.refundRate,
          accountAgeDays: seller.accountAgeDays,
        },
      });
    }
  }
  console.log("Created 100 orders with transactions");

  // Create 15 fraud cases with risk signals
  const flaggedSellers = sellers.filter((s) => s.isFlagged);
  for (let i = 0; i < 15; i++) {
    const seller = flaggedSellers[i % flaggedSellers.length];
    const level = RISK_LEVELS[faker.number.int({ min: 0, max: 3 })];
    const riskScore = faker.number.float({ min: 20, max: 98, fractionDigits: 0 });
    const action = ACTIONS[RISK_LEVELS.indexOf(level)];

    const fraudCase = await prisma.fraudCase.create({
      data: {
        sellerId: seller.id,
        caseNumber: `CASE-${faker.string.alphanumeric(6).toUpperCase()}`,
        riskScore,
        level,
        action,
        reasons: [
          faker.helpers.arrayElement([
            "Unusually high transaction amount",
            "Seller has unusually high refund activity",
            "Account was created recently",
            "High-risk IP address",
            "Device linked to multiple suspicious accounts",
            "Unusual geographic pattern",
          ]),
          faker.helpers.arrayElement([
            "Multiple failed payment attempts",
            "Velocity spike detected",
            "Mismatched billing information",
            "Known fraud pattern match",
          ]),
        ],
        status: faker.helpers.arrayElement(["open", "under_review", "resolved"]),
      },
    });

    // Create 2-4 risk signals per case
    const signalCount = faker.number.int({ min: 2, max: 4 });
    const signalTypes = ["transaction_risk", "graph_risk", "ip_risk", "identity_risk"];
    for (let j = 0; j < signalCount; j++) {
      await prisma.riskSignal.create({
        data: {
          fraudCaseId: fraudCase.id,
          type: signalTypes[j % signalTypes.length],
          score: faker.number.float({ min: 10, max: 99, fractionDigits: 0 }),
          details: {
            description: faker.lorem.sentence(),
            confidence: faker.number.float({ min: 0.5, max: 1, fractionDigits: 2 }),
          },
        },
      });
    }

    // Create audit logs for each case
    const logActions = [
      "Case created",
      "Risk analysis completed",
      "Seller notified",
      "Investigator assigned",
    ];
    for (const logAction of logActions) {
      await prisma.auditLog.create({
        data: {
          fraudCaseId: fraudCase.id,
          action: logAction,
          details: { timestamp: new Date().toISOString() },
          performedBy: "system",
        },
      });
    }
  }
  console.log("Created 15 fraud cases with signals and audit logs");

  // Create 5 appeals
  const openCases = await prisma.fraudCase.findMany({ take: 5 });
  for (const fraudCase of openCases) {
    await prisma.appeal.create({
      data: {
        fraudCaseId: fraudCase.id,
        sellerId: fraudCase.sellerId,
        reason: faker.lorem.paragraph(),
        status: faker.helpers.arrayElement(["pending", "approved", "rejected"]),
      },
    });
  }
  console.log("Created 5 appeals");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
