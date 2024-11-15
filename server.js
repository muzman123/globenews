const express = require('express');
const path = require('path');
const axios = require('axios');
const xml2js = require('xml2js');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;


// Middleware
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Added to handle JSON payloads

// Send index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// News endpoint
app.get('/news', async (req, res) => {
    const country = req.query.country;
    if (!country) {
        return res.status(400).json({ error: 'Country parameter is required' });
    }

    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const publishedAfter = twoWeeksAgo.toISOString().split('.')[0]; // Format: YYYY-MM-DDTHH:mm:ss

    try {
        const response = await axios.get('https://api.thenewsapi.com/v1/news/top', {
            params: {
                api_token: 'FCii0ZOVyNjywKGTJPc8TUsAMf0QznKCxNZWTZTR',
                search: country,
                language: 'en',
                limit: 3,
                categories: 'politics',
                sort: 'relevance_score',
                published_after: publishedAfter
            }
        });

        // Transform the response to match your frontend expectations
        const newsItems = response.data.data.map(item => ({
            title: item.title || 'No title',
            link: item.url || '#',
            snippet: item.description || 'No description available',
            source: item.source || 'Unknown source',
            pubDate: item.published_at || 'No date available'
        }));

        res.json(newsItems);

    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({
            error: 'Error fetching news',
            message: error.response?.data?.message || error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something broke!',
        message: err.message
    });
});

// Email endpoint
app.post('/send-email', async (req, res) => {
    const { name, email, message } = req.body;

    // Input validation
    if (!name || !email || !message) {
        return res.status(400).json({ 
            success: false, 
            message: 'Name, email, and message are required' 
        });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid email format' 
        });
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER || 'your-email@gmail.com', // Better to use environment variables
            pass: process.env.EMAIL_PASS || 'your-email-password'
        }
    });

    const mailOptions = {
        from: `"${name}" <${email}>`,
        to: 'muzammilmuhammad12@gmail.com',
        subject: `Website Contact: Message from ${name}`,
        text: message,
        html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>From:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ 
            success: true, 
            message: 'Email sent successfully!' 
        });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send email',
            error: error.message 
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something broke!',
        message: err.message 
    });
});

// Handle 404s
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});