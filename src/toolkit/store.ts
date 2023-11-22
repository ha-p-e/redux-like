import { StoreKey } from "../store";
import { Path } from "./util";

type InitialValue<T> = { initialValue: T };

export type StoreKeyNode = InitialValue<any> | { [key: string]: StoreKeyNode } | ((node: string) => StoreKeyNode);

type StoreKeys<T extends StoreKeyNode, Parent extends string = ""> = {
  [K in keyof T & string]: T[K] extends InitialValue<infer InitVal>
    ? StoreKey<InitVal, Path<Parent, K>>
    : T[K] extends Record<string, StoreKeyNode>
    ? StoreKeys<T[K], Path<Parent, K>>
    : T[K] extends (node: string) => InitialValue<infer InitVal>
    ? // todo how to keep name of function param instead of changing to node
      // note cannot use ...args: Parameters<T[K]> as it will lose the type of Node in the path
      <Node extends string>(node: Node) => StoreKey<InitVal, Path<Parent, `${K}/${Node}`>>
    : T[K] extends (node: string) => Record<string, StoreKeyNode>
    ? <Node extends string>(node: Node) => StoreKeys<ReturnType<T[K]>, Path<Parent, `${K}/${Node}`>>
    : never;
};

const isInitialValue = <T>(value: any): value is InitialValue<T> =>
  typeof value === "object" && value !== null && "initialValue" in value;

export const createSliceKeys = <T extends Record<string, StoreKeyNode>>(
  storeKeys: T,
  parent: string = ""
): StoreKeys<T> =>
  Object.fromEntries(
    Object.entries(storeKeys).map(([k, v]) => {
      // typeof v == (node: string) => InitialValue<any> | Record<string, NodeType>
      if (typeof v === "function") {
        return [
          k,
          (node: string) => {
            const result = v(node);
            // typeof v == (node: string) => InitialValue<any>
            if (isInitialValue(result)) {
              return {
                key: parent === "" ? `${k}/${node}` : `${parent}/${k}/${node}`,
                initialValue: result.initialValue,
              };
            }
            // typeof v == (node: string) => Record<string, NodeType>
            else if (typeof result === "object" && result !== null) {
              return createSliceKeys(result, parent === "" ? `${k}/${node}` : `${parent}/${k}/${node}`);
            }
            // should not happen given the input type constraints
            throw new Error(`Invalid return type ${typeof result}`);
          },
        ];
      }
      // typeof v == InitialValue<any>
      else if (isInitialValue(v)) {
        const key = { key: parent === "" ? k : `${parent}/${k}`, initialValue: v.initialValue };
        return [k, key];
      }
      // typeof v == Record<string, NodeType>
      else if (typeof v === "object" && v !== null) {
        return [k, createSliceKeys(v, parent === "" ? k : `${parent}/${k}`)];
      } else {
        // should not happen given the input type constraints
        throw new Error(`Invalid type ${typeof v}`);
      }
    })
  ) as StoreKeys<T>;

export const init = <T>(value: T): InitialValue<T> => ({ initialValue: value });
