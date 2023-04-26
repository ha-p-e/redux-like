import { FC, useEffect, useState } from "react";
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

export function Connect<T>(props: {
  component: FC<T>;
  props: Observable<T> | T;
}) {
  const observableProps = useObservable(
    props.props instanceof Observable ? props.props : of(props.props)
  );
  return <>{observableProps && <props.component {...observableProps} />}</>;
}
