const pool = require('./db');

async function testConnection() {
    try {
        const [rows] = await pool.query(
            'SELECT id, title, genre FROM movies'
        );

        console.log('Ket noi MySQL thanh cong!');
        console.table(rows);
    } catch (error) {
        console.error('Loi ket noi MySQL:', error.message);
    } finally {
        await pool.end();
    }
}

testConnection();
