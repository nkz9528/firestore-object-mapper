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
  limit,
  limitToLast,
  orderBy,
  OrderByDirection,
  query,
  QueryConstraint,
  setDoc,
  where,
  WhereFilterOp,
} from "firebase/firestore";
import { initAppIfNeeded } from "./init";
import {
  Constructable,
  EntityType,
  KeysExcludedRef,
  WhereQuery,
} from "./types";

type Collection = ReturnType<typeof Collection>;

export function Collection<T extends Constructable>(
  path: string,
  constructor: T
) {
  initAppIfNeeded();
  const db = getFirestore();
  const ref = collection(db, path);

  const _class = class extends constructor {
    private docRef: DocumentReference;

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

    private static queryConstraints: QueryConstraint[] = [];

    public static async findMany(
      q?: WhereQuery<InstanceType<T>>
    ): Promise<InstanceType<typeof this>[]> {
      const whereQs = convertToQuery(q || {});
      this.queryConstraints = this.queryConstraints.concat(whereQs);

      const docSnap = await getDocs(
        query(this.colRef, ...this.queryConstraints)
      );
      this.queryConstraints = [];
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

    public static async findOne(q?: WhereQuery<InstanceType<T>>) {
      const result = await this.findMany(q);
      return result[0];
    }

    public static orderBy(
      field: KeysExcludedRef<InstanceType<T>>,
      dir: OrderByDirection
    ) {
      this.queryConstraints.push(orderBy(field.toString(), dir));
      return this;
    }

    public static limit(lim: number) {
      this.queryConstraints.push(limit(lim));
      return this;
    }

    public static limitToLast(lim: number) {
      this.queryConstraints.push(limitToLast(lim));
      return this;
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

export function Reference<T extends Collection>(colConstructor: T) {
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
  schema: InstanceType<Collection>
): MergedResult<T> {
  const fetchedData = docSnap.data();

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

    const target = schema[key] as Collection;
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
      Object.keys(q[key])[0] as WhereFilterOp,
      Object.values(q[key])[0]
    )
  );
}
