import { Query } from 'mongoose';



const EXCLUDE_FIELDS = [
  'searchTerm',
  'sort',
  'fields',
  'page',
  'limit',
  'dateRange',
] as const;

type TQueryParam = Record<string, unknown>;

export class QueryBuilder<T> {
  public modelQuery: Query<T[], T>;
  public readonly query: TQueryParam;

  constructor(modelQuery: Query<T[], T>, query: TQueryParam) {
    this.modelQuery = modelQuery;
    this.query      = query;
  }

  search(searchableFields: string[]): this {
    const searchTerm = (this.query.searchTerm as string)?.trim();

    if (searchTerm) {
      this.modelQuery = this.modelQuery.find({
        $or: searchableFields.map(field => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      } as any);   // ✅ 'as any' — avoids FilterQuery import issue
    }

    return this;
  }

  filter(): this {
    const filterObj: TQueryParam = { ...this.query };
    EXCLUDE_FIELDS.forEach(field => delete filterObj[field]);

    // string booleans → actual booleans (?isBooked=false → false)
    Object.keys(filterObj).forEach(key => {
      if (filterObj[key] === 'true')  filterObj[key] = true;
      if (filterObj[key] === 'false') filterObj[key] = false;
    });

    // numeric strings → numbers (?rating=5 → 5)
    const NUMERIC_FIELDS = ['rating', 'intakeStep', 'durationMinutes', 'duration'];
    NUMERIC_FIELDS.forEach(key => {
      if (filterObj[key] !== undefined && !isNaN(Number(filterObj[key]))) {
        filterObj[key] = Number(filterObj[key]);
      }
    });

    this.modelQuery = this.modelQuery.find(filterObj as any);
    return this;
  }

  dateRange(): this {
    const range = this.query.dateRange as 'weekly' | 'monthly' | 'yearly' | undefined;
    if (!range) return this;

    const now       = new Date();
    const startDate = new Date(now);

    switch (range) {
      case 'weekly':  startDate.setDate(now.getDate() - 7);          break;
      case 'monthly': startDate.setMonth(now.getMonth() - 1);        break;
      case 'yearly':  startDate.setFullYear(now.getFullYear() - 1);  break;
      default:        return this;
    }

    this.modelQuery = this.modelQuery.find({
      createdAt: { $gte: startDate, $lte: now },
    } as any);

    return this;
  }

  sort(): this {
    const sortParam  = (this.query.sort as string) || '-createdAt';
    const sortString = sortParam.split(',').join(' ');
    this.modelQuery  = this.modelQuery.sort(sortString);
    return this;
  }

  paginate(): this {
    const page  = Math.max(Number(this.query.page)  || 1, 1);
    const limit = Math.min(Number(this.query.limit) || 10, 100);
    const skip  = (page - 1) * limit;
    this.modelQuery = this.modelQuery.skip(skip).limit(limit);
    return this;
  }

  fields(): this {
    const requested = (this.query.fields as string)?.split(',').join(' ');
    this.modelQuery  = this.modelQuery.select(requested || '-__v');
    return this;
  }

  async countTotal() {
    const filter = this.modelQuery.getFilter();
    const total  = await this.modelQuery.model.countDocuments(filter);

    const page  = Math.max(Number(this.query.page)  || 1, 1);
    const limit = Math.min(Number(this.query.limit) || 10, 100);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
