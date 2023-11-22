// avoids leading "/" in path
export type Path<Parent extends string, Node extends string> = Parent extends "" ? Node : `${Parent}/${Node}`;

// from https://stackoverflow.com/a/66620803
type Flatten<T extends object> = object extends T
  ? object
  : {
      [K in keyof T]-?: (
        x: NonNullable<T[K]> extends infer V
          ? V extends object
            ? V extends readonly any[]
              ? Pick<T, K>
              : Flatten<V> extends infer FV
              ? {
                  [P in keyof FV as `${Extract<K, string | number>}/${Extract<P, string | number>}`]: FV[P];
                }
              : never
            : Pick<T, K>
          : never
      ) => void;
    } extends Record<keyof T, (y: infer O) => void>
  ? O extends infer U
    ? { [K in keyof O]: O[K] }
    : never
  : never;

export const flatten = <T extends object>(obj: T): Flatten<T> => {
  const result: any = {};

  const transform = (wrapper: any, p?: string) => {
    switch (typeof wrapper) {
      case "object":
        p = p ? p + "/" : "";
        for (const item in wrapper) {
          transform(wrapper[item], p + item);
        }
        break;
      default:
        if (p) {
          result[p] = wrapper;
        }
        break;
    }
  };
  transform(obj);

  return result;
};
