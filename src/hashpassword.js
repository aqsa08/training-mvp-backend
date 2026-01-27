const bcrypt = require("bcryptjs");

async function run() {
  const plain = "Admin123!";   // you can change this to whatever password you want
  const hash = await bcrypt.hash(plain, 10);

  console.log("Plain password:", plain);
  console.log("Hashed password:", hash);
}

run().catch(console.error);

