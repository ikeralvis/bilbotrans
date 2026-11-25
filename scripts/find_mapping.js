
const fs = require('fs');

async function findMapping() {
    const inputFile = 'd:\\Iker\\Proyectos_GitHub\\bilbotrans\\arin-main\\arin-main\\paradas_api.json';
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));

    // We know 5518 is ZAMACOLA 168
    console.log('Searching for "ZAMACOLA 168"...');
    const zamacola = data.filter(s => s.DENOMINACION && s.DENOMINACION.includes('ZAMACOLA 168'));
    console.log('Matches for ZAMACOLA 168:', JSON.stringify(zamacola, null, 2));

    // Search for any stop where ETIQUETA_PARADA or CODIGOREDUCIDOPARADA contains 5518
    console.log('\nSearching for "5518" in codes...');
    const match5518 = data.filter(s =>
        s.PARADA === '5518' ||
        s.CODIGOREDUCIDOPARADA === '5518' ||
        s.ETIQUETA_PARADA === '5518' ||
        (s.ETIQUETA_PARADA && s.ETIQUETA_PARADA.includes('5518'))
    );
    console.log('Matches for 5518 in codes:', JSON.stringify(match5518, null, 2));
}

findMapping();
