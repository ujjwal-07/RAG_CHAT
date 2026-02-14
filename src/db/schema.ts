import mongoose, { Schema, model, models } from 'mongoose';

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // Hashed password (optional for OAuth/OTP)
  phoneNumber: { type: String, unique: true, sparse: true },
  otp: { type: String }, // Temporary OTP
  otpExpires: { type: Date },
  provider: { type: String, default: 'credentials' }, // 'credentials', 'google', 'phone'
  theme: { type: String, default: 'indigo' }, // 'indigo', 'emerald', 'rose', 'amber', 'cyan'
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

const FileSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  url: { type: String, default: '' },
  size: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ChunkSchema = new Schema({
  fileId: { type: Schema.Types.ObjectId, ref: 'File', required: true },
  content: { type: String, required: true },
  embedding: { type: [Number], required: true }, // Vector embedding
});

// Create index for simple retrieval, but for vector search we'll do manual cosine similarity in-memory for small datasets or use $vectorSearch if Atlas
ChunkSchema.index({ fileId: 1 });

const MessageSchema = new Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ChatSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fileId: { type: Schema.Types.ObjectId, ref: 'File' }, // Optional context
  title: { type: String, required: true },
  messages: [MessageSchema], // Embed messages directly in Chat document for efficiency
  createdAt: { type: Date, default: Date.now },
});

export const User = models.User || model('User', UserSchema);
export const File = models.File || model('File', FileSchema);
export const Chunk = models.Chunk || model('Chunk', ChunkSchema);
export const Chat = models.Chat || model('Chat', ChatSchema);
