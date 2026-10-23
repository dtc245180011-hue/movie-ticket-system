require('dotenv').config();
const pool = require('./db');

async function main() {
    try {
        const [seats] = await pool.query(
            'SELECT id, seat_number, seat_type FROM seats ORDER BY id'
        );

        console.table(seats);
    } catch (error) {
        console.error('Loi:', error.message);
    } finally {
        await pool.end();
    }
}

main();
