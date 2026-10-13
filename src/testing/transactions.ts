import { TransactionHost } from '@nestjs-cls/transactional';

/** A transaction host with no database behind it, for unit specs of services that open one. */
export function memoryTransactionHost() {
  return new TransactionHost({
    wrapWithTransaction: async (
      _options: unknown,
      fn: () => Promise<unknown>,
      setTx: (tx: object) => void,
    ) => {
      setTx({});
      return fn();
    },
    getFallbackInstance: () => ({}),
    connectionName: undefined,
    enableTransactionProxy: false,
    defaultTxOptions: {},
    extraProviderTokens: [],
  } as never);
}
