require('dotenv').config();

const express = require('express');
const path = require('path');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Kiem tra trang thai ung dung
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Movie Ticket System is running'
    });
});

// Lay danh sach phim tu MySQL
app.get('/api/movies', async (req, res) => {
    try {
        const [movies] = await pool.query(
            `SELECT id, title, genre, duration_minutes, description, poster_url
             FROM movies
             ORDER BY id`
        );

        res.json(movies);
    } catch (error) {
        console.error('Loi truy van danh sach phim:', error.message);
        res.status(500).json({
            error: 'Khong the lay danh sach phim'
        });
    }
});

// Lay lich chieu theo phim
app.get('/api/showtimes/:movieId', async (req, res) => {
    try {
        const movieId = Number(req.params.movieId);

        if (!Number.isInteger(movieId) || movieId < 1) {
            return res.status(400).json({
                error: 'Ma phim khong hop le'
            });
        }

        const [showtimes] = await pool.query(
            `SELECT id, movie_id, show_date, show_time, ticket_price
             FROM showtimes
             WHERE movie_id = ?
             ORDER BY show_date, show_time`,
            [movieId]
        );

        res.json(showtimes);
    } catch (error) {
        console.error('Loi truy van lich chieu:', error.message);
        res.status(500).json({
            error: 'Khong the lay lich chieu'
        });
    }
});

// Lay danh sach ghe va trang thai dat theo suat chieu
app.get('/api/showtimes/:showtimeId/seats', async (req, res) => {
    try {
        const showtimeId = Number(req.params.showtimeId);

        if (!Number.isInteger(showtimeId) || showtimeId < 1) {
            return res.status(400).json({ error: 'Ma suat chieu khong hop le' });
        }

        const [showtimes] = await pool.query(
            'SELECT id FROM showtimes WHERE id = ?',
            [showtimeId]
        );

        if (showtimes.length === 0) {
            return res.status(404).json({ error: 'Khong tim thay suat chieu' });
        }

        const [seats] = await pool.query(
            `SELECT s.id, s.seat_number, s.seat_type,
                    CASE WHEN b.id IS NULL THEN 'available' ELSE 'booked' END AS status
             FROM seats s
             LEFT JOIN bookings b
               ON b.seat_id = s.id
              AND b.showtime_id = ?
              AND b.status IN ('pending', 'confirmed')
             ORDER BY LEFT(s.seat_number, 1), CAST(SUBSTRING(s.seat_number, 2) AS UNSIGNED)`,
            [showtimeId]
        );

        res.json(seats);
    } catch (error) {
        console.error('Loi truy van ghe:', error.message);
        res.status(500).json({ error: 'Khong the lay danh sach ghe' });
    }
});


// Tao dat ve va cap nhat trang thai ghe
app.post('/api/bookings', async (req, res) => {
    const crypto = require('crypto');
    const customerName = String(req.body.customer_name || '').trim();
    const customerEmail = String(req.body.customer_email || '').trim();
    const showtimeId = Number(req.body.showtime_id);
    const seatId = Number(req.body.seat_id);

    if (!customerName || customerName.length > 100) {
        return res.status(400).json({
            error: 'Vui long nhap ten khach hang (toi da 100 ky tu)'
        });
    }

    if (customerEmail.length > 150 ||
        (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))) {
        return res.status(400).json({
            error: 'Email khong hop le'
        });
    }

    if (!Number.isInteger(showtimeId) || showtimeId < 1 ||
        !Number.isInteger(seatId) || seatId < 1) {
        return res.status(400).json({
            error: 'Ma suat chieu hoac ma ghe khong hop le'
        });
    }

    let connection;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Khoa dong ghe de tranh hai yeu cau dat cung ghe dong thoi
        const [seats] = await connection.query(
            'SELECT id, seat_number, seat_type FROM seats WHERE id = ? FOR UPDATE',
            [seatId]
        );

        if (seats.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Khong tim thay ghe' });
        }

        const [showtimes] = await connection.query(
            'SELECT id, ticket_price FROM showtimes WHERE id = ?',
            [showtimeId]
        );

        if (showtimes.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Khong tim thay suat chieu' });
        }

        const [existing] = await connection.query(
            `SELECT id FROM bookings
             WHERE showtime_id = ? AND seat_id = ?
               AND status <> 'cancelled'
             LIMIT 1`,
            [showtimeId, seatId]
        );

        if (existing.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                error: 'Ghe nay da duoc dat. Vui long chon ghe khac.'
            });
        }

        const bookingCode = 'MT' + crypto.randomBytes(6).toString('hex').toUpperCase();

        await connection.query(
            `INSERT INTO bookings
             (customer_name, customer_email, showtime_id, seat_id, booking_code, status)
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [
                customerName,
                customerEmail || null,
                showtimeId,
                seatId,
                bookingCode
            ]
        );

        await connection.commit();

        res.status(201).json({
            message: 'Dat ve thanh cong. Vui long thanh toan gia lap.',

            booking_code: bookingCode,
            customer_name: customerName,
            customer_email: customerEmail || null,
            showtime_id: showtimeId,
            seat_id: seatId,
            seat_number: seats[0].seat_number,
            seat_type: seats[0].seat_type,
            ticket_price: showtimes[0].ticket_price,
            status: 'pending'
        });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (_) {}
        }
        console.error('Loi dat ve:', error.message);
        res.status(500).json({ error: 'Khong the dat ve luc nay' });
    } finally {
        if (connection) connection.release();
    }
});


// Thanh toan gia lap bang ma dat ve
app.post('/api/bookings/:bookingCode/pay', async (req, res) => {
    const bookingCode = String(req.params.bookingCode || '').trim();

    if (!/^MT[A-F0-9]{12}$/.test(bookingCode)) {
        return res.status(400).json({ error: 'Ma dat ve khong hop le' });
    }

    try {
        const [rows] = await pool.query(
            `SELECT id, booking_code, status
             FROM bookings
             WHERE booking_code = ?
             LIMIT 1`,
            [bookingCode]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Khong tim thay dat ve' });
        }

        if (rows[0].status === 'confirmed') {
            return res.status(409).json({ error: 'Ve nay da duoc thanh toan' });
        }

        if (rows[0].status !== 'pending') {
            return res.status(409).json({
                error: 'Dat ve khong o trang thai cho thanh toan'
            });
        }

        const [update] = await pool.query(
            `UPDATE bookings
             SET status = 'confirmed'
             WHERE id = ? AND status = 'pending'`,
            [rows[0].id]
        );

        if (update.affectedRows !== 1) {
            return res.status(409).json({
                error: 'Trang thai dat ve da thay doi. Vui long tai lai.'
            });
        }

        res.json({
            message: 'Thanh toan gia lap thanh cong',
            booking_code: bookingCode,
            status: 'confirmed'
        });
    } catch (error) {
        console.error('Loi thanh toan gia lap:', error.message);
        res.status(500).json({ error: 'Khong the xu ly thanh toan luc nay' });
    }
});

app.listen(PORT, '127.0.0.1', () => {
    console.log('Movie Ticket System dang chay tai cong ' + PORT);
});
