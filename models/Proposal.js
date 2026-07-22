const mongoose = require('mongoose');

const ProposalSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    plafon: {
        type: Number,
        required: true
    },
    kbli: {
        type: String,
        required: true
    },
    statusKepatuhan: {
        type: String,
        default: 'Pending'
    },
    angsuranBulanan: {
        type: Number,
        default: 0
    },
    tanggalDibuat: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Proposal', ProposalSchema);
