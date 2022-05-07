import { Collection, Reference } from "../core";
import Book from "./models/book";

(async () => {
  const myBook = await Book.findOne();
  console.log(myBook);
  myBook.hawl();
  const page = await myBook.pages.findOne();
  console.log(page);
  page.shout();

  const user = await myBook.uploaded_by.get();

  console.log(user);

  // const newBook = new Books("そうだよ");
  // newBook.hawl();
  // await newBook.save();
})();
