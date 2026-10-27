const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.json({ message: 'Lab 3 setup works!' });
});

app.get('/visit-count', (req, res) => {
    const visits = (parseInt(req.cookies.visits, 10) || 0) + 1;
    res.cookie('visits', visits, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
    res.json({ visits });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});