import { Schema, model, type Types } from "mongoose";
import { ACTIVITY_STATUSES, type ActivityStatus } from "../domain/status";

export interface IStep {
  _id: Types.ObjectId;
  text: string;
  estimateMin: number;
  done: boolean;
  doneAt: Date | null;
}

export interface IActivity {
  owner: Types.ObjectId;
  title: string;
  course: string | null;
  brief: string | null;
  dueAt: Date | null;
  /** Igual que dueAt, pero «sin fecha» queda al final al ordenar (Mongo pone los null primero). */
  dueSort: Date;
  status: ActivityStatus;
  steps: Types.DocumentArray<IStep>;
  createdAt: Date;
  updatedAt: Date;
}

const NO_DUE_DATE = new Date("9999-12-31T00:00:00.000Z");

const idTransform = (_doc: unknown, ret: Record<string, unknown>) => {
  ret.id = String(ret._id);
  delete ret._id;
  delete ret.__v;
  return ret;
};

const stepSchema = new Schema<IStep>(
  {
    text: { type: String, required: true, trim: true, maxlength: 300 },
    estimateMin: { type: Number, default: 15, min: 1, max: 480 },
    done: { type: Boolean, default: false },
    doneAt: { type: Date, default: null },
  },
  { toJSON: { transform: idTransform } },
);

const activitySchema = new Schema<IActivity>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    course: { type: String, trim: true, maxlength: 100, default: null },
    brief: { type: String, trim: true, maxlength: 2000, default: null },
    dueAt: { type: Date, default: null },
    dueSort: { type: Date, default: NO_DUE_DATE },
    status: { type: String, enum: ACTIVITY_STATUSES, default: "pendiente" },
    steps: { type: [stepSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        idTransform(_doc, ret);
        ret.owner = String(ret.owner);
        delete ret.dueSort;
        return ret;
      },
    },
  },
);

activitySchema.pre("validate", function (next) {
  this.dueSort = this.dueAt ?? NO_DUE_DATE;
  next();
});

// Las consultas siempre filtran por dueño y ordenan por fecha o estado.
activitySchema.index({ owner: 1, dueSort: 1 });
activitySchema.index({ owner: 1, status: 1 });

export const Activity = model<IActivity>("Activity", activitySchema);
