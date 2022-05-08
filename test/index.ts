import Book from "./models/book";
import User from "./models/user";

(async () => {
  const myBook = await Book.findOne({ title: { "==": "unko!" } });
  myBook.hawl();

  const user = await User.findOne({ name: { "==": "katsuo" } });
  user.shoutMyName();

  const upBookRef = await user.uploaded_books.findOne();

  (await upBookRef.book.get()).hawl();

  // const newBook = new Book("今日もいい天気");
  // newBook.hawl();
  // await newBook.save();
})();
