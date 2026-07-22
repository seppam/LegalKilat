const userAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(401).json({ success: false, message: 'Silakan masuk terlebih dahulu.' });
        }
        res.redirect('/login.html');
    }
};

const adminAuth = (req, res, next) => {
    if (req.session && req.session.userId && req.session.role === 'admin') {
        next();
    } else {
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(403).json({ success: false, message: 'Akses khusus administrator ditolak.' });
        }
        res.redirect('/login.html');
    }
};

module.exports = {
    userAuth,
    adminAuth
};
