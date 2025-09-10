export const getUserData = async (req, res) => {
    try {
        const user = req.user;
        res.status(200).json({
            success: true,
            userData: {
                id: user._id,
                name: user.name,
                email: user.email,
                photo: user.photo,
                authProvider: user.authProvider,
                isAccountVerified: user.isAccountVerified,
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}