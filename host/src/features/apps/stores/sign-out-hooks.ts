import { createContext } from 'react';

export type SignOutHook = () => void | Promise<void>;

export const SignOutHooksContext = createContext<ReadonlySet<SignOutHook>>(new Set());
