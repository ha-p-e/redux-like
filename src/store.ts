import { Observable, ReplaySubject } from "rxjs";
export type StoreKey<T> = { key: any };

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
};

export type Store = ReadonlyStore & {
  set<T>(key: StoreKey<T>, value: T): Store;
  del<T>(key: StoreKey<T>): Store;
};

export type StoreKeyValue<T> = {
  key: StoreKey<T>;
  value: T;
};

class StoreValueImpl<T> implements StoreValue<T> {
  private readonly subject = new ReplaySubject<T>(1);
  private value: T | undefined = undefined;

  get = (): T | undefined => this.value;

  get$ = (): Observable<T> => this.subject.asObservable();

  set(value: T): StoreValue<T> {
    this.value = value;
    this.subject.next(value);
    return this;
  }

  del(): void {
    this.value = undefined;
    this.subject.complete();
  }
}

class StoreImpl implements Store {
  private readonly store = new Map<any, StoreValue<any>>();

  private getOrCreate<T>(key: StoreKey<T>): StoreValue<T> {
    if (!this.store.has(key)) {
      this.store.set(key, new StoreValueImpl());
    }
    return this.store.get(key)!;
  }

  has = <T>(key: StoreKey<T>): boolean => this.store.has(key);

  get = <T>(key: StoreKey<T>): T | undefined => this.getOrCreate(key).get();

  getOrElse = <T>(key: StoreKey<T>, orElse: T): T => this.get(key) ?? orElse;

  get$ = <T>(key: StoreKey<T>): Observable<T> => this.getOrCreate(key).get$();

  set<T>(key: StoreKey<T>, value: T): Store {
    this.getOrCreate(key).set(value);
    return this;
  }

  del<T>(key: StoreKey<T>): Store {
    if (this.store.has(key)) {
      this.store.get(key)!.del();
      this.store.delete(key);
    }
    return this;
  }
}
export module Store {
  export const create = () => new StoreImpl();

  export const key = <T>(key: any): StoreKey<T> => ({ key });

  export const keyValue = <T>(
    key: StoreKey<T>,
    value: T
  ): StoreKeyValue<T> => ({
    key,
    value,
  });
}
