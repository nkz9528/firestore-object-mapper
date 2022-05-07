import { Collection as Collection, Reference } from "../../core";
import User from "./user";

class _Book {
  title: string;
  pages = Collection("pages", _Page);
  uploaded_by = Reference(User);

  constructor(title: string) {
    this.title = title;
  }

  hawl() {
    console.log("Woooooooh!!", this.title);
  }
}

class _Page {
  src: string;
  index: number;

  constructor(src: string, index: number) {
    this.src = src;
    this.index = index;
  }

  shout() {
    console.log("Gyaaaaaaa", this.src);
  }
}

const Book = Collection("Books", _Book);

export default Book;
