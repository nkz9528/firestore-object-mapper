import { Collection, Reference } from "../../core";
import Book from "./book";

class _User {
  name: string;
  uploaded_books = Collection("uploaded_books", BookRef);

  constructor(name: string) {
    this.name = name;
  }

  shoutMyName() {
    console.log("My!! name!! is!!", this.name);
  }
}

class BookRef {
  book = Reference(Book);
  star: number;

  constructor(s: number) {
    this.star = s;
  }
}

export default Collection("Users", _User);
