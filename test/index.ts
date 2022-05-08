import Book from "./models/book";
import User from "./models/user";

(async () => {
  const myBook = await Book.findOne({ title: { "==": "unko!" } });
  myBook.hawl();

  const user = await myBook.uploaded_by.get();

  const secBook = await Book.findOne({ title: { "==": "今日もいい天気" } });

  const upBookRef = await user.uploaded_books.findOne();

  // upBook.hawl();
  // console.log(upBookRef);

  // const newBook = new Book("今日もいい天気");
  // newBook.hawl();
  // await newBook.save();
})();
