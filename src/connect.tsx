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

type ConnectContextValue = {
  store: ReadonlyStore;
  dispatch: Dispatcher;
};

const ConnectContext = createContext<ConnectContextValue>(
  {} as ConnectContextValue
);

export const ConnectContextProvider = ({
  children,
  context,
}: {
  children: any;
  context: ConnectContextValue;
}) => (
  <ConnectContext.Provider
    value={{ store: context.store, dispatch: context.dispatch }}
  >
    {children}
  </ConnectContext.Provider>
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
    const { store, dispatch } = useContext(ConnectContext);
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
