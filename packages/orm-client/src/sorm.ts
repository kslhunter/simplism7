import {DateOnly, DateTime, InvalidArgumentsException, Type} from "@simplism/core";
import {helpers} from "./helpers";
import {QueryUnit} from "./QueryUnit";
import {QueriedBoolean, TypeOfGenericForObject} from "./Queryable";

export class CaseQueryable<T> {
  private readonly _cases: string[] = [];

  public case(predicate: QueriedBoolean | QueryUnit<QueriedBoolean>, then: T | QueryUnit<T>): CaseQueryable<T> {
    this._cases.push(`WHEN ${helpers.query(predicate)} THEN ${helpers.query(then)}`);
    return this;
  }

  public else(then: T | QueryUnit<T>): QueryUnit<T> {
    let type;
    if (then instanceof QueryUnit) {
      type = then.type;
    }
    else {
      type = then.constructor;
    }

    return new QueryUnit<T>(type as any, `CASE ${this._cases.join(" ")} ELSE ${helpers.query(then)} END`);
  }
}

export const sorm = {
  formula<T>(arg: T | QueryUnit<T>, ...args: any[]): QueryUnit<T> {
    let type: any;
    if (arg instanceof QueryUnit) {
      type = arg.type;
    }
    else {
      type = arg.constructor;
    }
    const query = ([arg] as any[]).concat(args)
      .map((item, index) => {
        if (index % 2 === 0) {
          return helpers.query(item);
        }
        else {
          return item;
        }
      })
      .join(" ");

    return new QueryUnit(type, "(" + query + ")");
  },

  equal<T>(source: T | QueryUnit<T>, target: T | QueryUnit<T>): QueryUnit<QueriedBoolean> {
    return new QueryUnit(QueriedBoolean, helpers.query(source, true) + " = " + helpers.query(target, true));
  },

  notEqual<T>(source: T | QueryUnit<T>, target: T | QueryUnit<T>): QueryUnit<QueriedBoolean> {
    return new QueryUnit(QueriedBoolean, helpers.query(source, true) + " != " + helpers.query(target, true));
  },

  notNull<T>(source: T | QueryUnit<T>): QueryUnit<QueriedBoolean> {
    return new QueryUnit(QueriedBoolean, helpers.query(source, true) + " IS NOT NULL");
  },

  lessThen(source: number | DateOnly | DateTime | QueryUnit<Number | DateOnly | DateTime>, target: number | DateOnly | DateTime | QueryUnit<Number | DateOnly | DateTime>): QueryUnit<QueriedBoolean> {
    return new QueryUnit(QueriedBoolean, helpers.query(source) + " < " + helpers.query(target));
  },

  greaterThen(source: number | QueryUnit<Number>, target: number | QueryUnit<Number>): QueryUnit<QueriedBoolean> {
    return new QueryUnit(QueriedBoolean, helpers.query(source) + " > " + helpers.query(target));
  },

  greaterThenOrEqual(source: number | QueryUnit<Number>, target: number | QueryUnit<Number>): QueryUnit<QueriedBoolean> {
    return new QueryUnit(QueriedBoolean, helpers.query(source) + " >= " + helpers.query(target));
  },

  includes(source: string | QueryUnit<String>, target: string | QueryUnit<String>): QueryUnit<QueriedBoolean> {
    return new QueryUnit(QueriedBoolean, helpers.query(source) + " LIKE '%' + " + helpers.query(target) + " + '%'");
  },

  startsWith(source: string | QueryUnit<string>, target: string | QueryUnit<string>): QueryUnit<QueriedBoolean> {
    return new QueryUnit(QueriedBoolean, helpers.query(source) + " LIKE " + helpers.query(target) + " + '%'");
  },

  in<P>(src: QueryUnit<P> | P, target: (QueryUnit<P> | P)[]): QueryUnit<QueriedBoolean> {
    if (target.length < 1) {
      return new QueryUnit(QueriedBoolean, "1 = 0") as any;
    }
    else {
      return new QueryUnit(QueriedBoolean, `${helpers.query(src)} IN (${target.map(item => helpers.query(item)).join(", ")})`) as any;
    }
  },

  if<T>(source: T | QueryUnit<T>, predicate: T | QueryUnit<T>, target: T | QueryUnit<T>): T {
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

    return new QueryUnit(type, "ISNULL(NULLIF(" + helpers.query(source) + ", " + helpers.query(predicate) + "), " + helpers.query(target) + ")") as any;
  },

  case<T>(predicate: QueriedBoolean | QueryUnit<QueriedBoolean>, then: T | QueryUnit<T>): CaseQueryable<T> {
    const caseQueryable = new CaseQueryable<T>();
    return caseQueryable.case(predicate, then);
  },

  ifNull<T, R extends T>(source: T | QueryUnit<T>, ...targets: (R | QueryUnit<R>)[]): R extends undefined ? R : NonNullable<R> {
    let type;
    if (source instanceof QueryUnit) {
      type = source.type;
    }
    else if (targets.ofType(QueryUnit).length > 0) {
      type = targets.ofType(QueryUnit)[0].type;
    }
    else {
      throw new TypeError();
    }

    let cursorQuery = helpers.query(source);
    for (const target of targets) {
      cursorQuery = "ISNULL(" + cursorQuery + ", " + helpers.query(target) + ")";
    }

    return new QueryUnit(type, cursorQuery) as any;
  },

  count<T>(arg?: T | QueryUnit<T>): QueryUnit<Number | undefined> {
    if (arg) {
      return new QueryUnit(Number, "COUNT(DISTINCT(" + helpers.query(arg) + "))");
    }
    else {
      return new QueryUnit(Number, "COUNT(*)");
    }
  },

  max<T>(unit: T | QueryUnit<T>): QueryUnit<T | undefined> {
    if (!(unit instanceof QueryUnit)) {
      throw new TypeError();
    }

    return new QueryUnit(unit.type, "MAX(" + helpers.query(unit) + ")");
  },

  sum<T extends number>(unit: T | QueryUnit<T>): QueryUnit<T | undefined> {
    if (!(unit instanceof QueryUnit)) {
      throw new TypeError();
    }

    return new QueryUnit(unit.type, "SUM(" + helpers.query(unit) + ")");
  },

  and(arr: QueryUnit<Boolean | QueriedBoolean>[]): QueryUnit<QueriedBoolean> {
    return new QueryUnit(QueriedBoolean, arr.map(item => "(" + helpers.query(item) + ")").join(" AND "));
  },

  or(arr: QueryUnit<Boolean | QueriedBoolean>[]): QueryUnit<QueriedBoolean> {
    return new QueryUnit(QueriedBoolean, arr.map(item => "(" + helpers.query(item) + ")").join(" OR "));
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
  },

  map<C extends { [key: string]: any }, T>(arr: C[] | undefined, selector: (item: C, index: number) => T): TypeOfGenericForObject<T>[] | undefined {
    if (!arr) return undefined;
    return arr.map((item, index) => selector(item, index)) as any;
  }
};