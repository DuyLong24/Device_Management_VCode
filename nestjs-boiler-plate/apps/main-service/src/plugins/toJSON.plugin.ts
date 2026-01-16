import { Schema } from 'mongoose';

/**
 * Delete a property at a specific path in an object
 * @param obj - The object to modify
 * @param path - Array of property names representing the path
 * @param index - Current index in the path array
 */
const deleteAtPath = (obj: any, path: string[], index: number): void => {
  if (index === path.length - 1) {
    delete obj[path[index]];
    return;
  }
  if (obj[path[index]]) {
    deleteAtPath(obj[path[index]], path, index + 1);
  }
};

/**
 * A mongoose schema plugin which applies the following in the toJSON transform call:
 * - removes __v, createdAt, updatedAt, and any path that has private: true
 * - replaces _id with id
 * @param schema - Mongoose schema
 */
export const toJSONPlugin = (schema: Schema): void => {
  let transform: any;

  if (schema.options.toJSON && schema.options.toJSON.transform) {
    transform = schema.options.toJSON.transform;
  }

  schema.options.toJSON = Object.assign(schema.options.toJSON || {}, {
    transform(doc: any, ret: any, options: any) {
      // Remove private fields
      Object.keys(schema.paths).forEach((path) => {
        if (schema.paths[path].options && schema.paths[path].options.private) {
          deleteAtPath(ret, path.split('.'), 0);
        }
      });

      // Transform _id to id
      if (ret._id) {
        ret.id = ret._id.toString();
        delete ret._id;
      }

      // Remove mongoose internal fields
      delete ret.__v;
      // delete ret.createdAt;
      // delete ret.updatedAt;

      // Apply any existing transform
      if (transform) {
        return transform(doc, ret, options);
      }

      return ret;
    },
  });
};

export default toJSONPlugin;
