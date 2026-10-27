Lab 3 - Cookie Visit Counter

GitLab Link: https://git.cs.dal.ca/mclaughli1/csci-3172/-/tree/main/labs/lab3
Render URL: https://csci3172-lab3.onrender.com/visit-count

Code:

const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.get('/visit-count', (req, res) => {
    const visits = (parseInt(req.cookies.visits, 10) || 0) + 1;
    res.cookie('visits', visits, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
    res.json({ visits });
});

How state was preserved:
The visit count is stored in a `visits` cookie that the browser
sends back with every request, so the server reads it, increments it, and
sets the updated value in the response even though HTTP itself is stateless.

I did not face any deployment hurdles, as I just built on my existing lab 3 code.
