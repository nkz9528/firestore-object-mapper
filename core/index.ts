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
  query,
  setDoc,
  where,
  WhereFilterOp,
} from "firebase/firestore";
import { Constructable, EntityType, WhereQuery } from "./types";

export function Collection<T extends Constructable>(
  path: string,
  constructor: T
) {
  initAppIfNeeded();
  const db = getFirestore();
  const ref = collection(db, path);

  return class _Collection extends constructor {
    private static entity_type: EntityType = "COLLECTION";
    private static colRef = ref;
    private static schemaFactory = constructor;

    private docRef: DocumentReference;

    constructor(...params: any[]) {
      super(...params);
    }

    public static async findMany(
      q: WhereQuery<InstanceType<T>>
    ): Promise<InstanceType<T>[]> {
      const docSnap = await getDocs(mergeToQuery(this.colRef, q));

      return docSnap.docs.map((d) =>
        mergeResult(d, constructor)
      ) as InstanceType<T>[];
    }

    public static async findOne(
      q: WhereQuery<InstanceType<T>>
    ): Promise<InstanceType<T>> {
      const result = await this.findMany(q);
      return result[0];
    }

    private static bindRef(ref: CollectionReference<DocumentData>) {
      this.colRef = ref;
      return this;
    }

    public static getFactory() {
      return this.schemaFactory;
    }

    public async save() {
      const plainData = Object.entries(this).reduce((acc, [key, val]) => {
        if (typeof val === "string" || typeof val === "number") {
          return {
            ...acc,
            [key]: val,
          };
        }
        return acc;
      }, {});

      if (this.docRef) {
        await setDoc(this.docRef, plainData);
      } else {
        await addDoc(collection(db, path), plainData);
      }
    }
  };
}

export function Reference<T extends ReturnType<typeof Collection>>(
  colConstructor: T
) {
  return class _Reference extends colConstructor.getFactory() {
    public static entity_type: EntityType = "REFERENCE";
    private static ref: DocumentReference;

    static async get(): Promise<
      InstanceType<ReturnType<typeof colConstructor["getFactory"]>>
    > {
      const snap = await getDoc(this.ref);
      return mergeResult(snap, colConstructor.getFactory()) as InstanceType<
        ReturnType<typeof colConstructor["getFactory"]>
      >;
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

function mergeToQuery<T>(collcetionRef: CollectionReference, q: WhereQuery<T>) {
  return query(
    collcetionRef,
    ...Object.keys(q).map((key) =>
      where(
        key,
        Object.keys(q[key])[0] as WhereFilterOp,
        Object.values(q[key])[0]
      )
    )
  );
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
