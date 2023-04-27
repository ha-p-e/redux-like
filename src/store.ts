import { Observable, ReplaySubject } from "rxjs";
export type StoreKey<T> = { key: string };

type StoreValue<T> = {
  get(): T | undefined;
  get$(): Observable<T>;
  set(value: T): StoreValue<T>;
  del(): void;
};

export type ReadonlyStore = {
  has<T>(key: StoreKey<T>): boolean;
  get<T>(key: StoreKey<T>): T | undefined;
  getOrElse<T>(key: StoreKey<T>, orElse: T): T;
  get$<T>(key: StoreKey<T>): Observable<T>;
  snap(): Record<string, any>;
};

export type Store = ReadonlyStore & {
  set<T>(key: StoreKey<T>, value: T): Store;
  del<T>(key: StoreKey<T>): Store;
};

export type StoreUpdateAction = "set" | "del";

export type StoreUpdate<T> = {
  key: StoreKey<T>;
  action: StoreUpdateAction;
};

export type SetUpdate<T> = StoreUpdate<T> & { value: T; action: "set" };

export type DelUpdate<T> = StoreUpdate<T> & { action: "del" };

export function isSetUpdate<T>(update: StoreUpdate<T>): update is SetUpdate<T> {
  return update.action === "set";
}

class StoreValueImpl<T> implements StoreValue<T> {
  private readonly updates$ = new ReplaySubject<T>(1);
  private value: T | undefined = undefined;

  get = (): T | undefined => this.value;

  get$ = (): Observable<T> => this.updates$.asObservable();

  set(value: T): StoreValue<T> {
    this.value = value;
    this.updates$.next(value);
    return this;
  }

  del(): void {
    this.value = undefined;
    this.updates$.complete();
  }
}

class StoreImpl implements Store {
  private readonly store = new Map<string, StoreValue<any>>();

  private getOrCreate<T>(key: StoreKey<T>): StoreValue<T> {
    if (!this.store.has(key.key)) {
      this.store.set(key.key, new StoreValueImpl());
    }
    return this.store.get(key.key)!;
  }

  has = <T>(key: StoreKey<T>): boolean => this.store.has(key.key);

  get = <T>(key: StoreKey<T>): T | undefined => this.getOrCreate(key).get();

  getOrElse = <T>(key: StoreKey<T>, orElse: T): T => this.get(key) ?? orElse;

  get$ = <T>(key: StoreKey<T>): Observable<T> => this.getOrCreate(key).get$();

  snap = (): Record<string, any> =>
    Object.fromEntries(
      Array.from(this.store).map(([key, value]) => [key, value.get()])
    );

  set<T>(key: StoreKey<T>, value: T): Store {
    this.getOrCreate(key).set(value);
    return this;
  }

  del<T>(key: StoreKey<T>): Store {
    if (this.store.has(key.key)) {
      this.store.get(key.key)!.del();
      this.store.delete(key.key);
    }
    return this;
  }
}

export module Store {
  export const create = () => new StoreImpl() as Store;

  export const key = <T>(key: any): StoreKey<T> => ({ key });

  export const set = <T>(key: StoreKey<T>, value: T): SetUpdate<T> => ({
    key,
    value,
    action: "set",
  });

  export const del = <T>(key: StoreKey<T>): DelUpdate<T> => ({
    key,
    action: "del",
  });
}
