import { Collection } from "../../core";

class _User {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

export default Collection("Users", _User);
