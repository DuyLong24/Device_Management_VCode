/**
 * Create an object composed of the picked object properties
 * @param {Object} object
 * @param {string[]} keys
 * @returns {Object}
 */
export const pick = (object: any, keys: string[]) => {
  return keys.reduce((obj: any, key: string) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key) && object[key] !== undefined) {
      obj[key] = object[key];
    }
    return obj;
  }, {});
};

/**
 * Create an object composed of the picked object properties with regex search
 * @param {Object} object
 * @param {string[]} keys
 * @returns {Object}
 */
export const pickSearch = (object: any, keys: string[]) => {
  const conditions = keys.reduce((obj: any, key: string) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key) && object[key] !== undefined) {
      obj[key] = new RegExp(`.*${object[key]}.*`, 'i');
    }
    return obj;
  }, {});

  return conditions;
};

/**
 * Create filter and options for pagination
 * @param {Object} query
 * @param {string[]} filterKeys - Keys to pick for exact match filtering
 * @param {string[]} searchKeys - Keys to pick for regex search filtering
 * @param {string[]} optionKeys - Keys to pick for pagination options
 * @returns {Object}
 */
export const createFilterAndOptions = (
  query: any,
  filterKeys: string[] = [],
  searchKeys: string[] = [],
  optionKeys: string[] = ['sortBy', 'limit', 'page', 'populate']
) => {
  let filter = pick(query, filterKeys);
  const searchFilter = pickSearch(query, searchKeys);
  filter = { ...filter, ...searchFilter };

  const options = pick(query, optionKeys);

  return { filter, options };
};
