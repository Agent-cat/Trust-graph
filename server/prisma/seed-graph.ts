import { driver } from "../src/utils/neo4j";

async function seedGraph() {
  const session = driver.session({ defaultAccessMode: "WRITE" });

  try {
    console.log("Clearing existing data...");
    await session.run("MATCH (n) DETACH DELETE n");

    console.log("Creating constraint...");
    await session.run(`
      CREATE CONSTRAINT IF NOT EXISTS FOR (c:Customer) REQUIRE c.id IS UNIQUE
    `);
    await session.run(`
      CREATE CONSTRAINT IF NOT EXISTS FOR (s:Seller) REQUIRE s.id IS UNIQUE
    `);
    await session.run(`
      CREATE CONSTRAINT IF NOT EXISTS FOR (d:Device) REQUIRE d.id IS UNIQUE
    `);
    await session.run(`
      CREATE CONSTRAINT IF NOT EXISTS FOR (ip:IP) REQUIRE ip.address IS UNIQUE
    `);

    console.log("Creating devices...");
    const devices = ["device_a1", "device_b2", "device_c3", "device_d4", "device_e5"];
    for (const deviceId of devices) {
      await session.run(
        "MERGE (d:Device {id: $id})",
        { id: deviceId }
      );
    }

    console.log("Creating IPs...");
    const ips = ["103.1.2.3", "103.4.5.6", "192.168.1.100", "172.16.0.50", "45.33.32.156"];
    for (const ip of ips) {
      await session.run(
        "MERGE (ip:IP {address: $address})",
        { address: ip }
      );
    }

    console.log("Creating sellers...");
    const sellers = [
      { id: "seller_1", name: "ABC Electronics", risky: false },
      { id: "seller_2", name: "Quick Mart", risky: true },
      { id: "seller_3", name: "Fresh Deals", risky: true },
      { id: "seller_4", name: "Premium Store", risky: false },
      { id: "seller_5", name: "Budget Shop", risky: true },
    ];
    for (const seller of sellers) {
      await session.run(
        "MERGE (s:Seller {id: $id, name: $name, risky: $risky})",
        seller
      );
    }

    console.log("Creating customers...");
    const customers = [
      { id: "cust_1", name: "Rahul" },
      { id: "cust_2", name: "Priya" },
      { id: "cust_3", name: "Amit" },
      { id: "cust_4", name: "Sneha" },
      { id: "cust_5", name: "Vikram" },
      { id: "cust_6", name: "Neha" },
      { id: "cust_7", name: "Ravi" },
      { id: "cust_8", name: "Anita" },
    ];
    for (const cust of customers) {
      await session.run(
        "MERGE (c:Customer {id: $id, name: $name})",
        cust
      );
    }

    console.log("Creating relationships...");

    // Fraud ring: cust_1, cust_2, cust_3 all use device_a1 and sell via seller_2
    await session.run(`
      MATCH (c:Customer {id: 'cust_1'}), (d:Device {id: 'device_a1'})
      MERGE (c)-[:USES_DEVICE]->(d)
    `);
    await session.run(`
      MATCH (c:Customer {id: 'cust_2'}), (d:Device {id: 'device_a1'})
      MERGE (c)-[:USES_DEVICE]->(d)
    `);
    await session.run(`
      MATCH (c:Customer {id: 'cust_3'}), (d:Device {id: 'device_a1'})
      MERGE (c)-[:USES_DEVICE]->(d)
    `);
    await session.run(`
      MATCH (s:Seller {id: 'seller_2'}), (d:Device {id: 'device_a1'})
      MERGE (s)-[:USES_DEVICE]->(d)
    `);

    // Same IP for fraud ring
    await session.run(`
      MATCH (c:Customer {id: 'cust_1'}), (ip:IP {address: '103.1.2.3'})
      MERGE (c)-[:USES_IP]->(ip)
    `);
    await session.run(`
      MATCH (c:Customer {id: 'cust_2'}), (ip:IP {address: '103.1.2.3'})
      MERGE (c)-[:USES_IP]->(ip)
    `);
    await session.run(`
      MATCH (s:Seller {id: 'seller_2'}), (ip:IP {address: '103.1.2.3'})
      MERGE (s)-[:USES_IP]->(ip)
    `);

    // Normal customers
    await session.run(`
      MATCH (c:Customer {id: 'cust_4'}), (d:Device {id: 'device_b2'})
      MERGE (c)-[:USES_DEVICE]->(d)
    `);
    await session.run(`
      MATCH (c:Customer {id: 'cust_5'}), (d:Device {id: 'device_c3'})
      MERGE (c)-[:USES_DEVICE]->(d)
    `);

    // Another suspicious pattern: cust_6, cust_7, cust_8 share device and IP with seller_5
    await session.run(`
      MATCH (c:Customer {id: 'cust_6'}), (d:Device {id: 'device_d4'})
      MERGE (c)-[:USES_DEVICE]->(d)
    `);
    await session.run(`
      MATCH (c:Customer {id: 'cust_7'}), (d:Device {id: 'device_d4'})
      MERGE (c)-[:USES_DEVICE]->(d)
    `);
    await session.run(`
      MATCH (c:Customer {id: 'cust_8'}), (d:Device {id: 'device_d4'})
      MERGE (c)-[:USES_DEVICE]->(d)
    `);
    await session.run(`
      MATCH (s:Seller {id: 'seller_5'}), (d:Device {id: 'device_d4'})
      MERGE (s)-[:USES_DEVICE]->(d)
    `);

    // Orders placed
    await session.run(`
      MATCH (c:Customer {id: 'cust_1'}), (s:Seller {id: 'seller_2'})
      MERGE (c)-[:PLACED]->(s)
    `);
    await session.run(`
      MATCH (c:Customer {id: 'cust_2'}), (s:Seller {id: 'seller_2'})
      MERGE (c)-[:PLACED]->(s)
    `);
    await session.run(`
      MATCH (c:Customer {id: 'cust_3'}), (s:Seller {id: 'seller_2'})
      MERGE (c)-[:PLACED]->(s)
    `);

    console.log("Graph seeded successfully!");

    // Verify
    const countResult = await session.run("MATCH (n) RETURN labels(n) as label, count(n) as count");
    console.log("\nNode counts:");
    for (const record of countResult.records) {
      console.log(`  ${record.get("label")}: ${record.get("count")}`);
    }

    const relResult = await session.run("MATCH ()-[r]->() RETURN type(r) as type, count(r) as count");
    console.log("\nRelationship counts:");
    for (const record of relResult.records) {
      console.log(`  ${record.get("type")}: ${record.get("count")}`);
    }

  } catch (error) {
    console.error("Graph seed error:", error);
  } finally {
    await session.close();
    await driver.close();
  }
}

seedGraph();
