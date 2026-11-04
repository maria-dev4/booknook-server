import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);
let books;
let borrows;

const verifyToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  try {
    req.user = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).send({ message: "Invalid or expired token" });
  }
};

app.get("/", (req, res) => {
  res.send("BookNook server is running");
});

app.get("/books", async (req, res) => {
  const filter = {};
  if (req.query.email) filter.addedByEmail = req.query.email;
  const limit = parseInt(req.query.limit) || 0;
  const cursor = books.find(filter).sort({ createdAt: -1 });
  if (limit) cursor.limit(limit);
  res.send(await cursor.toArray());
});

app.get("/books/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid book id" });
  }
  const book = await books.findOne({ _id: new ObjectId(req.params.id) });
  if (!book) return res.status(404).send({ message: "Book not found" });
  res.send(book);
});

app.post("/books", verifyToken, async (req, res) => {
  const { title, author, category, image, description, copies, addedByName } =
    req.body;
  const result = await books.insertOne({
    title,
    author,
    category,
    image,
    description,
    copies: Number(copies),
    addedByName,
    addedByEmail: req.user.email,
    createdAt: new Date(),
  });
  res.send(result);
});

app.patch("/books/:id", verifyToken, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid book id" });
  }
  const { title, author, category, image, description, copies } = req.body;
  const result = await books.updateOne(
    { _id: new ObjectId(req.params.id), addedByEmail: req.user.email },
    {
      $set: {
        title,
        author,
        category,
        image,
        description,
        copies: Number(copies),
      },
    },
  );
  if (result.matchedCount === 0) {
    return res
      .status(403)
      .send({ message: "You can only edit your own books" });
  }
  res.send(result);
});

app.delete("/books/:id", verifyToken, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid book id" });
  }
  const result = await books.deleteOne({
    _id: new ObjectId(req.params.id),
    addedByEmail: req.user.email,
  });
  if (result.deletedCount === 0) {
    return res
      .status(403)
      .send({ message: "You can only delete your own books" });
  }
  res.send(result);
});

app.post("/borrows", verifyToken, async (req, res) => {
  const { bookId, userName } = req.body;
  if (!ObjectId.isValid(bookId)) {
    return res.status(400).send({ message: "Invalid book id" });
  }
  const userEmail = req.user.email;

  const alreadyBorrowed = await borrows.findOne({ bookId, userEmail });
  if (alreadyBorrowed) {
    return res
      .status(409)
      .send({ message: "You have already borrowed this book" });
  }

  const updated = await books.updateOne(
    { _id: new ObjectId(bookId), copies: { $gt: 0 } },
    { $inc: { copies: -1 } },
  );
  if (updated.modifiedCount === 0) {
    return res.status(400).send({ message: "This book is not available" });
  }

  const book = await books.findOne({ _id: new ObjectId(bookId) });
  const borrowDate = new Date();
  const returnDate = new Date(borrowDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  const result = await borrows.insertOne({
    bookId,
    bookTitle: book.title,
    bookImage: book.image,
    userName,
    userEmail,
    borrowDate,
    returnDate,
  });
  res.send(result);
});

app.get("/borrows", verifyToken, async (req, res) => {
  const result = await borrows
    .find({ userEmail: req.user.email })
    .sort({ borrowDate: -1 })
    .toArray();
  res.send(result);
});

app.delete("/borrows/:id", verifyToken, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid borrow id" });
  }
  const borrow = await borrows.findOne({
    _id: new ObjectId(req.params.id),
    userEmail: req.user.email,
  });
  if (!borrow) {
    return res.status(404).send({ message: "Borrow record not found" });
  }
  await borrows.deleteOne({ _id: borrow._id });
  await books.updateOne(
    { _id: new ObjectId(borrow.bookId) },
    { $inc: { copies: 1 } },
  );
  res.send({ message: "Book returned" });
});

const start = async () => {
  await client.connect();
  const db = client.db("booknook");
  books = db.collection("books");
  borrows = db.collection("borrows");
  app.listen(port, () => console.log(`Server running on port ${port}`));
};

start();
