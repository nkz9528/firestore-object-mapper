import { Collection, Reference } from ".";
import { WhereFilterOp } from "firebase/firestore";

export type WhereQuery<E> = {
  [key in KeysExcludedRef<E>]?: { [opKey in WhereFilterOp]?: E[key] };
};

type SchemaExcludedRef<E> = {
  [key in keyof E]?: E[key] extends Function ? never : key;
};

type KeysExcludedRef<E> = Exclude<
  SchemaExcludedRef<E>[keyof SchemaExcludedRef<E>],
  undefined
>;

export interface Constructable extends Function {
  new (...args: any[]);
}

export type EntityType = "COLLECTION" | "REFERENCE";
