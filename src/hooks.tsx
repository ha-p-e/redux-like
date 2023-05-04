import { FC, useEffect, useMemo, useState } from "react";
import { Observable, of } from "rxjs";

export function useObservable<T>(observable: Observable<T>): T | undefined;
export function useObservable<T>(observable: Observable<T>, initialValue: T): T;
export function useObservable<T>(
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

export const connect =
  <T extends {}, P extends {}>(
    Component: FC<T & P>,
    connectProps: (props: P) => Observable<T> | T
  ): FC<P> =>
  (props: P) => {
    const connectedProps = useMemo(() => connectProps(props), [props]);
    const observableProps = useObservable(
      connectedProps instanceof Observable ? connectedProps : of(connectedProps)
    );
    return (
      <>
        {observableProps && <Component {...{ ...observableProps, ...props }} />}
      </>
    );
  };
