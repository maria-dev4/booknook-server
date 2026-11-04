import "dotenv/config";
import { MongoClient } from "mongodb";

const OWNER_EMAIL = "আপনার_লগইনের_ইমেইল";
const OWNER_NAME = "আপনার_নাম";

const list = [
  [
    "Circe",
    "Madeline Miller",
    "Fiction",
    "circe.jpg",
    "The daughter of a Titan is banished to a lonely island, where she hones her witchcraft and chooses between the gods and the mortals she has come to love.",
  ],
  [
    "The Song of Achilles",
    "Madeline Miller",
    "Fiction",
    "song-achilles.jpg",
    "A tender, tragic retelling of the Trojan War through the eyes of Patroclus and his lifelong bond with the greatest warrior of Greece.",
  ],
  [
    "Project Hail Mary",
    "Andy Weir",
    "Science",
    "project-hail-mary.jpg",
    "A lone astronaut wakes up on a spacecraft with no memory and must solve a puzzle that could save humanity and the Earth.",
  ],
  [
    "The Seven Husbands of Evelyn Hugo",
    "Taylor Jenkins Reid",
    "Fiction",
    "evelyn-hugo.jpg",
    "A reclusive Hollywood icon finally tells her story to a young journalist, revealing the choices and loves behind her glamorous life.",
  ],
  [
    "Pachinko",
    "Min Jin Lee",
    "History",
    "pachinko.jpg",
    "A sweeping family saga following four generations of a Korean family who move to Japan across the twentieth century.",
  ],
  [
    "Dune",
    "Frank Herbert",
    "Science",
    "dune.jpg",
    "On the desert planet Arrakis, young Paul Atreides is drawn into a struggle over the most valuable resource in the universe.",
  ],
  [
    "Atomic Habits",
    "James Clear",
    "Others",
    "atomic-habits.jpg",
    "A practical guide to building good habits and breaking bad ones through small changes that add up to remarkable results.",
  ],
  [
    "The Midnight Library",
    "Matt Haig",
    "Fiction",
    "midnight-library.jpg",
    "Between life and death sits a library of every life you could have lived, and one chance to choose a different one.",
  ],
];

const run = async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const books = client.db("booknook").collection("books");
  const now = Date.now();
  let added = 0;

  for (let i = 0; i < list.length; i++) {
    const [title, author, category, file, description] = list[i];
    const exists = await books.findOne({ title });
    if (exists) continue;
    await books.insertOne({
      title,
      author,
      category,
      image: `/covers/${file}`,
      description,
      copies: 5,
      addedByName: OWNER_NAME,
      addedByEmail: OWNER_EMAIL,
      createdAt: new Date(now - i * 60 * 60 * 1000),
    });
    added++;
  }

  console.log(`${added} books added`);
  await client.close();
};

run();
