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
      q?: WhereQuery<InstanceType<typeof this>>
    ): Promise<InstanceType<typeof this>[]> {
      const docSnap = await getDocs(mergeToQuery(this.colRef, q || {}));

      return docSnap.docs.map((d) => {
        const _this: InstanceType<typeof this> = new this();
        const mixedInSchema = {
          ..._this.bindRef(d.ref),
          ...this.prototype,
          ...new constructor(),
          ...constructor.prototype,
        };
        return mergeResult(d, mixedInSchema);
      });
    }

    public static async findOne(q?: WhereQuery<InstanceType<T>>) {
      const result = await this.findMany(q);
      return result[0];
    }

    private static bindRef(ref: CollectionReference<DocumentData>) {
      this.colRef = ref;
      return this;
    }

    private bindRef(ref: DocumentReference) {
      this.docRef = ref;
      return this;
    }

    public static getFactory() {
      return this.schemaFactory;
    }

    public async save() {
      const plainData = Object.entries(this).reduce((acc, [key, val]) => {
        if (!val) {
          return acc;
        }
        if (typeof val === "string" || typeof val === "number") {
          return {
            ...acc,
            [key]: val,
          };
        }
        if ((val["entity_type"] as EntityType) === "REFERENCE") {
          return {
            ...acc,
            [key]: val["ref"],
          };
        }
        return acc;
      }, {});

      if (this.docRef) {
        await setDoc(this.docRef, plainData, { merge: true });
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

    static async get(): Promise<InstanceType<T>> {
      const snap = await getDoc(this.ref);

      const factory = colConstructor.getFactory() as ReturnType<
        T["getFactory"]
      >;

      const _that = new colConstructor() as InstanceType<typeof colConstructor>;

      const mixiedInSchema = {
        ..._that.bindRef(this.ref),
        ...colConstructor.prototype,
        ...new factory(),
        ...factory.prototype,
      };
      return mergeResult(snap, mixiedInSchema);
    }

    static bindRef(ref: DocumentReference) {
      this.ref = ref;
      return this;
    }

    static assign(col: InstanceType<T>) {
      this.bindRef(col["docRef"]);
    }
  };
}

type MergedResult<T extends Constructable> = InstanceType<T>;

function mergeResult<T extends Constructable>(
  docSnap: DocumentSnapshot,
  schema: any
): MergedResult<T> {
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

  return data as MergedResult<T>;
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
