import {
  FC,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Observable, of } from "rxjs";
import { ReadonlyStore } from "./store";
import { Dispatcher } from "./dispatcher";

function useObservable<T>(observable: Observable<T>): T | undefined;
function useObservable<T>(observable: Observable<T>, initialValue: T): T;
function useObservable<T>(
  observable: Observable<T>,
  initialValue?: T
): T | undefined {
  const [value, setState] = useState<T | undefined>(initialValue);

  useEffect(() => {
    const sub = observable.subscribe(setState);
    return () => sub.unsubscribe();
  }, [observable]);

  return value;
}

type ContextValue = {
  store: ReadonlyStore;
  dispatch: Dispatcher;
};

const Context = createContext<ContextValue>({} as ContextValue);

export const ContextProvider = ({
  children,
  context,
}: {
  children: any;
  context: ContextValue;
}) => (
  <Context.Provider
    value={{ store: context.store, dispatch: context.dispatch }}
  >
    {children}
  </Context.Provider>
);

export const connect =
  <T extends {}, P extends {}>(
    Component: FC<T & P>,
    contextProps: (
      store: ReadonlyStore,
      dispatch: Dispatcher
    ) => (props: P) => Observable<T> | T
  ): FC<P> =>
  (props: P) => {
    const { store, dispatch } = useContext(Context);
    const connectedProps = useMemo(
      () => contextProps(store, dispatch)(props),
      [props]
    );
    const observableProps = useObservable(
      connectedProps instanceof Observable ? connectedProps : of(connectedProps)
    );
    return (
      <>
        {observableProps && <Component {...{ ...observableProps, ...props }} />}
      </>
    );
  };
