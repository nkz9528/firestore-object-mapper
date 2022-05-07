import { getApps, initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  CollectionReference,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
} from "firebase/firestore";

interface Constructable extends Function {
  new (...args: any[]);
}

type ColRef = CollectionReference<DocumentData>;

type EntityType = "COLLECTION" | "REFERENCE";

export function Collection<T extends Constructable>(
  path: string,
  constructor: T
) {
  initAppIfNeeded();
  const db = getFirestore();
  const ref: ColRef = collection(db, path);

  return class _Collection extends constructor {
    private static entity_type: EntityType = "COLLECTION";
    private static ref = ref;
    private ref: DocumentReference;

    public static factory = constructor;

    constructor(...params: any[]) {
      super(...params);
    }

    static async find(): Promise<InstanceType<T>[]> {
      const docSnap = await getDocs(this.ref as any);

      return docSnap.docs.map((d) =>
        mergeResult(d, constructor)
      ) as InstanceType<T>[];
    }

    static async findOne(): Promise<InstanceType<T>> {
      const result = await this.find();
      return result[0];
    }

    private static bindRef(pref: ColRef) {
      this.ref = pref;
      return this;
    }

    async save() {
      const plainData = Object.entries(this).reduce((acc, [key, val]) => {
        if (typeof val === "string" || typeof val === "number") {
          return {
            ...acc,
            [key]: val,
          };
        }
        return acc;
      }, {});

      if (this.ref) {
        await setDoc(this.ref, plainData);
      } else {
        await addDoc(collection(db, path), plainData);
      }
    }
  };
}

export function Reference<T extends ReturnType<typeof Collection>>(
  colConstructor: T
) {
  return class {
    public static entity_type: EntityType = "REFERENCE";
    private static ref: DocumentReference;

    static async get(): Promise<InstanceType<T>> {
      const snap = await getDoc(this.ref);

      const schema = {
        ...new colConstructor.factory(),
        ...colConstructor.factory.prototype,
      };

      return mergeResult(snap, colConstructor.factory) as InstanceType<T>;
    }

    static bindRef(ref: DocumentReference) {
      this.ref = ref;
      return this;
    }
  };
}

function mergeResult(docSnap: DocumentSnapshot, constructor: Constructable) {
  const schema = {
    ...new constructor(),
    ...constructor.prototype,
  };
  const fetchedData = docSnap.data();

  const data = Object.keys(schema).reduce((acc, key) => {
    if (fetchedData[key]) {
      const f = fetchedData[key];
      if (f["type"] === "document") {
        const target = schema[key] as ReturnType<typeof Reference>;
        console.log("mmmm", target);
        return {
          ...acc,
          [key]: target?.bindRef(f),
        };
      }

      return {
        ...acc,
        [key]: f,
      };
    }

    const target = schema[key] as typeof this;
    if (target?.entity_type === "COLLECTION") {
      return {
        ...acc,
        [key]: target?.bindRef(collection(docSnap.ref, key)),
      };
    }

    return {
      ...acc,
      [key]: schema[key],
    };
  }, {});

  return {
    ...data,
    ref: docSnap.ref,
  };
}

export function initAppIfNeeded() {
  // const firebaseConfig = require("../../../firebase-config");
  if (getApps().length > 0) {
    return;
  }
  const firebaseConfig = {
    apiKey: "AIzaSyB7zEY1CAbiUPVTomZcOuVuIosBe0alXEQ",
    authDomain: "fire-wrapper2.firebaseapp.com",
    projectId: "fire-wrapper2",
    storageBucket: "fire-wrapper2.appspot.com",
    messagingSenderId: "47280289969",
    appId: "1:47280289969:web:7c79968012beeff1da0a90",
  };
  initializeApp(firebaseConfig);
}
