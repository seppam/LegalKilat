const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    namaPerusahaan: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    tanggalDaftar: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);
