import { Collection as Collection, Reference } from "../../core";
import User from "./user";

class Book {
  title: string;
  thumnail: string;
  created: Date = new Date();
  index: number;

  constructor(title: string, thumbnail: string, index: number) {
    this.title = title;
    this.thumnail = thumbnail;
    this.index = index;
  }
}

export default Collection("books", Book);
