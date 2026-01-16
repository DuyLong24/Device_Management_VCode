import { Schema, Document, Model } from 'mongoose';

export interface PaginateOptions {
  sortBy?: string;
  populate?: string | object;
  limit?: number;
  page?: number;
  select?: string;
}

export interface PaginateResult<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface PaginateModel<T extends Document> extends Model<T> {
  paginate(
    filter?: Record<string, any>,
    options?: PaginateOptions,
  ): Promise<PaginateResult<T>>;
}

/**
 * Pagination plugin for Mongoose schemas
 * @param schema - Mongoose schema
 */
const paginate = (schema: Schema): void => {
  /**
   * Query for documents with pagination
   * @param filter - Mongo filter
   * @param options - Query options
   * @returns Promise with paginated results
   */
  schema.statics.paginate = async function (
    filter: Record<string, any> = {},
    options: PaginateOptions = {},
  ): Promise<PaginateResult<any>> {
    let sort = '';
    if (options.sortBy) {
      const sortingCriteria: string[] = [];
      options.sortBy.split(',').forEach((sortOption) => {
        const sortOptionReplace = sortOption.replace('createdAt', '_id');
        const [key, order] = sortOptionReplace.split(':');
        sortingCriteria.push((order === 'desc' ? '-' : '') + key);
      });
      sort = sortingCriteria.join(' ');
    } else {
      sort = '-_id';
    }

    const select = options.select ? options.select : '';
    const limit = options.limit && parseInt(options.limit.toString(), 10) > 0 
      ? parseInt(options.limit.toString(), 10) 
      : 10;
    const page = options.page && parseInt(options.page.toString(), 10) > 0 
      ? parseInt(options.page.toString(), 10) 
      : 1;
    const skip = (page - 1) * limit;

    const countPromise = this.countDocuments(filter).exec();
    let docsPromise = this.find(filter).select(select).sort(sort).skip(skip).limit(limit);

    if (options.populate && typeof options.populate !== 'object') {
      options.populate.split(',').forEach((populateOption) => {
        const populateFields = populateOption.split('.').reverse();
        let populateObj: any = populateFields[0];
        
        for (let i = 1; i < populateFields.length; i++) {
          populateObj = { path: populateFields[i], populate: populateObj };
        }
        
        docsPromise = docsPromise.populate(populateObj);
      });
    } else if (options.populate && typeof options.populate === 'object') {
      docsPromise = docsPromise.populate(options.populate);
    }

    docsPromise = docsPromise.exec();

    return Promise.all([countPromise, docsPromise]).then((values) => {
      const [totalResults, results] = values;
      const totalPages = Math.ceil(totalResults / limit);
      const result: PaginateResult<any> = {
        results,
        page,
        limit,
        totalPages,
        totalResults,
      };
      return Promise.resolve(result);
    });
  };
};

export default paginate;
