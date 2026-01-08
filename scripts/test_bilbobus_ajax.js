
const axios = require('axios');

async function testAjax() {
    const url = 'https://www.bilbao.eus/cs/Satellite?pagename=Bilbaonet%2FComunes%2FPresentacion%2FBBUS_pintarRecorrido_Ajax';
    const params = new URLSearchParams();
    params.append('codLinea', '56');
    params.append('temporada', '21');
    params.append('language', 'es');

    try {
        console.log('Testing AJAX endpoint...');
        const response = await axios.post(url, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('Status:', response.status);
        console.log('Response data:', JSON.stringify(response.data).substring(0, 1000) + '...');

        // Save to file for inspection
        const fs = require('fs');
        fs.writeFileSync('scripts/bilbobus_ajax_response.json', JSON.stringify(response.data, null, 2));
        console.log('Full response saved to scripts/bilbobus_ajax_response.json');

    } catch (error) {
        console.error('Error testing AJAX:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testAjax();
