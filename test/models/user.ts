import { Collection } from "../../core";

class _User {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  shoutMyName() {
    console.log("My!! name!! is!!", this.name);
  }
}

export default Collection("Users", _User);
