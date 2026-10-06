import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String,
    email: { type: String, trim: true, lowercase: true },
    role: { type: String, default: 'user' },
    hostel: {
        type: String,
        trim: true,
        required: function requiredHostelForWarden() {
            return this.role === 'warden';
        }
    },
    profile: {
        houseNumber: String
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    resetPasswordOTP: String,
    resetPasswordOTPExpires: Date,
    twoFactorChallengeHash: { type: String, select: false },
    twoFactorCodeHash: { type: String, select: false },
    twoFactorExpiresAt: { type: Date, select: false },
    twoFactorAttempts: { type: Number, default: 0, select: false },
    createdAt: { type: Date, default: Date.now },
});

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

export default UserModel;
