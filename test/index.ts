import Book from "./models/book";
import User from "./models/user";

(async () => {
  const q = Book.orderBy("created", "desc").limit(5);

  const myBook = await q.next();
  console.log(myBook.map((b) => b.title));

  const nextBooks = await q.next();
  console.log(nextBooks.map((b) => b.title));
})();
