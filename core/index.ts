import {
  addDoc,
  collection,
  doc,
  CollectionReference,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  limitToLast,
  orderBy,
  OrderByDirection,
  query,
  QueryConstraint,
  setDoc,
  where,
  WhereFilterOp,
  startAfter,
  QueryDocumentSnapshot,
} from "firebase/firestore/lite";
import { initAppIfNeeded } from "./init";
import {
  Constructable,
  EntityType,
  KeysExcludedRef,
  WhereQuery,
} from "./types";

type TCollection = ReturnType<typeof Collection>;

export function Collection<T extends Constructable>(
  path: string,
  constructor: T
) {
  initAppIfNeeded();
  const db = getFirestore();
  const ref = collection(db, path);

  const _class = class extends constructor {
    private docRef?: DocumentReference = undefined;
    private id = "";

    constructor(...params: any[]) {
      super(...params);
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

    static create(ref: DocumentReference) {
      const _this = new this();
      _this.docRef = ref;
      return _this;
    }
  };

  return class extends _class {
    public static entity_type: EntityType = "COLLECTION";
    private static colRef = ref;
    private static schemaFactory = constructor;

    protected static queryConstraints: QueryConstraint[] = [];
    private static cursor: QueryDocumentSnapshot<DocumentData>;

    public static async findMany(): Promise<
      (InstanceType<T> & { id: string })[]
    > {
      const docs = await this.getDocs(this.queryConstraints);
      return docs;
    }

    public static async next(): Promise<(InstanceType<T> & { id: string })[]> {
      const q = this.queryConstraints.concat(
        this.cursor ? [startAfter(this.cursor)] : []
      );
      const docs = await this.getDocs(q);
      return docs;
    }

    static async getDocs(qs: QueryConstraint[]) {
      const docSnap = await getDocs(query(this.colRef, ...qs));
      this.cursor = docSnap.docs[docSnap.docs.length - 1];

      return docSnap.docs.map((d) => {
        const mixedInSchema = {
          ...this.create(d.ref),
          ...this.prototype,
          ...new constructor(),
          ...constructor.prototype,
        };
        return mergeResult(d, mixedInSchema);
      });
    }

    public static async findOne() {
      const result = await this.findMany();
      return result[0];
    }

    public static async findById(
      id: string
    ): Promise<InstanceType<T> & { id: string }> {
      const path = this.colRef.path + "/" + id;
      const docSnap = await getDoc(doc(db, path));
      const mixedInSchema = {
        ...this.create(docSnap.ref),
        ...this.prototype,
        ...new constructor(),
        ...constructor.prototype,
      };
      return mergeResult(docSnap, mixedInSchema);
    }

    public static where(q?: WhereQuery<InstanceType<T>>) {
      const whereQs = convertToQuery(q || {});
      return this.spawnNewQuery(whereQs);
    }

    public static orderBy(
      field: KeysExcludedRef<InstanceType<T>>,
      dir: OrderByDirection
    ) {
      return this.spawnNewQuery([orderBy(field.toString(), dir)]);
    }

    public static limit(lim: number) {
      return this.spawnNewQuery([limit(lim)]);
    }

    public static limitToLast(lim: number) {
      return this.spawnNewQuery([limitToLast(lim)]);
    }

    private static spawnNewQuery(qs: QueryConstraint[]) {
      const c = Collection(path, constructor);
      c.queryConstraints = this.queryConstraints.concat(qs);
      c.bindRef(this.colRef);
      return c;
    }

    static bindRef(ref: CollectionReference<DocumentData>) {
      this.colRef = ref;
      return this;
    }

    static getFactory() {
      return this.schemaFactory;
    }
  };
}

type Reference = ReturnType<typeof Reference>;

export function Reference<T extends TCollection>(colConstructor: T) {
  return class extends colConstructor.getFactory() {
    public static entity_type: EntityType = "REFERENCE";
    private static ref: DocumentReference;

    static async get(): Promise<InstanceType<T>> {
      const snap = await getDoc(this.ref);

      const factory = colConstructor.getFactory();
      const mixiedInSchema = {
        ...colConstructor.create(this.ref),
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
  schema: InstanceType<T>
): MergedResult<T> {
  const fetchedData: DocumentData & { id: string } = {
    ...docSnap.data(),
    id: docSnap.id,
  };
  const data = Object.keys(schema).reduce((acc, key) => {
    if (fetchedData[key]) {
      const f = fetchedData[key];
      if (f["type"] === "document") {
        const target = schema[key] as Reference;

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

    const target = schema[key] as TCollection;
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

function convertToQuery<T>(q: WhereQuery<T>) {
  return Object.keys(q).map((key) =>
    where(
      key,
      Object.keys((q as any)[key])[0] as WhereFilterOp,
      Object.values((q as any)[key])[0]
    )
  );
}
