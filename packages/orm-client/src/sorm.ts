import {InvalidArgumentsException, Type} from "@simplism/core";
import {helpers} from "./helpers";
import {QueryUnit} from "./QueryUnit";

export const sorm = {
  equal<T>(source: T | QueryUnit<T>, target: T | QueryUnit<T>): QueryUnit<Boolean> {
    return new QueryUnit(Boolean, helpers.query(source) + " = " + helpers.query(target));
  },

  includes(source: string | QueryUnit<string>, target: string | QueryUnit<string>): QueryUnit<Boolean> {
    return new QueryUnit(Boolean, helpers.query(source) + " LIKE '%' + " + helpers.query(target) + " + '%'");
  },

  startsWith(source: string | QueryUnit<string>, target: string | QueryUnit<string>): QueryUnit<Boolean> {
    return new QueryUnit(Boolean, helpers.query(source) + " LIKE " + helpers.query(target) + " + '%'");
  },

  ifNull<T>(source: T | QueryUnit<T>, target: T | QueryUnit<T>): T {
    let type;
    if (source instanceof QueryUnit) {
      type = source.type;
    }
    else if (target instanceof QueryUnit) {
      type = target.type;
    }
    else {
      throw new TypeError();
    }

    return new QueryUnit(type, "ISNULL(" + helpers.query(source) + ", " + helpers.query(target) + ")") as any;
  },

  max<T>(unit: T | QueryUnit<T>): QueryUnit<T | undefined> {
    if (!(unit instanceof QueryUnit)) {
      throw new TypeError();
    }

    return new QueryUnit(unit.type, "MAX(" + helpers.query(unit) + ")");
  },

  and(arr: QueryUnit<Boolean>[]): QueryUnit<Boolean> {
    return new QueryUnit(Boolean, arr.map(item => "(" + helpers.query(item) + ")").join(" AND "));
  },

  or(arr: QueryUnit<Boolean>[]): QueryUnit<Boolean> {
    return new QueryUnit(Boolean, arr.map(item => "(" + helpers.query(item) + ")").join(" OR "));
  },

  cast<P>(src: any, targetType: Type<P>): QueryUnit<P> {
    return new QueryUnit(targetType, `CONVERT(${helpers.getDataTypeFromType(targetType)}, ${helpers.query(src)})`);
  },

  concat(args: (QueryUnit<String> | string)[]): QueryUnit<String> {
    if (args.length > 1) {
      return new QueryUnit(String, `CONVERT(${args.map(arg => helpers.query(arg)).join(", ")})`);
    }
    else if (args.length === 1) {
      return new QueryUnit(String, helpers.query(args[0]));
    }

    throw new InvalidArgumentsException(args);
  }
};