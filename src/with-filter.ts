import { $$asyncIterator, $$iterator } from 'iterall';

export type FilterFn = (rootValue?: any, args?: any, context?: any, info?: any) => boolean | Promise<boolean>;
export type ResolverFn = (rootValue?: any, args?: any, context?: any, info?: any) => AsyncIterator<any>;

export const withFilter = (asyncIteratorFn: ResolverFn, filterFn: FilterFn): ResolverFn => {
  return (rootValue: any, args: any, context: any, info: any): AsyncIterator<any> => {
    const asyncIterator = asyncIteratorFn(rootValue, args, context, info);
    const getNextPromise = () => {
      return new Promise<IteratorResult<any>>(async (resolve, reject) => {
        try {
          for await (const payload of transformToAsyncIterable(asyncIterator)) {
            if (payload.done) {
              resolve(payload);
              break;
            }

            try {
              if (filterFn(payload.value, args, context, info)) {
                resolve(payload);
                break;
              }
            } catch (e) {
              if (context.onFilterError) context.onFilterError(e);
            }
          }
        } catch(error) {
          reject(error);
        }
      });
    };

    const asyncIterator2 = {
      next() {
        return getNextPromise();
      },
      return() {
        return asyncIterator.return();
      },
      throw(error) {
        return asyncIterator.throw(error);
      },
      [$$asyncIterator]() {
        return this;
      },
    };

    return asyncIterator2;
  };
};

function transformToAsyncIterable(it: AsyncIterator<any>): any {
  return {
    async *[Symbol.asyncIterator]() {
      let curr = await it.next()
      while(true) {
        yield curr;
        if (curr.done) {
          break;
        }
        curr = await it.next()
      }
    }
  }
}
