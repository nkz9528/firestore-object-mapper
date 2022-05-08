import { Collection, Reference } from "../core";
import Book from "./models/book";

(async () => {
  const myBook = await Book.findOne({ title: { "==": "たいとるだ" } });
  myBook.hawl();
  // console.log(myBook);
  const page = await myBook.pages.findOne({ index: { "<": 20 } });
  page.shout();
  // console.log(page);
  const user = await myBook.uploaded_by.get();
  user.shoutMyName();
  // console.log(user);

  const newBook = new Book("今日もいい天気");
  newBook.hawl();
  await newBook.save();
})();
