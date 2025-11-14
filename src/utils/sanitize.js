import { format } from "date-fns";

export default function mongooseGlobalPlugin(schema) {
  schema.set("toJSON", {
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      if (ret.password) delete ret.password;
      if (ret.createdAt) ret.createdAt = format(ret.createdAt, "dd-MM-yyyy hh:mm a");
      if (ret.updatedAt) ret.updatedAt = format(ret.updatedAt, "dd-MM-yyyy hh:mm a");
      return ret;
    }
  });
}

// EUvGUNMkBXLsfBo9