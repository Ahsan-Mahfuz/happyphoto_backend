import connectDB from "../connection/connectDB";
import seedDatabase from "../connection/seedDatabase";

const run = async () => {
  try {
    await connectDB();
    await seedDatabase();
    console.log("Seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
};

run();
