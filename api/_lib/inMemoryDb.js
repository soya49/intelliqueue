/**
 * In-Memory Firestore-compatible Database
 * Provides the same API as Firestore for hackathon demo
 * Shared module for all Vercel serverless functions
 */

// In-memory store: { collectionName: { docId: { ...data } } }
const store = {};

function getCollection(name) {
  if (!store[name]) store[name] = {};
  return store[name];
}

class DocSnapshot {
  constructor(id, data) {
    this.id = id;
    this._data = data || null;
    this.exists = data !== null && data !== undefined;
  }
  data() {
    return this._data ? { ...this._data } : null;
  }
}

class QuerySnapshot {
  constructor(docs) {
    this.docs = docs;
    this.size = docs.length;
    this.empty = docs.length === 0;
  }
}

class DocRef {
  constructor(collectionName, docId) {
    this.collectionName = collectionName;
    this.id = docId;
    this.path = `${collectionName}/${docId}`;
  }

  async get() {
    const col = getCollection(this.collectionName);
    const data = col[this.id] || null;
    return new DocSnapshot(this.id, data);
  }

  async set(data, options = {}) {
    const col = getCollection(this.collectionName);
    if (options.merge && col[this.id]) {
      col[this.id] = { ...col[this.id], ...resolveFieldValues(data) };
    } else {
      col[this.id] = resolveFieldValues({ ...data });
    }
    return this;
  }

  async update(data) {
    const col = getCollection(this.collectionName);
    if (!col[this.id]) {
      throw new Error(`Document ${this.path} does not exist for update`);
    }
    col[this.id] = { ...col[this.id], ...resolveFieldValues(data) };
    return this;
  }

  async delete() {
    const col = getCollection(this.collectionName);
    delete col[this.id];
    return this;
  }
}

class Query {
  constructor(collectionName, filters = []) {
    this.collectionName = collectionName;
    this.filters = filters;
    this._limitCount = null;
    this._orderByField = null;
    this._orderByDir = 'asc';
  }

  where(field, op, value) {
    const q = new Query(this.collectionName, [
      ...this.filters,
      { field, op, value },
    ]);
    q._limitCount = this._limitCount;
    q._orderByField = this._orderByField;
    q._orderByDir = this._orderByDir;
    return q;
  }

  orderBy(field, dir = 'asc') {
    const q = new Query(this.collectionName, [...this.filters]);
    q._limitCount = this._limitCount;
    q._orderByField = field;
    q._orderByDir = dir;
    return q;
  }

  limit(count) {
    const q = new Query(this.collectionName, [...this.filters]);
    q._limitCount = count;
    q._orderByField = this._orderByField;
    q._orderByDir = this._orderByDir;
    return q;
  }

  async get() {
    const col = getCollection(this.collectionName);
    let results = Object.entries(col).map(([id, data]) => ({
      id,
      data: { ...data },
    }));

    for (const filter of this.filters) {
      results = results.filter((item) => {
        const val = getNestedValue(item.data, filter.field);
        switch (filter.op) {
          case '==': return val === filter.value;
          case '!=': return val !== filter.value;
          case '<': return val < filter.value;
          case '<=': return val <= filter.value;
          case '>': return val > filter.value;
          case '>=': return val >= filter.value;
          case 'in': return Array.isArray(filter.value) && filter.value.includes(val);
          default: return true;
        }
      });
    }

    if (this._orderByField) {
      const dir = this._orderByDir === 'desc' ? -1 : 1;
      results.sort((a, b) => {
        const aVal = getNestedValue(a.data, this._orderByField);
        const bVal = getNestedValue(b.data, this._orderByField);
        if (aVal < bVal) return -1 * dir;
        if (aVal > bVal) return 1 * dir;
        return 0;
      });
    }

    if (this._limitCount) {
      results = results.slice(0, this._limitCount);
    }

    const docs = results.map((r) => new DocSnapshot(r.id, r.data));
    return new QuerySnapshot(docs);
  }
}

class CollectionRef extends Query {
  constructor(name) {
    super(name);
  }

  doc(id) {
    const docId = id || generateId();
    return new DocRef(this.collectionName, docId);
  }
}

const db = {
  collection(name) {
    return new CollectionRef(name);
  },
};

const FieldValue = {
  serverTimestamp() {
    return { __type: 'serverTimestamp' };
  },
  increment(n) {
    return { __type: 'increment', value: n };
  },
  delete() {
    return { __type: 'delete' };
  },
};

const admin = {
  firestore: Object.assign(() => db, {
    FieldValue,
    Timestamp: {
      now() { return new Date(); },
      fromDate(date) { return date; },
    },
  }),
};

function resolveFieldValues(data) {
  const resolved = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && value.__type) {
      switch (value.__type) {
        case 'serverTimestamp': resolved[key] = new Date(); break;
        case 'increment': resolved[key] = value.value; break;
        case 'delete': break;
        default: resolved[key] = value;
      }
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

function getNestedValue(obj, field) {
  return field.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
}

function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export { db };
export default admin;
